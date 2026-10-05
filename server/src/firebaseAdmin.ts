import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) throw new Error('Credenciais administrativas do Firebase não configuradas.');
if (getApps().length === 0) initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }), databaseURL: process.env.FIREBASE_DATABASE_URL });
export const adminAuth = getAuth();
export const adminFirestore = getFirestore();
export const adminDatabase = getDatabase();
