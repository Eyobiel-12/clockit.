/**
 * jest-expo zet de React Native-omgeving op en mockt de native kant van de Expo SDK.
 * Zie https://docs.expo.dev/develop/unit-testing/
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Pakketten in node_modules die als ES-modules worden geleverd en dus wél door Babel moeten.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-maps|@testing-library/react-native)',
  ],
  collectCoverageFrom: [
    // Alleen modules met tests. Breid deze lijst uit zodra er tests bij komen,
    // zodat de drempel van 80% betekenis houdt in plaats van altijd rood te staan.
    'src/lib/format.ts',
    'src/lib/api.ts',
  ],
  coverageDirectory: 'coverage',
  // lcov is wat Codecov in CI inleest; json-summary gebruiken we voor de badge.
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
