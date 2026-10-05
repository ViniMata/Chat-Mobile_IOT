import { off, onValue, push, ref, set, Unsubscribe } from 'firebase/database';
import { realtimeDb } from './firebase';
import { ChatMessage, ConversationType, MessageTarget } from '../types/domain';

export async function sendMessage(input: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage> {
  const messageRef = push(ref(realtimeDb, `messages/${input.conversationId}`));
  if (!messageRef.key) throw new Error('Não foi possível criar a mensagem.');
  const message: ChatMessage = { ...input, id: messageRef.key, createdAt: Date.now() };
  await set(messageRef, message);
  return message;
}
export function listenMessages(conversationId: string, callback: (messages: ChatMessage[]) => void, onError?: (error: Error) => void): Unsubscribe {
  const messagesRef = ref(realtimeDb, `messages/${conversationId}`);
  const unsubscribe = onValue(messagesRef, snapshot => {
    const value = snapshot.val() as Record<string, ChatMessage> | null;
    callback(value ? Object.values(value).sort((a, b) => a.createdAt - b.createdAt) : []);
  }, onError);
  return () => { off(messagesRef); unsubscribe(); };
}
export const generalTarget = (): MessageTarget => ({ type: 'conversation' });
export const typeOfMessage = (conversationType: ConversationType): ConversationType => conversationType;
