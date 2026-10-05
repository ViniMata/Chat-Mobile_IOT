import { adminDatabase, adminFirestore } from '../firebaseAdmin.js';
import { withConversationLock } from './conversationLock.js';

export async function syncConversationAccess(conversationId: string, type: 'direct' | 'group', actorId: string): Promise<void> {
  return withConversationLock(conversationId, () => synchronize(conversationId, type, actorId));
}
async function synchronize(conversationId: string, type: 'direct' | 'group', actorId: string): Promise<void> {
  const collection = type === 'direct' ? 'directConversations' : 'groups';
  const snapshot = await adminFirestore.collection(collection).doc(conversationId).get();
  if (!snapshot.exists) throw new Error('Conversa não encontrada.');
  const data = snapshot.data() as { participantIds?: string[]; memberIds?: string[] };
  const participantIds = type === 'direct' ? data.participantIds : data.memberIds;
  if (!participantIds?.includes(actorId)) throw new Error('Operação sem permissão.');
  await adminDatabase.ref(`conversationAccess/${conversationId}`).set(Object.fromEntries(participantIds.map(uid => [uid, true])));
}
