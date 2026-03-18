import { getDb } from './index';

export interface Link {
  id: string;
  url: string;
  title: string | null;
  image_url: string | null;
  domain: string | null;
  notes: string | null;
  last_clicked_at: number | null;
  created_at: number;
  show_notes?: number;
}

export interface Tag {
  id: string;
  name: string;
}

export const getLinkByUrl = async (url: string): Promise<Link | null> => {
  const db = await getDb();
  return await db.getFirstAsync<Link>('SELECT * FROM links WHERE url = ?', [url]);
};

export const getLinkById = async (id: string): Promise<Link | null> => {
  const db = await getDb();
  return await db.getFirstAsync<Link>('SELECT * FROM links WHERE id = ?', [id]);
};

export const insertLink = async (link: Link) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO links (id, url, title, image_url, domain, notes, last_clicked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [link.id, link.url, link.title, link.image_url, link.domain, link.notes, link.last_clicked_at, link.created_at]
  );
  
  if (link.domain) {
    await addEntityToLink(link.id, 'domain', link.domain);
  }

  if (link.notes?.trim()) {
    await addEntityToLink(link.id, 'system', 'notes');
  }
};

export const updateLink = async (link: Link) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE links SET url = ?, title = ?, image_url = ?, domain = ?, notes = ?, last_clicked_at = ? WHERE id = ?',
    [link.url, link.title, link.image_url, link.domain, link.notes, link.last_clicked_at, link.id]
  );

  if (link.domain) {
    await addEntityToLink(link.id, 'domain', link.domain);
  }

  if (link.notes?.trim()) {
    await addEntityToLink(link.id, 'system', 'notes');
  } else {
    await removeEntityFromLink(link.id, 'system', 'notes');
  }
};

export const updateLinkNotes = async (id: string, notes: string | null) => {
  const db = await getDb();
  const trimmedNotes = notes?.trim() || '';
  await db.runAsync('UPDATE links SET notes = ? WHERE id = ?', [trimmedNotes || null, id]);
  
  if (trimmedNotes) {
    await addEntityToLink(id, 'system', 'notes');
  } else {
    await removeEntityFromLink(id, 'system', 'notes');
  }
};

export const updateLinkLastClicked = async (id: string) => {
  const db = await getDb();
  await db.runAsync('UPDATE links SET last_clicked_at = ? WHERE id = ?', [Date.now(), id]);
};

export const getAllLinks = async (searchQuery?: string, sortBy: 'created_at' | 'last_clicked_at' | 'title' = 'created_at'): Promise<Link[]> => {
  const db = await getDb();
  const orderByMap = {
    'created_at': 'created_at DESC',
    'last_clicked_at': 'COALESCE(last_clicked_at, 0) DESC, created_at DESC',
    'title': 'title COLLATE NOCASE ASC'
  };
  const orderBy = orderByMap[sortBy] || orderByMap['created_at'];

  if (searchQuery) {
    // Check for type:name pattern (e.g., system:notes, tag:tech, domain:google.com)
    const colonIndex = searchQuery.indexOf(':');
    if (colonIndex > 0 && colonIndex < searchQuery.length - 1) {
      const type = searchQuery.substring(0, colonIndex).trim();
      const name = searchQuery.substring(colonIndex + 1).trim();
      
      if (type && name) {
        return await db.getAllAsync<Link>(
          `SELECT l.* FROM links l
           JOIN link_entities le ON l.id = le.link_id
           JOIN entities e ON le.entity_id = e.id
           WHERE e.type = ? AND e.name LIKE ?
           ORDER BY ${orderBy}`,
          [type, `%${name}%`]
        );
      }
    }

    if (searchQuery.startsWith('note:')) {
      const q = searchQuery.substring(5).trim();
      return await db.getAllAsync<Link>(
        `SELECT * FROM links WHERE notes LIKE ? ORDER BY ${orderBy}`,
        [`%${q}%`]
      );
    }
    return await db.getAllAsync<Link>(
      `SELECT * FROM links WHERE title LIKE ? OR url LIKE ? OR notes LIKE ? ORDER BY ${orderBy}`,
      [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
    );
  }
  return await db.getAllAsync<Link>(`SELECT * FROM links ORDER BY ${orderBy}`);
};

const buildOrderBy = (sortBy: string, prefix = '') => {
  const p = prefix ? `${prefix}.` : '';
  const map: Record<string, string> = {
    'created_at': `${p}created_at DESC`,
    'last_clicked_at': `COALESCE(${p}last_clicked_at, 0) DESC, ${p}created_at DESC`,
    'title': `${p}title COLLATE NOCASE ASC`
  };
  return map[sortBy] || map['created_at'];
};

const getEntitiesOrderBy = (sortBy: string) => {
  const map: Record<string, string> = {
    'count': 'count DESC',
    'name': 'e.name COLLATE NOCASE ASC',
    'domain': 'e.name COLLATE NOCASE ASC',
    'created_at': 'MAX(l.created_at) DESC',
    'last_clicked_at': 'MAX(COALESCE(l.last_clicked_at, 0)) DESC'
  };
  return map[sortBy] || map['count'];
};

export const getLinksByEntity = async (type: string, name: string, sortBy: 'created_at' | 'last_clicked_at' | 'title' = 'created_at'): Promise<Link[]> => {
  const db = await getDb();
  const orderBy = buildOrderBy(sortBy, 'l');
  return await db.getAllAsync<Link>(
    `SELECT l.* FROM links l
     JOIN link_entities le ON l.id = le.link_id
     JOIN entities e ON le.entity_id = e.id
     WHERE e.type = ? AND e.name = ?
     ORDER BY ${orderBy}`,
    [type, name]
  );
};

export const getLinksByTag = async (tagName: string, sortBy: 'created_at' | 'last_clicked_at' | 'title' = 'created_at'): Promise<Link[]> => {
  return getLinksByEntity('tag', tagName, sortBy);
};

export const getLinksByDomain = async (domain: string, sortBy: 'created_at' | 'last_clicked_at' | 'title' = 'created_at'): Promise<Link[]> => {
  return getLinksByEntity('domain', domain, sortBy);
};

export const deleteLink = async (id: string) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM links WHERE id = ?', [id]);
};

export const getTagsWithCount = async (sortBy: 'count' | 'name' | 'created_at' | 'last_clicked_at' = 'count') => {
  const db = await getDb();
  const orderBy = getEntitiesOrderBy(sortBy);

  return await db.getAllAsync<{ name: string; count: number }>(
    `SELECT e.name, COUNT(le.link_id) as count
     FROM entities e
     LEFT JOIN link_entities le ON e.id = le.entity_id
     LEFT JOIN links l ON le.link_id = l.id
     WHERE e.type = 'tag' AND e.name != 'notes'
     GROUP BY e.id
     ORDER BY ${orderBy}`
  );
};

export const getDomainsWithCount = async (sortBy: 'count' | 'domain' | 'created_at' | 'last_clicked_at' = 'count') => {
  const db = await getDb();
  const orderBy = getEntitiesOrderBy(sortBy);

  return await db.getAllAsync<{ domain: string; count: number }>(
    `SELECT e.name as domain, COUNT(le.link_id) as count
     FROM entities e
     LEFT JOIN link_entities le ON e.id = le.entity_id
     LEFT JOIN links l ON le.link_id = l.id
     WHERE e.type = 'domain'
     GROUP BY e.id
     ORDER BY ${orderBy}`
  );
};

export const addEntityToLink = async (linkId: string, type: string, name: string) => {
  const db = await getDb();
  // Ensure entity exists
  let entity = await db.getFirstAsync<{ id: string }>('SELECT id FROM entities WHERE type = ? AND name = ?', [type, name]);
  let entityId = entity?.id;
  
  if (!entity) {
    entityId = Math.random().toString(36).substring(2, 15);
    await db.runAsync('INSERT INTO entities (id, type, name) VALUES (?, ?, ?)', [entityId, type, name]);
  }

  // Insert mapping
  await db.runAsync('INSERT OR IGNORE INTO link_entities (link_id, entity_id) VALUES (?, ?)', [linkId, entityId!]);
};

export const getTagsForLink = async (linkId: string): Promise<string[]> => {
  const db = await getDb();
  const res = await db.getAllAsync<{ name: string }>(
    `SELECT e.name FROM entities e
     JOIN link_entities le ON e.id = le.entity_id
     WHERE e.type = 'tag' AND le.link_id = ?`,
    [linkId]
  );
  return res.map(r => r.name);
};

export const getSystemEntitiesForLink = async (linkId: string): Promise<string[]> => {
  const db = await getDb();
  const res = await db.getAllAsync<{ name: string }>(
    `SELECT e.name FROM entities e
     JOIN link_entities le ON e.id = le.entity_id
     WHERE e.type = 'system' AND le.link_id = ?`,
    [linkId]
  );
  return res.map(r => r.name);
};

export const removeEntityFromLink = async (linkId: string, type: string, name: string) => {
  const db = await getDb();
  const entity = await db.getFirstAsync<{ id: string }>('SELECT id FROM entities WHERE type = ? AND name = ?', [type, name]);
  if (entity) {
    await db.runAsync('DELETE FROM link_entities WHERE link_id = ? AND entity_id = ?', [linkId, entity.id]);
  }
};

export const getAllTagNames = async (): Promise<string[]> => {
  const db = await getDb();
  const res = await db.getAllAsync<{ name: string }>('SELECT name FROM entities WHERE type = "tag" ORDER BY name');
  return res.map(r => r.name);
};

export const getAllLinksWithTags = async (): Promise<(Link & { tags: string[] })[]> => {
  const db = await getDb();
  const links = await db.getAllAsync<Link>('SELECT * FROM links ORDER BY created_at DESC');
  const results = [];
  for (const link of links) {
    const tags = await getTagsForLink(link.id);
    results.push({ ...link, tags });
  }
  return results;
};

export const clearAllData = async () => {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM link_entities;
    DELETE FROM entities;
    DELETE FROM links;
  `);
};

export const importData = async (data: any[]) => {
  const db = await getDb();
  
  // Use a transaction for performance and consistency
  await db.withTransactionAsync(async () => {
    for (const item of data) {
      // Detect format: Chrome extension uses 'key' for URL, Mobile uses 'url'
      const isChromeExt = !!item.key && !item.url;
      const url = isChromeExt ? item.key : item.url;
      const title = item.title || url;
      const timestamp = item.timestamp || item.created_at || Date.now();
      
      if (!url) continue;

      const linkId = item.id || Math.random().toString(36).substring(2, 9);
      
      // 1. Insert link (ignore if exists)
      await db.runAsync(
        'INSERT OR IGNORE INTO links (id, url, title, image_url, domain, notes, last_clicked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [linkId, url, title, item.image_url || null, item.domain || null, item.notes || null, item.last_clicked_at || null, timestamp]
      );

      // 2. Process tags
      if (item.tags && Array.isArray(item.tags)) {
        for (const tagName of item.tags) {
          if (!tagName) continue;
          await addEntityToLink(linkId, 'tag', tagName);
        }
      }
      
      // Add chrome-ext tag if it's from the extension
      if (isChromeExt) {
        await addEntityToLink(linkId, 'tag', 'chrome-ext');
      }
      
      // Add system notes entity if notes exist
      if (item.notes?.trim()) {
        await addEntityToLink(linkId, 'system', 'notes');
      }
      
      // 3. Process domain
      let domain = item.domain;
      if (!domain && url) {
        try {
          const urlObj = new URL(url);
          domain = urlObj.hostname.replace(/^www\./, '');
        } catch (e) {}
      }
      
      if (domain) {
        await addEntityToLink(linkId, 'domain', domain);
      }
    }
  });
};

export const createCollection = async (title: string, description: string, tags: string[] = []): Promise<string> => {
  const db = await getDb();
  const id = `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const url = `readlater://collection/${id}`;
  const now = Date.now();
  
  await db.runAsync(
    'INSERT INTO links (id, url, title, notes, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, url, title, description || null, now]
  );
  
  await addEntityToLink(id, 'system', 'collection');
  
  for (const tag of tags) {
    if (tag) await addEntityToLink(id, 'tag', tag);
  }
  
  return id;
};

export const updateCollection = async (id: string, title: string, description: string) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE links SET title = ?, notes = ? WHERE id = ?',
    [title, description || null, id]
  );
};

export const addLinksToCollection = async (collectionId: string, linkIds: string[]) => {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const result = await db.getFirstAsync<{ max_order: number }>(
      'SELECT MAX(order_index) as max_order FROM collection_links WHERE collection_id = ?',
      [collectionId]
    );
    let orderIndex = (result?.max_order ?? 0) + 1;
    
    for (const linkId of linkIds) {
      await db.runAsync(
        'INSERT OR IGNORE INTO collection_links (collection_id, link_id, order_index, show_notes) VALUES (?, ?, ?, 0)',
        [collectionId, linkId, orderIndex++]
      );
    }
  });
};

export const removeLinksFromCollection = async (collectionId: string, linkIds: string[]) => {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const linkId of linkIds) {
      await db.runAsync('DELETE FROM collection_links WHERE collection_id = ? AND link_id = ?', [collectionId, linkId]);
    }
  });
};

export const updateCollectionLinkOrder = async (collectionId: string, linkIdsInOrder: string[]) => {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < linkIdsInOrder.length; i++) {
      await db.runAsync(
        'UPDATE collection_links SET order_index = ? WHERE collection_id = ? AND link_id = ?',
        [i, collectionId, linkIdsInOrder[i]]
      );
    }
  });
};

export const updateCollectionLinkShowNotes = async (collectionId: string, linkId: string, showNotes: boolean) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE collection_links SET show_notes = ? WHERE collection_id = ? AND link_id = ?',
    [showNotes ? 1 : 0, collectionId, linkId]
  );
};

export const getCollectionLinks = async (collectionId: string): Promise<Link[]> => {
  const db = await getDb();
  return await db.getAllAsync<Link>(
    `SELECT l.*, cl.show_notes FROM links l
     JOIN collection_links cl ON l.id = cl.link_id
     WHERE cl.collection_id = ?
     ORDER BY cl.order_index ASC, l.created_at DESC`,
    [collectionId]
  );
};

export const getCollections = async (): Promise<Link[]> => {
  const db = await getDb();
  return await db.getAllAsync<Link>(
    `SELECT l.* FROM links l
     JOIN link_entities le ON l.id = le.link_id
     JOIN entities e ON le.entity_id = e.id
     WHERE e.type = 'system' AND e.name = 'collection'
     ORDER BY l.created_at DESC`
  );
};
