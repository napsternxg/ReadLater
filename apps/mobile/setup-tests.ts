// Mock expo's internal runtime to prevent import scope errors
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal', () => ({}), { virtual: true });

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
  getStringAsync: jest.fn().mockResolvedValue(''),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Image: (props: any) => React.createElement(View, props),
  };
});

// Mock expo-font
jest.mock('expo-font', () => ({
  isLoaded: jest.fn().mockReturnValue(true),
  loadAsync: jest.fn().mockResolvedValue(true),
}));

// Mock expo-router
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn().mockReturnValue({}),
  useNavigation: () => ({
    addListener: jest.fn().mockReturnValue(jest.fn()),
  }),
  useFocusEffect: (cb: () => void) => cb(),
  Link: 'Link',
}));

// Mock expo-file-system
const mockFs = {
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('[]'),
  EncodingType: { UTF8: 'utf8' },
};
jest.mock('expo-file-system', () => mockFs);
jest.mock('expo-file-system/legacy', () => mockFs);

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-symbols
jest.mock('expo-symbols', () => ({
  SymbolView: 'SymbolView',
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

// Mock db queries
jest.mock('./db/queries', () => ({
  getAllLinks: jest.fn().mockResolvedValue([]),
  getLinksByTag: jest.fn().mockResolvedValue([]),
  getLinksByDomain: jest.fn().mockResolvedValue([]),
  deleteLink: jest.fn().mockResolvedValue(undefined),
  insertLink: jest.fn().mockResolvedValue(undefined),
  addTagToLink: jest.fn().mockResolvedValue(undefined),
  removeTagFromLink: jest.fn().mockResolvedValue(undefined),
  getTagsForLink: jest.fn().mockResolvedValue([]),
  getTagsWithCount: jest.fn().mockResolvedValue([]),
  getDomainsWithCount: jest.fn().mockResolvedValue([]),
  getAllTagNames: jest.fn().mockResolvedValue([]),
  clearAllData: jest.fn().mockResolvedValue(undefined),
  importData: jest.fn().mockResolvedValue(undefined),
}));

// Mock db/index
jest.mock('./db', () => ({
  getDb: jest.fn().mockResolvedValue({
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    runAsync: jest.fn(),
    execAsync: jest.fn(),
  }),
  initDb: jest.fn().mockResolvedValue(undefined),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Export mocks for test access
export { mockRouter };
