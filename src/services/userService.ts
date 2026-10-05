import { UserProfile } from '../types/domain';
import { apiRequest } from './api';

export type DirectoryUser = UserProfile & { id: string };
export async function listOtherUsers(currentUid: string): Promise<DirectoryUser[]> {
  const users = await apiRequest<{ id: string; name: string; photoUrl: string | null }[]>('/users');
  return users.filter(item => item.id !== currentUid).map(item => ({ ...item, email: '', phoneNumber: '', birthDate: '', createdAt: 0 }));
}
export async function getUserProfile(uid: string): Promise<DirectoryUser | null> {
  return apiRequest<DirectoryUser>(`/users/${encodeURIComponent(uid)}`);
}
