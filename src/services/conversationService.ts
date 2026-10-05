import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { firestore } from './firebase';
import { DirectConversation, Group, NotificationPolicy } from '../types/domain';
import { apiRequest } from './api';

export function directConversationId(firstUid: string, secondUid: string): string {
  if (firstUid === secondUid) throw new Error('Você não pode iniciar uma conversa consigo mesmo.');
  return `direct_${[firstUid, secondUid].sort().join('_')}`;
}
export async function ensureDirectConversation(firstUid: string, secondUid: string): Promise<DirectConversation> {
  directConversationId(firstUid, secondUid);
  return apiRequest<DirectConversation>('/direct-conversations', 'POST', { otherUid: secondUid });
}
export async function createGroup(input: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (input.memberIds.length < 2 || !input.memberIds.includes(input.ownerId)) throw new Error('O grupo deve incluir o proprietário e outro integrante.');
  if (!Number.isInteger(input.memberLimit) || input.memberLimit < input.memberIds.length) throw new Error('Limite de integrantes inválido.');
  if (!input.name.trim()) throw new Error('Informe o nome do grupo.');
  const ref = doc(collection(firestore, 'groups'));
  const now = Date.now();
  await setDoc(ref, { ...input, memberIds: [...new Set(input.memberIds)], createdAt: now, updatedAt: now });
  return ref.id;
}
export async function addGroupMember(groupId: string, actorId: string, memberId: string): Promise<void> {
  await apiRequest(`/groups/${groupId}`, 'PATCH', { addMemberId: memberId });
}
export async function updateGroupPolicy(groupId: string, actorId: string, notificationPolicy: NotificationPolicy): Promise<void> {
  await apiRequest(`/groups/${groupId}`, 'PATCH', { notificationPolicy });
}
export async function editGroup(groupId: string, changes: { name?: string; memberLimit?: number; removeMemberId?: string; photoUrl?: string }): Promise<void> {
  await apiRequest(`/groups/${groupId}`, 'PATCH', changes);
}
export async function getMyGroups(uid: string): Promise<Group[]> {
  const snapshot = await getDocs(query(collection(firestore, 'groups'), where('memberIds', 'array-contains', uid)));
  return snapshot.docs.map(item => ({ id: item.id, ...(item.data() as Omit<Group, 'id'>) }));
}
export async function getMyDirectConversations(uid: string): Promise<DirectConversation[]> {
  const snapshot = await getDocs(query(collection(firestore, 'directConversations'), where('participantIds', 'array-contains', uid)));
  return snapshot.docs.map(item => ({ id: item.id, ...(item.data() as Omit<DirectConversation, 'id'>) }));
}
