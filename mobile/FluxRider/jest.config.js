module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@env$': '<rootDir>/__mocks__/envMock.js',
    '\\.(css)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-native-community|react-clone-referenced-element|@react-navigation|@react-native-async-storage|@react-native-firebase|react-native-geolocation-service|react-native-maps|react-native-modal|react-native-vector-icons|react-native-reanimated|@reduxjs|react-redux|redux|redux-thunk|reselect|immer|lucide-react-native|nativewind|react-native-css-interop)/)',
  ],
};
