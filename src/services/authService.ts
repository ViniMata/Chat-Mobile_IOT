import { createUserWithEmailAndPassword, deleteUser, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { UserProfile } from '../types/domain';
import { disableCurrentDevice } from './notificationService';
let registrationPending: Promise<void> | null = null;
export function waitForRegistration(): Promise<void> { return registrationPending ?? Promise.resolve(); }

export async function registerUser(profile: Omit<UserProfile, 'createdAt'>, password: string): Promise<User> {
  let finish!: () => void;
  registrationPending = new Promise<void>(resolve => { finish = resolve; });
  try {
    const credential = await createUserWithEmailAndPassword(auth, profile.email, password);
    try { await setDoc(doc(firestore, 'users', credential.user.uid), { ...profile, createdAt: Date.now() }); }
    catch (error) { try { await deleteUser(credential.user); } catch { await signOut(auth); } throw error; }
    return credential.user;
  } finally { finish(); registrationPending = null; }
}
export const login = (email: string, password: string) => signInWithEmailAndPassword(auth, email.trim(), password);
export async function logout(): Promise<void> {
  try { await disableCurrentDevice(); } finally { await signOut(auth); }
}
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());
