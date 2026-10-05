export type ConversationType = 'direct' | 'group';
export type NotificationPolicy = 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';

export type UserProfile = {
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string | null;
  createdAt: number;
};

export type Group = {
  id: string;
  name: string;
  photoUrl: string | null;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type DirectConversation = { id: string; participantIds: [string, string]; createdAt: number };
export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };
export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type DeviceRegistration = { token: string; platform: 'android' | 'ios'; enabled: boolean; updatedAt: number };
