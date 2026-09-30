import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// SecureStore bestaat niet in de browser; daar valt de app terug op localStorage.
const KEY = 'clockit_token';

export async function loadToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string | null) {
  try {
    if (Platform.OS === 'web') {
      if (token) globalThis.localStorage?.setItem(KEY, token);
      else globalThis.localStorage?.removeItem(KEY);
      return;
    }
    if (token) await SecureStore.setItemAsync(KEY, token);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Opslaan mislukt: de gebruiker moet dan na het herstarten opnieuw inloggen.
  }
}
