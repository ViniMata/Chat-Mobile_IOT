import { AuthScreen, ConversationsScreen, UsersScreen, GroupForm, ChatScreen, GroupSettings, ProfileScreen, Loading, SetupNotice } from './src/screens/screens';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { auth, firestore, isFirebaseConfigured } from './src/services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { getMyDirectConversations, getMyGroups } from './src/services/conversationService';
import { registerPushToken } from './src/services/notificationService';
import { getUserProfile } from './src/services/userService';
import { ConversationType, Group } from './src/types/domain';
import * as Notifications from 'expo-notifications';
import { waitForRegistration } from './src/services/authService';

type Page = 'conversations' | 'users' | 'new-group' | 'chat' | 'group-settings' | 'profile';
type OpenConversation = { id: string; type: ConversationType; title: string; group?: Group; otherUid?: string; photoUrl?: string | null };

export default function App(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null); const [initializing, setInitializing] = useState(true);
  const [page, setPage] = useState<Page>('conversations'); const [open, setOpen] = useState<OpenConversation | null>(null);
  const [profileUid, setProfileUid] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, () => {
      void waitForRegistration().then(() => {
        if (!active) return;
        const current = auth.currentUser;
        setUser(current); setInitializing(false);
        if (!current) { setOpen(null); setPage('conversations'); }
      });
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void registerPushToken().catch((error: unknown) => {
      if (active) Alert.alert('Notificações indisponíveis', error instanceof Error ? error.message : 'Não foi possível configurar as notificações deste dispositivo.');
    });
    return () => { active = false; };
  }, [user]);
  const groupId = open?.type === 'group' ? open.id : null;
  useEffect(() => {
    if (!groupId || !user) return;
    return onSnapshot(doc(firestore, 'groups', groupId), snapshot => {
      if (!snapshot.exists()) { setOpen(null); setPage('conversations'); return; }
      const group = { ...snapshot.data(), id: snapshot.id } as Group;
      setOpen(current => current?.id === groupId ? { ...current, title: group.name, group } : current);
    }, () => { setOpen(null); setPage('conversations'); });
  }, [groupId, user]);
  const openChat = useCallback((conversation: OpenConversation) => { setOpen(conversation); setPage('chat'); }, []);
  useEffect(() => {
    if (!user) return;
    const handle = async (response: Notifications.NotificationResponse): Promise<void> => {
      const data = response.notification.request.content.data;
      if (!data || typeof data.conversationId !== 'string') return;
      const [groups, directs] = await Promise.all([getMyGroups(user.uid), getMyDirectConversations(user.uid)]);
      const group = groups.find(item => item.id === data.conversationId);
      const direct = directs.find(item => item.id === data.conversationId);
      if (group) openChat({ id: group.id, type: 'group', title: group.name, group });
      else if (direct) { const otherUid = direct.participantIds.find(uid => uid !== user.uid); const profile = otherUid ? await getUserProfile(otherUid) : null; openChat({ id: direct.id, type: 'direct', title: profile?.name ?? 'Conversa', otherUid, photoUrl: profile?.photoUrl }); }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(response => { void handle(response).catch(() => Alert.alert('Notificação', 'Conversa indisponível.')); });
    void Notifications.getLastNotificationResponseAsync().then(response => { if (response) return handle(response); }).catch(() => undefined);
    return () => subscription.remove();
  }, [user, openChat]);
  if (!isFirebaseConfigured) return <SetupNotice />;
  if (initializing) return <Loading />;
  if (!user) return <AuthScreen />;
  if (page === 'users') return <UsersScreen uid={user.uid} onBack={() => setPage('conversations')} onOpen={openChat} />;
  if (page === 'new-group') return <GroupForm uid={user.uid} onBack={() => setPage('conversations')} onCreated={openChat} />;
  if (page === 'profile' && profileUid) return <ProfileScreen uid={profileUid} onBack={() => setPage(open?.type === 'group' ? 'group-settings' : 'chat')} />;
  if (page === 'group-settings' && open?.group) return <GroupSettings group={open.group} uid={user.uid} onBack={() => setPage('chat')} onProfile={uid => { setProfileUid(uid); setPage('profile'); }} onUpdated={group => setOpen(current => current ? { ...current, title: group.name, group } : current)} />;
  if (page === 'chat' && open) return <ChatScreen conversation={open} uid={user.uid} onBack={() => setPage('conversations')} onGroupSettings={() => { if (open.type === 'group') setPage('group-settings'); else if (open.otherUid) { setProfileUid(open.otherUid); setPage('profile'); } }} />;
  return <ConversationsScreen key={user.uid} uid={user.uid} onUsers={() => setPage('users')} onNewGroup={() => setPage('new-group')} onOpen={openChat} />;
}
