import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getDbPath, checkpointDb, initDb, getDbName } from '../db/index';

const FS = FileSystem as any;
const DOCUMENT_DIR = FS.documentDirectory || FS.cacheDirectory;
const SETTINGS_FILE = `${DOCUMENT_DIR}settings.json`;
const SYNC_FILE_NAME = 'readlater.db';

export const getSyncFolderUri = async (): Promise<string | null> => {
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
      const settings = JSON.parse(content);
      return settings.syncFolderUri || null;
    }
  } catch (e) {
    console.error('Error reading sync folder URI:', e);
  }
  return null;
};

export const setSyncFolderUri = async (uri: string | null) => {
  try {
    let settings = {};
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
      settings = JSON.parse(content);
    }
    await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ ...settings, syncFolderUri: uri }));
  } catch (e) {
    console.error('Error saving sync folder URI:', e);
  }
};

export const setupSyncFolder = async (showAlert: (title: string, msg: string) => void) => {
  if (Platform.OS !== 'android') {
    showAlert('Not Supported', 'Syncthing folder sync is currently only supported on Android.');
    return;
  }
  try {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      await setSyncFolderUri(permissions.directoryUri);
      showAlert('Success', 'Sync folder linked successfully. Performing initial push...');
      await syncPush();
    }
  } catch (e: any) {
    console.error(e);
    showAlert('Error', 'Failed to link sync folder: ' + e.message);
  }
};

export const syncPush = async () => {
  if (Platform.OS !== 'android') return;
  const syncUri = await getSyncFolderUri();
  if (!syncUri) return;

  try {
    // 1. Checkpoint WAL
    await checkpointDb();

    // 2. Get local DB path
    const localDbPath = await getDbPath();

    // 3. Find if the file already exists in the SAF directory
    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(syncUri);
    // SAF encoding sometimes varies
    const existingFileUri = files.find(f => f.includes(SYNC_FILE_NAME));
    
    let targetUri = existingFileUri;
    
    // If it doesn't exist, create it
    if (!targetUri) {
      targetUri = await FileSystem.StorageAccessFramework.createFileAsync(syncUri, SYNC_FILE_NAME, 'application/octet-stream');
    }

    // 4. Read local DB as base64 and write to SAF
    const base64Content = await FileSystem.readAsStringAsync(localDbPath, { encoding: 'base64' });
    await FileSystem.StorageAccessFramework.writeAsStringAsync(targetUri, base64Content, { encoding: 'base64' });

    console.log('Successfully pushed SQLite DB to sync folder');
  } catch (e) {
    console.error('syncPush failed:', e);
  }
};

let isPulling = false;

export const syncPull = async (force: boolean = false, showAlert?: (title: string, msg: string) => void) => {
  if (Platform.OS !== 'android') return;
  if (isPulling) return;
  
  const syncUri = await getSyncFolderUri();
  if (!syncUri) return;

  try {
    isPulling = true;
    const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(syncUri);
    const safFileUri = files.find(f => f.includes(SYNC_FILE_NAME));
    
    if (!safFileUri) {
      if (showAlert) showAlert('No DB File', 'No readlater.db found in the sync folder.');
      isPulling = false;
      return;
    }

    // Get modified times
    const safFileInfo = await FileSystem.getInfoAsync(safFileUri);
    const localDbPath = await getDbPath();
    const localFileInfo = await FileSystem.getInfoAsync(localDbPath);

    const safModTime = safFileInfo.exists ? (safFileInfo as any).modificationTime || 0 : 0;
    const localModTime = localFileInfo.exists ? (localFileInfo as any).modificationTime || 0 : 0;

    // Pull if external file is newer, or if forced
    if (force || safModTime > localModTime) {
      console.log(`Syncing from external folder. SAF time: ${safModTime}, Local time: ${localModTime}`);
      
      // Checkpoint local just in case
      await checkpointDb();

      // Copy from SAF to local
      const base64Content = await FileSystem.readAsStringAsync(safFileUri, { encoding: 'base64' });
      await FileSystem.writeAsStringAsync(localDbPath, base64Content, { encoding: 'base64' });

      // Re-init the database connection to load new data
      await initDb();
      if (showAlert) showAlert('Success', 'Database pulled and synced successfully.');
    } else {
      if (showAlert) showAlert('Up to date', 'Local database is already up to date.');
    }
  } catch (e: any) {
    console.error('syncPull failed:', e);
    if (showAlert) showAlert('Error', 'Failed to pull synced database: ' + e.message);
  } finally {
    isPulling = false;
  }
};

export const clearSyncFolder = async () => {
    await setSyncFolderUri(null);
};
