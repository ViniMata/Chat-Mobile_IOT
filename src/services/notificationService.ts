import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { ChatMessage } from '../types/domain';
let registeredDevice: { uid: string; id: string } | null = null;

export async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice || !auth.currentUser) return null;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Mensagens', importance: Notifications.AndroidImportance.MAX });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const projectId = (Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId) as string | undefined;
  if (!projectId) return null;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await setDoc(doc(firestore, 'users', auth.currentUser.uid, 'devices', token), { token, platform, enabled: true, updatedAt: Date.now() });
  registeredDevice = { uid: auth.currentUser.uid, id: token };
  return token;
}
export async function disableCurrentDevice(): Promise<void> {
  if (!registeredDevice) return;
  await updateDoc(doc(firestore, 'users', registeredDevice.uid, 'devices', registeredDevice.id), { enabled: false, updatedAt: Date.now() });
  registeredDevice = null;
}

export async function requestMessageNotification(message: ChatMessage): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const apiUrl = process.env.EXPO_PUBLIC_NOTIFICATION_API_URL;
  if (!apiUrl || apiUrl.includes('sua-api')) return;
  const idToken = await user.getIdToken();
  const response = await fetch(`${apiUrl}/notifications/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: message.conversationId, messageId: message.id }),
  });
  if (!response.ok) throw new Error('A API de notificações não aceitou a solicitação.');
}
