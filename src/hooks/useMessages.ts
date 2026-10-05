import { useEffect, useState } from 'react';
import { ChatMessage , ConversationType } from '../types/domain';
import { listenMessages } from '../services/messageService';
import { syncConversationAccess } from '../services/accessService';

export function useMessages(conversationId: string | null, type: ConversationType): { messages: ChatMessage[]; loading: boolean; error: string | null } {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(conversationId));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(Boolean(conversationId)); setMessages([]); setError(null);
      if (!conversationId) return;
      await syncConversationAccess(conversationId, type);
      if (!active) return;
      unsubscribe = listenMessages(conversationId, values => { if (active) { setMessages(values); setLoading(false); } }, () => { if (active) { setError('Realtime Database recusou o acesso. Confira as regras publicadas e se a URL do banco é a mesma no aplicativo e na API.'); setMessages([]); setLoading(false); } });
    }).catch((error: unknown) => { if (active) { setError(error instanceof Error ? error.message : 'Não foi possível autorizar a conversa.'); setLoading(false); } });
    return () => { active = false; unsubscribe?.(); };
  }, [conversationId, type]);
  return { messages, loading, error };
}
