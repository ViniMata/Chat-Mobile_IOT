import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Database, getDatabase } from 'firebase/database';
import firebaseConfig from '../../firebaseConfig.json';

const configured = firebaseConfig.apiKey !== 'SUBSTITUA' && firebaseConfig.projectId !== 'SUBSTITUA';
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
function initializeSession(): Auth {
  if (Platform.OS === 'web') return getAuth(app);
  try { return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/already-initialized') return getAuth(app); throw error; }
}
export const auth: Auth = initializeSession();
export const firestore: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);
export const isFirebaseConfigured = configured;
