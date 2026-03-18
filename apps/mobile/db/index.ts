import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

const FS = FileSystem as any;
const CONFIG_FILE = `${FS.documentDirectory || FS.cacheDirectory}db_config.json`;
const DEFAULT_DB_NAME = 'readlater.db';

let db: SQLite.SQLiteDatabase | null = null;

export const getDbName = async () => {
  try {
    const info = await FileSystem.getInfoAsync(CONFIG_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(CONFIG_FILE);
      const config = JSON.parse(content);
      return config.dbName || DEFAULT_DB_NAME;
    }
  } catch (e) {
    console.error('Error reading db config:', e);
  }
  return DEFAULT_DB_NAME;
};

export const getDbPath = async () => {
  const name = await getDbName();
  // expo-sqlite stores databases in a 'SQLite' subdirectory of the document directory
  return `${FS.documentDirectory}SQLite/${name}`;
};

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  const name = await getDbName();
  
  try {
    const database = await SQLite.openDatabaseAsync(name);
    // This is the first action on the DB, perfect place to catch corruption
    await database.execAsync('PRAGMA foreign_keys = ON;');
    db = database;
    return database;
  } catch (e: any) {
    console.warn(`[getDb] CRITICAL: Failed to initialize database "${name}". Error: ${e.message}`);
    console.warn(`[getDb] CRITICAL: Failed to initialize database "${name}". Error: ${e.message}`);
    
    if (db) {
      try { await db.closeAsync(); } catch {}
      db = null;
    }

    // Recovery path
    if (name !== DEFAULT_DB_NAME) {
      console.warn(`[getDb] Resetting to default database due to error in "${name}".`);
      try {
        await FileSystem.deleteAsync(CONFIG_FILE, { idempotent: true });
        const path = await getDbPath(); 
        await FileSystem.deleteAsync(path, { idempotent: true });
      } catch (err) {
        console.error('[getDb] Error during corruption cleanup:', err);
      }
      
      // Try opening default
      try {
        const defaultDb = await SQLite.openDatabaseAsync(DEFAULT_DB_NAME);
        await defaultDb.execAsync('PRAGMA foreign_keys = ON;');
        db = defaultDb;
        return defaultDb;
      } catch (e2: any) {
        console.error('[getDb] Even default database failed. This might require a fresh reinstall or manual wipe.', e2);
        throw e2;
      }
    } else {
      // DEFAULT_DB_NAME itself is failing. 
      // Last resort: delete the default DB file and try to recreate it.
      console.warn('[getDb] Default database is failing/corrupted. Attempting emergency wipe.');
      try {
        const path = `${FS.documentDirectory}SQLite/${DEFAULT_DB_NAME}`;
        await FileSystem.deleteAsync(path, { idempotent: true });
        const newDb = await SQLite.openDatabaseAsync(DEFAULT_DB_NAME);
        await newDb.execAsync('PRAGMA foreign_keys = ON;');
        db = newDb;
        return newDb;
      } catch (e3) {
        console.error('[getDb] Emergency wipe failed.', e3);
        throw e; // Throw original error if wipe fails
      }
    }
  }
};

export const relocateDb = async (newName: string) => {
  const currentName = await getDbName();
  if (currentName === newName) return;

  const currentPath = await getDbPath();
  const newPath = `${FS.documentDirectory}SQLite/${newName}`;

  // Ensure target directory exists
  const dir = `${FS.documentDirectory}SQLite/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  // Close current DB
  if (db) {
    await db.closeAsync();
    db = null;
  }

  // Move file
  const fileInfo = await FileSystem.getInfoAsync(currentPath);
  if (fileInfo.exists) {
    await FileSystem.moveAsync({
      from: currentPath,
      to: newPath
    });
  }

  // Update setting
  try {
    await FileSystem.writeAsStringAsync(CONFIG_FILE, JSON.stringify({ dbName: newName }));
  } catch (e) {
    console.error('Error writing db config:', e);
  }
  
  // Re-initialize
  await initDb();
};

export const usePickedDb = async (externalUri: string, filename: string) => {
  // Ensure target directory exists
  const dir = `${FS.documentDirectory}SQLite/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  // Ensure filename is safe and has .db
  const baseName = filename.split(/[\\/]/).pop() || 'imported.db';
  const finalName = baseName.endsWith('.db') ? baseName : `${baseName}.db`;
  const tempName = `temp_validate_${Date.now()}.db`;
  const tempPath = `${FS.documentDirectory}SQLite/${tempName}`;

  // 1. Copy to temp location for validation
  await FileSystem.copyAsync({
    from: externalUri,
    to: tempPath
  });

  // 2. Validate
  let isValid = false;
  let testDb: SQLite.SQLiteDatabase | null = null;
  try {
    testDb = await SQLite.openDatabaseAsync(tempName);
    // Simple integrity check
    await testDb.execAsync('SELECT 1;');
    isValid = true;
  } catch (e) {
    console.error('Validation failed for picked database:', e);
  } finally {
    if (testDb) {
      await testDb.closeAsync();
    }
  }

  if (!isValid) {
    await FileSystem.deleteAsync(tempPath, { idempotent: true });
    throw new Error('Selected file is not a valid SQLite database.');
  }

  // 3. Close current DB
  if (db) {
    await db.closeAsync();
    db = null;
  }

  // 4. Move to final location
  const finalPath = `${FS.documentDirectory}SQLite/${finalName}`;
  await FileSystem.moveAsync({
    from: tempPath,
    to: finalPath
  });

  // 5. Update setting
  try {
    await FileSystem.writeAsStringAsync(CONFIG_FILE, JSON.stringify({ dbName: finalName }));
  } catch (e) {
    console.error('Error writing db config:', e);
  }
  
  // Re-initialize
  await initDb();
};

export const resetToDefaultDb = async () => {
  // Close current DB
  if (db) {
    try { await db.closeAsync(); } catch {}
    db = null;
  }

  // Remove config file
  try {
    await FileSystem.deleteAsync(CONFIG_FILE, { idempotent: true });
  } catch (e) {
    console.error('Error deleting db config:', e);
  }

  // The caller is responsible for re-initializing if needed (e.g. in Settings)
};

export const initDb = async (): Promise<void> => {
  try {
    const database = await getDb();
    if (!database) return;
    
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        image_url TEXT,
        domain TEXT,
        notes TEXT,
        last_clicked_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS link_tags (
        link_id TEXT,
        tag_id TEXT,
        PRIMARY KEY (link_id, tag_id),
        FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        UNIQUE(type, name)
      );

      CREATE TABLE IF NOT EXISTS link_entities (
        link_id TEXT,
        entity_id TEXT,
        PRIMARY KEY (link_id, entity_id),
        FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );
    `);
    
    await runMigrations(database);
  } catch (e: any) {
    console.warn(`[DEBUG-DB] initDb CRITICAL FAILURE: ${e.message}`);
    const name = await getDbName();
    
    if (name !== DEFAULT_DB_NAME) {
      console.warn(`[getDb] Recovery: Falling back to default "${DEFAULT_DB_NAME}"`);
      await resetToDefaultDb();
      // Wait a tiny bit and retry one time
      await new Promise(resolve => setTimeout(resolve, 100));
      return await initDb();
    } else {
      // Default DB itself is corrupt
      console.error('[getDb] Emergency: Default database is corrupt. Wiping file.');
      try {
        const path = `${FS.documentDirectory}SQLite/${DEFAULT_DB_NAME}`;
        await FileSystem.deleteAsync(path, { idempotent: true });
        // Retry once more with fresh file
        return await initDb();
      } catch (e2: any) {
        console.error('[getDb] Total system failure. Cannot recover default DB.', e2);
        throw e;
      }
    }
  }
};

const runMigrations = async (db: SQLite.SQLiteDatabase) => {
  console.log('Running database migrations...');
  
  await db.withTransactionAsync(async () => {
    // 1. Move tags to entities (if tags table exists and entities is empty)
    const entityCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM entities');
    if (entityCount && entityCount.count === 0) {
      await db.execAsync(`
        INSERT INTO entities (id, type, name)
        SELECT id, 'tag', name FROM tags;

        INSERT INTO link_entities (link_id, entity_id)
        SELECT link_id, tag_id FROM link_tags;
      `);

      // 2. Move domains to entities
      const links = await db.getAllAsync<{ id: string; domain: string }>('SELECT id, domain FROM links WHERE domain IS NOT NULL');
      for (const link of links) {
        let entity = await db.getFirstAsync<{ id: string }>('SELECT id FROM entities WHERE type = "domain" AND name = ?', [link.domain]);
        let entityId = entity?.id;
        
        if (!entity) {
          entityId = Math.random().toString(36).substring(2, 15);
          await db.runAsync('INSERT INTO entities (id, type, name) VALUES (?, "domain", ?)', [entityId, link.domain]);
        }
        
        await db.runAsync('INSERT OR IGNORE INTO link_entities (link_id, entity_id) VALUES (?, ?)', [link.id, entityId!]);
      }
    }

    // 3. Migrate 'notes' tags to 'notes' system entities
    // This is safe to run multiple times because it checks for e.name = "notes" AND e.type = "tag"
    const notesTag = await db.getFirstAsync<{ id: string }>('SELECT id FROM entities WHERE type = "tag" AND name = "notes"');
    if (notesTag) {
      let systemNotes = await db.getFirstAsync<{ id: string }>('SELECT id FROM entities WHERE type = "system" AND name = "notes"');
      let systemNotesId = systemNotes?.id;
      
      if (!systemNotes) {
        systemNotesId = Math.random().toString(36).substring(2, 15);
        await db.runAsync('INSERT INTO entities (id, type, name) VALUES (?, "system", "notes")', [systemNotesId]);
      }
      
      await db.runAsync('UPDATE link_entities SET entity_id = ? WHERE entity_id = ?', [systemNotesId!, notesTag.id]);
      await db.runAsync('DELETE FROM entities WHERE id = ?', [notesTag.id]);
    }

    });
  console.log('Migrations completed successfully.');
};
