import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { ChatMessage } from '../types/domain';
import { apiRequest } from './api';
let registeredDevice: { uid: string; id: string } | null = null;

// SDK 57 requires an explicit handler to present push while the app is open.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !auth.currentUser) return null;
  const uid = auth.currentUser.uid;
  if (Constants.executionEnvironment === 'storeClient') throw new Error('Push remoto precisa de uma build própria. Abra o aplicativo instalado por EAS, não o Expo Go.');
  if (!Device.isDevice) throw new Error('Valide o push em um celular físico.');
  const projectId = (Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId) as string | undefined;
  if (!projectId) throw new Error('Configure extra.eas.projectId em app.json e gere uma build com credenciais FCM/APNs.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Mensagens', importance: Notifications.AndroidImportance.MAX });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Notificações não autorizadas. Ative a permissão nas configurações do celular e entre novamente no app.');
  let token: string;
  try { token = (await Notifications.getExpoPushTokenAsync({ projectId })).data; }
  catch { throw new Error('Não foi possível registrar o push. Confira a conexão, o projeto EAS e as credenciais FCM/APNs da build.'); }
  if (auth.currentUser?.uid !== uid) return null;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  try { await setDoc(doc(firestore, 'users', uid, 'devices', token), { token, platform, enabled: true, updatedAt: Date.now() }); }
  catch { throw new Error('Não foi possível salvar o dispositivo. Confira a conexão e as regras da subcoleção users/devices no Firestore.'); }
  registeredDevice = { uid, id: token };
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
  await apiRequest('/notifications/messages', 'POST', {
    conversationId: message.conversationId, messageId: message.id,
  });
}
