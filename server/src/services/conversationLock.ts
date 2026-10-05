import { randomUUID } from 'node:crypto';
import { adminFirestore } from '../firebaseAdmin.js';

// Serializes changes to membership and its RTDB mirror across API instances.
// No automatic expiry: after a process crash, an operator must reconcile and clear the lock.
export async function withConversationLock<T>(id: string, task: () => Promise<T>): Promise<T> {
  const ref = adminFirestore.collection('conversationLocks').doc(id);
  const owner = randomUUID();
  await adminFirestore.runTransaction(async transaction => {
    if ((await transaction.get(ref)).exists) throw new Error('Conversa ocupada. Tente novamente.');
    transaction.create(ref, { owner, createdAt: Date.now() });
  });
  try { return await task(); }
  finally { await adminFirestore.runTransaction(async transaction => { const snapshot = await transaction.get(ref); if (snapshot.data()?.owner === owner) transaction.delete(ref); }); }
}
