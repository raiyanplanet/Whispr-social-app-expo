import { Platform } from 'react-native';

// Platform-specific storage implementation
export const createStorage = () => {
  if (Platform.OS === 'web') {
    // Use localStorage for web with proper error handling
    return {
      getItem: (key: string) => {
        return new Promise<string | null>((resolve) => {
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              const value = window.localStorage.getItem(key);
              resolve(value);
            } else {
              resolve(null);
            }
          } catch (error) {
            console.warn('localStorage not available:', error);
            resolve(null);
          }
        });
      },
      setItem: (key: string, value: string) => {
        return new Promise<void>((resolve) => {
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(key, value);
            }
          } catch (error) {
            console.warn('localStorage not available:', error);
          }
          resolve();
        });
      },
      removeItem: (key: string) => {
        return new Promise<void>((resolve) => {
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem(key);
            }
          } catch (error) {
            console.warn('localStorage not available:', error);
          }
          resolve();
        });
      },
    };
  } else {
    // Use AsyncStorage for mobile
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return AsyncStorage;
    } catch (error) {
      console.warn('AsyncStorage not available:', error);
      // Fallback to memory storage
      const memoryStorage = new Map();
      return {
        getItem: (key: string) => Promise.resolve(memoryStorage.get(key) || null),
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key);
          return Promise.resolve();
        },
      };
    }
  }
}; 