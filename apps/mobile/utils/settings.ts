import * as FileSystem from 'expo-file-system/legacy';

const FS = FileSystem as any;
const DOCUMENT_DIR = FS.documentDirectory || FS.cacheDirectory;
const SETTINGS_FILE = `${DOCUMENT_DIR}settings.json`;

export const isDeveloperModeEnabled = async (): Promise<boolean> => {
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
      const settings = JSON.parse(content);
      return settings.developerMode === true;
    }
  } catch (e) {
    console.error('Error reading developer mode:', e);
  }
  return false;
};
