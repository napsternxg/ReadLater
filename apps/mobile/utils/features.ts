import * as FileSystem from 'expo-file-system/legacy';

const FS = FileSystem as any;
const DOCUMENT_DIR = FS.documentDirectory || FS.cacheDirectory;
const SETTINGS_FILE = `${DOCUMENT_DIR}settings.json`;

export type FeatureFlag = 'waybackArchiver'; // Add future flags here

export interface FeatureFlagsState {
  waybackArchiver?: boolean;
}

export const getFeatureFlags = async (): Promise<FeatureFlagsState> => {
  try {
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
      const settings = JSON.parse(content);
      return settings.featureFlags || {};
    }
  } catch (e) {
    console.error('Error reading feature flags:', e);
  }
  return {};
};

export const isFeatureEnabled = async (flag: FeatureFlag): Promise<boolean> => {
  const flags = await getFeatureFlags();
  return flags[flag] === true;
};

export const toggleFeature = async (flag: FeatureFlag, value: boolean): Promise<void> => {
  try {
    let settings: any = {};
    const info = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
      settings = JSON.parse(content);
    }
    
    settings.featureFlags = settings.featureFlags || {};
    settings.featureFlags[flag] = value;

    await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving feature flag:', e);
  }
};
