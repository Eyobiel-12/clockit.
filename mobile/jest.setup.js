// expo-constants levert op een echt toestel het netwerkadres van de Expo-server.
// In tests zetten we een vaste waarde, zodat API_URL voorspelbaar is.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: '192.168.1.10:8081' } },
}));
