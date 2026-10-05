import { apiRequest } from './api';
import { ConversationType } from '../types/domain';

export async function syncConversationAccess(conversationId: string, type: ConversationType): Promise<void> {
  await apiRequest('/conversation-access/sync', 'POST', { conversationId, type });
}
