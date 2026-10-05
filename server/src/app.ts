import 'dotenv/config';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { adminAuth, adminFirestore } from './firebaseAdmin.js';
import { editGroup } from './services/groups.js';
import { sendForMessage, checkPushReceipts } from './services/notifications.js';
import { syncConversationAccess } from './services/conversationAccess.js';

type AuthenticatedRequest = Request & { uid?: string };
const app = express();
app.use(cors()); app.use(express.json());
app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));
app.post('/notifications/messages', async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
  try {
    const header = request.header('Authorization');
    if (!header?.startsWith('Bearer ')) return response.status(401).json({ error: 'Token ausente.' });
    request.uid = (await adminAuth.verifyIdToken(header.slice(7))).uid;
    const body: unknown = request.body;
    if (!isNotificationRequest(body)) return response.status(400).json({ error: 'Corpo inválido.' });
    return response.status(200).json(await sendForMessage({ ...body, senderId: request.uid }));
  } catch (error) { return next(error); }
});
app.post('/conversation-access/sync', async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
  try {
    const header = request.header('Authorization');
    if (!header?.startsWith('Bearer ')) return response.status(401).json({ error: 'Token ausente.' });
    const uid = (await adminAuth.verifyIdToken(header.slice(7))).uid;
    const body: unknown = request.body;
    if (!isConversationAccessRequest(body)) return response.status(400).json({ error: 'Corpo inválido.' });
    await syncConversationAccess(body.conversationId, body.type, uid);
    return response.status(204).send();
  } catch (error) { return next(error); }
});
app.use(async (request: AuthenticatedRequest, response: Response, next: NextFunction) => {
  try { const header = request.header('Authorization'); if (!header?.startsWith('Bearer ')) { response.status(401).json({ error: 'Autenticação necessária.' }); return; } request.uid = (await adminAuth.verifyIdToken(header.slice(7), true)).uid; next(); }
  catch { response.status(401).json({ error: 'Sessão inválida.' }); }
});
app.get('/users', async (request: AuthenticatedRequest, response, next) => {
  try { const snapshot = await adminFirestore.collection('users').limit(100).get(); response.json(snapshot.docs.filter(doc => doc.id !== request.uid).map(doc => ({ id: doc.id, name: doc.data().name, photoUrl: doc.data().photoUrl ?? null }))); } catch (error) { next(error); }
});
app.post('/direct-conversations', async (request: AuthenticatedRequest, response, next) => {
  try {
    const body: unknown = request.body;
    const otherUid = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).otherUid : undefined;
    const actor = request.uid!;
    if (typeof otherUid !== 'string' || !/^[\w-]{1,128}$/.test(otherUid) || otherUid === actor) { response.status(400).json({ error: 'Participante inválido.' }); return; }
    const participants = [actor, otherUid].sort();
    const id = `direct_${participants.join('_')}`;
    const reference = adminFirestore.collection('directConversations').doc(id);
    const conversation = await adminFirestore.runTransaction(async transaction => {
      const [existing, first, second] = await Promise.all([transaction.get(reference), transaction.get(adminFirestore.collection('users').doc(actor)), transaction.get(adminFirestore.collection('users').doc(otherUid))]);
      if (!first.exists || !second.exists) throw new Error('Perfil não encontrado.');
      if (existing.exists) return { id, ...existing.data() };
      const data = { participantIds: participants, createdAt: Date.now() };
      transaction.create(reference, data);
      return { id, ...data };
    });
    response.json(conversation);
  } catch (error) { next(error); }
});
app.get('/users/:uid', async (request: AuthenticatedRequest, response, next) => {
  try {
    const uid = String(request.params.uid); const actor = request.uid!;
    if (uid !== actor) {
      const [directs, groups] = await Promise.all([adminFirestore.collection('directConversations').where('participantIds', 'array-contains', actor).get(), adminFirestore.collection('groups').where('memberIds', 'array-contains', actor).get()]);
      if (!directs.docs.some(doc => (doc.data().participantIds as string[]).includes(uid)) && !groups.docs.some(doc => (doc.data().memberIds as string[]).includes(uid))) { response.status(403).json({ error: 'Perfil protegido.' }); return; }
    }
    const profile = await adminFirestore.collection('users').doc(uid).get(); if (!profile.exists) { response.status(404).json({ error: 'Perfil não encontrado.' }); return; } response.json({ id: profile.id, ...profile.data() });
  } catch (error) { next(error); }
});
app.patch('/groups/:id', async (request: AuthenticatedRequest, response, next) => {
  try { if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) { response.status(400).json({ error: 'Dados inválidos.' }); return; } await editGroup(String(request.params.id), request.uid!, request.body as Record<string, unknown>); response.status(204).send(); } catch (error) { next(error); }
});
app.use((_error: unknown, _request: Request, response: Response, _next: NextFunction) => { response.status(400).json({ error: 'Não foi possível concluir a operação. Verifique seus dados e permissões.' }); });
function isNotificationRequest(value: unknown): value is { conversationId: string; messageId: string } { if (typeof value !== 'object' || value === null) return false; const input = value as Record<string, unknown>; return typeof input.conversationId === 'string' && /^[\w-]{1,256}$/.test(input.conversationId) && typeof input.messageId === 'string' && /^[\w-]{1,128}$/.test(input.messageId); }
function isConversationAccessRequest(value: unknown): value is { conversationId: string; type: 'direct' | 'group' } { if (typeof value !== 'object' || value === null) return false; const input = value as Record<string, unknown>; return typeof input.conversationId === 'string' && /^[\w-]{1,256}$/.test(input.conversationId) && (input.type === 'direct' || input.type === 'group'); }
app.listen(Number(process.env.PORT ?? 3000), () => console.log('Notification API started.'));
setInterval(() => { void checkPushReceipts().catch(() => console.error('Falha na verificação de recibos de push.')); }, 60_000).unref();
