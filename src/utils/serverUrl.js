import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY     = 'stockpile_server_url';
const DEFAULT = 'http://localhost:3747';

export async function loadServerUrl() {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(KEY) || DEFAULT;
    }
    return (await AsyncStorage.getItem(KEY)) || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export async function saveServerUrl(url) {
  const trimmed = url.trim().replace(/\/$/, ''); // remove trailing slash
  if (Platform.OS === 'web') {
    localStorage.setItem(KEY, trimmed);
  } else {
    await AsyncStorage.setItem(KEY, trimmed);
  }
}
