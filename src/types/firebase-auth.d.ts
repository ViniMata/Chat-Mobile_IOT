import 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import type AsyncStorage from '@react-native-async-storage/async-storage';
// The SDK exports this function from its React Native entry, but not its browser declarations.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
}
