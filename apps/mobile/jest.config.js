module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./setup-tests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo/src/winter$': '<rootDir>/__mocks__/expo-winter-mock.js',
    '^expo/src/winter/(.*)$': '<rootDir>/__mocks__/expo-winter-mock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|dayjs)',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  // Resolve the Expo winter runtime import scope error
  resolver: undefined,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  globals: {
    __DEV__: true,
  },
};
