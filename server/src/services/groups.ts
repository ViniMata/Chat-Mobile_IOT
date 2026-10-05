import { adminDatabase, adminFirestore } from '../firebaseAdmin.js';
import { withConversationLock } from './conversationLock.js';

export async function editGroup(id: string, uid: string, input: Record<string, unknown>): Promise<void> {
  return withConversationLock(id, () => applyGroupEdit(id, uid, input));
}
async function applyGroupEdit(id: string, uid: string, input: Record<string, unknown>): Promise<void> {
  const reference = adminFirestore.collection('groups').doc(id);
  await adminFirestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(reference);
    const group = snapshot.data();
    if (!group || group.ownerId !== uid) throw new Error('Operação sem permissão.');
    const members = group.memberIds as string[];
    let next = [...members];
    if (typeof input.addMemberId === 'string') {
      if (!(await transaction.get(adminFirestore.collection('users').doc(input.addMemberId))).exists) throw new Error('Usuário não encontrado.');
      next = [...new Set([...members, input.addMemberId])];
    }
    if (typeof input.removeMemberId === 'string') {
      if (input.removeMemberId === uid) throw new Error('O proprietário deve permanecer no grupo.');
      next = next.filter(member => member !== input.removeMemberId);
    }
    const memberLimit = input.memberLimit ?? group.memberLimit;
    if (typeof memberLimit !== 'number' || !Number.isInteger(memberLimit) || memberLimit < next.length || next.length < 2) throw new Error('Limite ou quantidade de integrantes inválida.');
    const updates: Record<string, unknown> = { memberIds: next, memberLimit, updatedAt: Date.now() };
    if (typeof input.name === 'string') { if (!input.name.trim()) throw new Error('Nome obrigatório.'); updates.name = input.name.trim(); }
    if (typeof input.notificationPolicy === 'string') {
      if (!['all_group_messages','mentioned_members','direct_messages_only','disabled'].includes(input.notificationPolicy)) throw new Error('Política inválida.');
      updates.notificationPolicy = input.notificationPolicy;
    }
    if (typeof input.photoUrl === 'string') { if (!input.photoUrl.startsWith('https://')) throw new Error('URL inválida.'); updates.photoUrl = input.photoUrl; }
    // Revoke before changing Firestore: failure denies access rather than preserving revoked membership.
    const revoked = members.filter(member => !next.includes(member));
    if (revoked.length) await adminDatabase.ref(`conversationAccess/${id}`).update(Object.fromEntries(revoked.map(member => [member, null])));
    transaction.update(reference, updates);
  });
  const current = (await reference.get()).data();
  await adminDatabase.ref(`conversationAccess/${id}`).set(Object.fromEntries((current?.memberIds as string[]).map(member => [member, true])));
}
