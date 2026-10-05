import { adminDatabase, adminFirestore } from '../firebaseAdmin.js';
import { recipients } from './policy.js';
import { createHash } from 'node:crypto';

type NotificationPolicy = 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';
type StoredMessage = { senderId: string; conversationType: 'direct' | 'group'; mentionedUserIds?: string[] };
type StoredGroup = { ownerId: string; memberIds: string[]; notificationPolicy: NotificationPolicy };
type StoredDirect = { participantIds: string[] };
type StoredDevice = { token: string; enabled: boolean };
type RequestInput = { conversationId: string; messageId: string; senderId: string };

const deliveryId = (conversationId: string, messageId: string): string => createHash('sha256').update(JSON.stringify([conversationId, messageId])).digest('hex');
export async function sendForMessage(input: RequestInput): Promise<{ sent: number; duplicate: boolean }> {
  const messageSnapshot = await adminDatabase.ref(`messages/${input.conversationId}/${input.messageId}`).get();
  const message = messageSnapshot.val() as StoredMessage | null;
  if (!message || message.senderId !== input.senderId) throw new Error('Mensagem não encontrada ou remetente inválido.');
  const delivery = adminFirestore.collection('notificationDeliveries').doc(deliveryId(input.conversationId, input.messageId));
  const alreadySent = await adminFirestore.runTransaction(async transaction => {
    const current = await transaction.get(delivery);
    if (current.exists) return true;
    transaction.create(delivery, { status: 'processing', createdAt: Date.now() });
    return false;
  });
  if (alreadySent) return { sent: 0, duplicate: true };
  const recipients = await resolveRecipients(input.conversationId, message);
  const tokens = await resolveTokens(recipients.filter(uid => uid !== input.senderId));
  const results = await Promise.all(tokens.map(token => sendExpoPush(token, input.conversationId, message.conversationType)));
  await delivery.set({ status: 'sent', sent: results.filter(Boolean).length, completedAt: Date.now() }, { merge: true });
  return { sent: results.filter(Boolean).length, duplicate: false };
}
async function resolveRecipients(conversationId: string, message: StoredMessage): Promise<string[]> {
  if (message.conversationType === 'direct') {
    const direct = (await adminFirestore.collection('directConversations').doc(conversationId).get()).data() as StoredDirect | undefined;
    return recipients(direct?.participantIds ?? [], message.senderId, 'direct', 'all_group_messages');
  }
  const group = (await adminFirestore.collection('groups').doc(conversationId).get()).data() as StoredGroup | undefined;
  if (!group || group.notificationPolicy === 'disabled' || group.notificationPolicy === 'direct_messages_only') return [];
  return recipients(group.memberIds, message.senderId, 'group', group.notificationPolicy, message.mentionedUserIds);
}
async function resolveTokens(userIds: string[]): Promise<string[]> {
  const devices = await Promise.all(userIds.map(uid => adminFirestore.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get()));
  return devices.flatMap(snapshot => snapshot.docs.map(doc => (doc.data() as StoredDevice).token));
}
async function sendExpoPush(token: string, conversationId: string, conversationType: 'direct' | 'group'): Promise<boolean> {
  const response = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) }, body: JSON.stringify({ to: token, sound: 'default', title: 'Nova mensagem', body: 'Você recebeu uma nova mensagem', data: { conversationId, conversationType } }) });
  const payload = await response.json() as { data?: { status?: string; id?: string; details?: { error?: string } } };
  if (payload.data?.details?.error === 'DeviceNotRegistered') {
    const devices = await adminFirestore.collectionGroup('devices').where('token', '==', token).get();
    await Promise.all(devices.docs.map(device => device.ref.update({ enabled: false })));
    return false;
  }
  if (!response.ok || payload.data?.status !== 'ok' || !payload.data.id) return false;
  await adminFirestore.collection('pushReceipts').doc(payload.data.id).set({ token, createdAt: Date.now() });
  return true;
}
export async function checkPushReceipts(): Promise<void> {
  const pending = await adminFirestore.collection('pushReceipts').where('createdAt', '<', Date.now() - 15 * 60 * 1000).limit(100).get();
  if (pending.empty) return;
  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: pending.docs.map(doc => doc.id) }) });
  if (!response.ok) return;
  const payload = await response.json() as { data?: Record<string, { status: string; details?: { error?: string } }> };
  for (const receipt of pending.docs) {
    const result = payload.data?.[receipt.id];
    if (!result) continue;
    if (result.details?.error === 'DeviceNotRegistered') {
      const devices = await adminFirestore.collectionGroup('devices').where('token', '==', receipt.data().token).get();
      await Promise.all(devices.docs.map(device => device.ref.update({ enabled: false })));
    }
    await receipt.ref.delete();
  }
}
