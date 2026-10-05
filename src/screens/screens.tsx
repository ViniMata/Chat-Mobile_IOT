import { Screen } from '../components/Screen';
import { ActionButton as Button } from '../components/ActionButton';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { firestore } from '../services/firebase';
import { login, logout, registerUser, resetPassword } from '../services/authService';
import { addGroupMember, createGroup, ensureDirectConversation, getMyDirectConversations, getMyGroups, updateGroupPolicy , editGroup } from '../services/conversationService';
import { generalTarget, sendMessage } from '../services/messageService';
import { requestMessageNotification } from '../services/notificationService';
import { DirectoryUser, getUserProfile, listOtherUsers } from '../services/userService';
import { useMessages } from '../hooks/useMessages';
import { ConversationType, Group, NotificationPolicy } from '../types/domain';
import { chooseImage, uploadImage } from '../services/imageService';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { authErrorMessage } from '../utils/authError';

type AuthMode = 'login' | 'register';
type OpenConversation = { id: string; type: ConversationType; title: string; group?: Group; otherUid?: string; photoUrl?: string | null };
const errorText = (error: unknown): string => error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
const policies: NotificationPolicy[] = ['all_group_messages', 'mentioned_members', 'direct_messages_only', 'disabled'];

export function AuthScreen(): React.JSX.Element {
  const [mode, setMode] = useState<AuthMode>('login'); const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [phone, setPhone] = useState(''); const [birth, setBirth] = useState('');
  const submit = useCallback(async () => { try { setFeedback(null); setBusy(true); if (mode === 'register') { if (!name.trim() || !phone.trim() || !/^\d{2}\/\d{2}\/\d{4}$/.test(birth)) throw new Error('Preencha nome, celular e nascimento no formato DD/MM/AAAA.'); if (password !== confirmation) throw new Error('As senhas não coincidem.'); if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.'); await registerUser({ name: name.trim(), email: email.trim(), phoneNumber: phone.trim(), birthDate: birth, photoUrl }, password); } else await login(email, password); } catch (error) { setFeedback(authErrorMessage(error)); } finally { setBusy(false); } }, [birth, confirmation, email, mode, name, password, phone, photoUrl]);
  return <Screen style={styles.screen}><ScrollView contentContainerStyle={styles.auth}><View style={styles.brandMark}><Text style={styles.brandMarkText}>C</Text></View><Text style={styles.brand}>Connect Chat</Text><Text style={styles.tagline}>Conversas que aproximam.</Text><Text style={styles.heading}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>
    {feedback && <Text accessibilityRole="alert" style={{ color: '#b91c1c' }}>{feedback}</Text>}
    {mode === 'register' && <><PhotoPicker kind="profiles" value={photoUrl} onChange={setPhotoUrl} /><Field label="Nome" value={name} onChange={setName} /><Field label="Celular" value={phone} onChange={setPhone} keyboard="phone-pad" /><Field label="Nascimento (DD/MM/AAAA)" value={birth} onChange={setBirth} /></>}
    <Field label="E-mail" value={email} onChange={setEmail} keyboard="email-address" /><Field label="Senha" value={password} onChange={setPassword} secure />{mode === 'register' && <Field label="Confirmar senha" value={confirmation} onChange={setConfirmation} secure />}
    {busy ? <Loading /> : <Button title={mode === 'login' ? 'Entrar' : 'Cadastrar'} onPress={() => void submit()} />}{mode === 'login' && <Pressable onPress={() => void resetPassword(email).then(() => Alert.alert('E-mail enviado', 'Verifique sua caixa de entrada.')).catch(error => Alert.alert('Senha', errorText(error)))}><Text style={styles.link}>Esqueci minha senha</Text></Pressable>}<Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}><Text style={styles.link}>{mode === 'login' ? 'Criar uma conta' : 'Já tenho conta'}</Text></Pressable><StatusBar style="auto" />
  </ScrollView></Screen>;
}

export function ConversationsScreen({ uid, onUsers, onNewGroup, onOpen }: { uid: string; onUsers: () => void; onNewGroup: () => void; onOpen: (item: OpenConversation) => void }): React.JSX.Element {
  const [items, setItems] = useState<OpenConversation[]>([]); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { try { setLoading(true); const [groups, directs] = await Promise.all([getMyGroups(uid), getMyDirectConversations(uid)]); const directItems = await Promise.all(directs.map(async direct => { const otherUid = direct.participantIds.find(id => id !== uid); const profile = otherUid ? await getUserProfile(otherUid) : null; return { id: direct.id, type: 'direct' as const, title: profile?.name ?? 'Conversa direta', otherUid, photoUrl: profile?.photoUrl }; })); setItems([...groups.map(group => ({ id: group.id, type: 'group' as const, title: group.name, group })), ...directItems]); } catch { Alert.alert('Conversas', 'Não foi possível carregar as conversas. Verifique a conexão e a API.'); } finally { setLoading(false); } }, [uid]);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);
  return <Screen style={styles.screen}><View style={styles.header}><Text style={styles.heading}>Conversas</Text><Button title="Sair" onPress={() => void logout()} /></View><PhotoButton id={uid} kind="profiles" /><View style={styles.actions}><Button title="Nova conversa" onPress={onUsers} /><Button title="Novo grupo" onPress={onNewGroup} /><Button title="Atualizar" onPress={() => void refresh()} /></View>{loading ? <Loading /> : <FlatList data={items} keyExtractor={item => item.id} ListEmptyComponent={<Empty text="Nenhuma conversa ainda." />} renderItem={({ item }) => <Pressable style={styles.row} onPress={() => onOpen(item)}><Avatar uri={item.group?.photoUrl ?? item.photoUrl} /><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.muted}>{item.type === 'group' ? (item.group?.ownerId === uid ? 'Grupo · Você é proprietário' : 'Grupo · Integrante') : 'Conversa direta'}</Text></Pressable>} />}</Screen>;
}

export function UsersScreen({ uid, onBack, onOpen }: { uid: string; onBack: () => void; onOpen: (item: OpenConversation) => void }): React.JSX.Element {
  const [users, setUsers] = useState<DirectoryUser[]>([]); const [filter, setFilter] = useState(''); const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try { setUsers(await listOtherUsers(uid)); }
    catch (error) { setLoadError(errorText(error)); }
    finally { setLoading(false); }
  }, [uid]);
  useEffect(() => { void Promise.resolve().then(reload); }, [reload]);
  const filtered = useMemo(() => users.filter(item => `${item.name} ${item.email}`.toLowerCase().includes(filter.toLowerCase())), [filter, users]);
  const start = useCallback(async (other: DirectoryUser) => { try { const direct = await ensureDirectConversation(uid, other.id); onOpen({ id: direct.id, type: 'direct', title: other.name, otherUid: other.id, photoUrl: other.photoUrl }); } catch (error) { setLoadError(errorText(error)); } }, [onOpen, uid]);
  return <Screen style={styles.screen}><Back title="Usuários" onBack={onBack} /><Field label="Buscar" value={filter} onChange={setFilter} />{loadError && <Text accessibilityRole="alert" style={{ color: '#b91c1c' }}>{loadError}</Text>}<Button title="Recarregar usuários" disabled={loading} onPress={() => void reload()} /><FlatList data={filtered} keyExtractor={item => item.id} ListEmptyComponent={loading ? <Loading /> : loadError ? null : <Empty text="Nenhum usuário encontrado." />} renderItem={({ item }) => <Pressable style={styles.row} onPress={() => void start(item)}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.muted}>{item.email}</Text></Pressable>} /></Screen>;
}

export function GroupForm({ uid, onBack, onCreated }: { uid: string; onBack: () => void; onCreated: (item: OpenConversation) => void }): React.JSX.Element {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]); const [selected, setSelected] = useState<string[]>([]); const [name, setName] = useState(''); const [limitValue, setLimitValue] = useState('2'); const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  useEffect(() => { void listOtherUsers(uid).then(setUsers).catch(error => Alert.alert('Grupo', errorText(error))); }, [uid]);
  const create = useCallback(async () => { try { const memberIds = [uid, ...selected]; const memberLimit = Number(limitValue); const id = await createGroup({ name, photoUrl, ownerId: uid, memberIds, memberLimit, notificationPolicy: policy }); const group: Group = { id, name, photoUrl, ownerId: uid, memberIds, memberLimit, notificationPolicy: policy, createdAt: Date.now(), updatedAt: Date.now() }; onCreated({ id, type: 'group', title: name, group }); } catch (error) { Alert.alert('Grupo', errorText(error)); } }, [limitValue, name, onCreated, policy, selected, uid, photoUrl]);
  // Foto pode ser selecionada antes da criação e só sua URL é persistida.
  return (
    <Screen style={styles.screen}>
      <Back title="Novo grupo" onBack={onBack} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 32 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <PhotoPicker kind="groups" value={photoUrl} onChange={setPhotoUrl} />
        <Field label="Nome do grupo" value={name} onChange={setName} />
        <Field label="Limite" value={limitValue} onChange={setLimitValue} keyboard="number-pad" />
        <PolicyChooser value={policy} onChange={setPolicy} />
        <Text style={styles.label}>Selecione integrantes</Text>
        {users.map(item => (
          <Pressable key={item.id} style={styles.row} onPress={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}>
            <Text>{selected.includes(item.id) ? '☑' : '☐'} {item.name}</Text>
          </Pressable>
        ))}
        <Text style={styles.muted}>Integrantes: {selected.length + 1}; vagas: {Math.max(0, Number(limitValue || 0) - selected.length - 1)}</Text>
        <Button title="Criar grupo" onPress={() => void create()} />
      </ScrollView>
    </Screen>
  );
}

export function ChatScreen({ conversation, uid, onBack, onGroupSettings }: { conversation: OpenConversation; uid: string; onBack: () => void; onGroupSettings: () => void }): React.JSX.Element {
  const { messages, loading, error } = useMessages(conversation.id, conversation.type); const [text, setText] = useState(''); const [sending, setSending] = useState(false);
  const [targetUid, setTargetUid] = useState<string | null>(null);
  const [members, setMembers] = useState<DirectoryUser[]>([]);
  useEffect(() => { if (conversation.group) void Promise.all(conversation.group.memberIds.map(getUserProfile)).then(items => setMembers(items.filter((item): item is DirectoryUser => item !== null))).catch(() => undefined); }, [conversation.group]);
  useEffect(() => { if (error) Alert.alert('Chat', error); }, [error]);
  const submit = useCallback(async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    let message;
    try {
      message = await sendMessage({ conversationId: conversation.id, conversationType: conversation.type, senderId: uid, text: text.trim(), target: targetUid ? { type: 'member', memberId: targetUid } : generalTarget(), mentionedUserIds: targetUid ? [targetUid] : [] });
      setText('');
    } catch (sendError) {
      Alert.alert('Mensagem não enviada', `O texto foi preservado. ${errorText(sendError)}`);
      return;
    } finally {
      setSending(false);
    }
    try {
      await requestMessageNotification(message);
    } catch (notificationError) {
      Alert.alert('Mensagem enviada com sucesso', `A mensagem já está na conversa. Não é necessário reenviar. Apenas o aviso push falhou.\n\n${errorText(notificationError)}`);
    }
  }, [conversation.id, conversation.type, text, uid, targetUid, sending]);
  return <Screen style={styles.screen}>{error && <Text accessibilityRole="alert" style={{ color: '#b91c1c' }}>{error}</Text>}<View style={styles.header}><Back title={conversation.title} onBack={onBack} /><Pressable onPress={onGroupSettings}><Avatar uri={conversation.group?.photoUrl ?? conversation.photoUrl} /></Pressable></View>{loading ? <Loading /> : <FlatList data={messages} keyExtractor={item => item.id} ListEmptyComponent={<Empty text="Ainda não há mensagens." />} renderItem={({ item }) => <View style={[styles.bubble, item.senderId === uid ? styles.mine : styles.theirs]}>{conversation.type === 'group' && <Text style={styles.label}>{members.find(member => member.id === item.senderId)?.name ?? 'Integrante'}</Text>}<Text style={styles.messageText}>{item.text}</Text>{item.target.type === 'member' && <Text style={styles.muted}>Para: {members.find(member => member.id === (item.target.type === 'member' ? item.target.memberId : ''))?.name ?? 'Integrante'}</Text>}<Text style={styles.muted}>{new Date(item.createdAt).toLocaleTimeString()}</Text></View>} />}{conversation.type === 'group' && <ScrollView horizontal style={{ flexGrow: 0, maxHeight: 64 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}><Button title="Todos" onPress={() => setTargetUid(null)} />{members.filter(member => member.id !== uid).map(member => <Button key={member.id} title={`${targetUid === member.id ? '✓ ' : '@'}${member.name}`} onPress={() => setTargetUid(member.id)} />)}</ScrollView>}<View style={styles.composer}><TextInput style={styles.composerInput} placeholder="Mensagem" value={text} onChangeText={setText} multiline /><Button title={sending ? '...' : 'Enviar'} disabled={sending || loading || !!error} onPress={() => void submit()} /></View></Screen>;
}

export function GroupSettings({ group, uid, onBack, onUpdated, onProfile }: { group: Group; uid: string; onBack: () => void; onUpdated: (group: Group) => void; onProfile: (uid: string) => void }): React.JSX.Element {
  const [memberId, setMemberId] = useState(''); const [policy, setPolicy] = useState(group.notificationPolicy);
  const [name, setName] = useState(group.name); const [memberLimit, setMemberLimit] = useState(String(group.memberLimit));
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  useEffect(() => { void listOtherUsers(uid).then(setUsers).catch(() => undefined); }, [uid]);
  const change = async (changes: { name?: string; memberLimit?: number; removeMemberId?: string }): Promise<void> => {
    try { await editGroup(group.id, changes); const next = { ...group, ...(changes.name ? { name: changes.name } : {}), ...(changes.memberLimit ? { memberLimit: changes.memberLimit } : {}), memberIds: changes.removeMemberId ? group.memberIds.filter(id => id !== changes.removeMemberId) : group.memberIds }; onUpdated(next); } catch { Alert.alert('Grupo', 'Alteração recusada. Verifique limite, quantidade e permissões.'); }
  };
  const add = useCallback(async () => { try { await addGroupMember(group.id, uid, memberId); onUpdated({ ...group, memberIds: [...group.memberIds, memberId] }); setMemberId(''); } catch (error) { Alert.alert('Grupo', errorText(error)); } }, [group, memberId, onUpdated, uid]);
  const save = useCallback(async () => { try { await updateGroupPolicy(group.id, uid, policy); onUpdated({ ...group, notificationPolicy: policy }); } catch (error) { Alert.alert('Grupo', errorText(error)); } }, [group, onUpdated, policy, uid]);
  return <Screen style={styles.screen}><Back title="Grupo" onBack={onBack} /><ScrollView><Text style={styles.text}>{group.ownerId === uid ? 'Você é o proprietário' : 'Você é integrante'} · Integrantes: {group.memberIds.length}/{group.memberLimit} · Vagas: {group.memberLimit - group.memberIds.length}</Text>{group.memberIds.map(id => <View key={id} style={styles.row}><Button title={users.find(item => item.id === id)?.name ?? (id === uid ? 'Você' : 'Integrante')} onPress={() => onProfile(id)} />{group.ownerId === uid && id !== uid && <Button title="Remover" onPress={() => void change({ removeMemberId: id })} />}</View>)}{group.ownerId === uid ? <><Field label="Nome" value={name} onChange={setName} /><Field label="Limite" value={memberLimit} onChange={setMemberLimit} keyboard="number-pad" /><Button title="Salvar nome e limite" onPress={() => void change({ name, memberLimit: Number(memberLimit) })} /><PhotoButton id={group.id} kind="groups" /><Text style={styles.label}>Adicionar integrante</Text>{users.filter(item => !group.memberIds.includes(item.id)).map(item => <Pressable key={item.id} style={styles.row} onPress={() => setMemberId(item.id)}><Text>{item.id === memberId ? '✓ ' : ''}{item.name}</Text></Pressable>)}<Button title="Adicionar selecionado" disabled={!memberId || group.memberIds.length >= group.memberLimit} onPress={() => void add()} /><PolicyChooser value={policy} onChange={setPolicy} /><Button title="Salvar política" onPress={() => void save()} /></> : <Text style={styles.muted}>Somente o proprietário pode gerenciar.</Text>}</ScrollView></Screen>;
}

export function ProfileScreen({ uid, onBack }: { uid: string; onBack: () => void }): React.JSX.Element {
  const [profile, setProfile] = useState<DirectoryUser | null>(null); const [failed, setFailed] = useState(false);
  useEffect(() => { void getUserProfile(uid).then(setProfile).catch(() => setFailed(true)); }, [uid]);
  return <Screen style={styles.screen}><Back title="Perfil" onBack={onBack} />{profile ? <><Avatar uri={profile.photoUrl} /><Text style={styles.heading}>{profile.name}</Text><Text>E-mail: {profile.email || 'Indisponível'}</Text><Text>Celular: {profile.phoneNumber || 'Indisponível'}</Text><Text>Nascimento: {profile.birthDate || 'Indisponível'}</Text></> : failed ? <Text>Perfil indisponível ou sem permissão de acesso.</Text> : <Loading />}</Screen>;
}
function Avatar({ uri }: { uri?: string | null }): React.JSX.Element {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return uri && failedUri !== uri ? <Image source={{ uri }} style={styles.avatar} onError={() => setFailedUri(uri)} /> : <View accessibilityLabel="Avatar padrão" style={styles.avatarFallback}><Text style={styles.avatarText}>C</Text></View>;
}

function PhotoButton({ id, kind }: { id: string; kind: 'profiles' | 'groups' }): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => onSnapshot(doc(firestore, kind === 'profiles' ? 'users' : 'groups', id), snapshot => {
    const value: unknown = snapshot.data()?.photoUrl;
    setPhotoUrl(typeof value === 'string' ? value : null);
  }, () => setFeedback('Não foi possível carregar a foto atual.')), [id, kind]);
  const select = async (): Promise<void> => {
    try { setBusy(true); const uri = await chooseImage(); if (!uri) return; const photoUrl = await uploadImage(uri, kind); if (kind === 'groups') await editGroup(id, { photoUrl }); else await updateDoc(doc(firestore, 'users', id), { photoUrl }); setFeedback('Foto atualizada.'); }
    catch (error) { setFeedback(errorText(error)); }
    finally { setBusy(false); }
  };
  return <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><Avatar uri={photoUrl} /><Button title={busy ? 'Enviando foto...' : 'Selecionar foto'} disabled={busy} onPress={() => void select()} />{feedback && <Text accessibilityRole="alert" style={styles.muted}>{feedback}</Text>}</View>;
}
function PhotoPicker({ kind, value, onChange }: { kind: 'profiles' | 'groups'; value: string | null; onChange: (value: string) => void }): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const select = async (): Promise<void> => { try { setBusy(true); setFeedback(null); const uri = await chooseImage(); if (uri) onChange(await uploadImage(uri, kind)); } catch (error) { setFeedback(errorText(error)); } finally { setBusy(false); } };
  return <View><Avatar uri={value} /><Button title={busy ? 'Enviando...' : 'Escolher foto'} disabled={busy} onPress={() => void select()} />{feedback && <Text accessibilityRole="alert" style={{ color: '#b91c1c' }}>{feedback}</Text>}</View>;
}
function PolicyChooser({ value, onChange }: { value: NotificationPolicy; onChange: (value: NotificationPolicy) => void }): React.JSX.Element {
  const labels: Record<NotificationPolicy, string> = { all_group_messages: 'Todas as mensagens do grupo', mentioned_members: 'Somente integrantes mencionados', direct_messages_only: 'Somente conversas individuais', disabled: 'Notificações desativadas' };
  return <View><Text style={styles.label}>Política de notificação</Text>{policies.map(policy => <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === policy }} key={policy} style={[styles.choice, value === policy && styles.choiceSelected]} onPress={() => onChange(policy)}><Text style={value === policy ? styles.choiceSelectedText : styles.text}>{value === policy ? '●' : '○'} {labels[policy]}</Text></Pressable>)}</View>;
}
function Field({ label, value, onChange, secure, keyboard }: { label: string; value: string; onChange: (value: string) => void; secure?: boolean; keyboard?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' }): React.JSX.Element { return <View><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChange} secureTextEntry={secure} keyboardType={keyboard} autoCapitalize="none" /></View>; }
function Back({ title, onBack }: { title: string; onBack: () => void }): React.JSX.Element { return <View style={styles.back}><Button title="‹" onPress={onBack} /><Text numberOfLines={2} style={styles.heading}>{title}</Text></View>; }
export function Loading(): React.JSX.Element { return <View style={styles.loading}><ActivityIndicator size="large" color="#12856b" /></View>; }
function Empty({ text }: { text: string }): React.JSX.Element { return <View style={styles.loading}><Text style={styles.muted}>{text}</Text></View>; }
export function SetupNotice(): React.JSX.Element { return <Screen style={styles.screen}><Text style={styles.heading}>Configure o Firebase</Text><Text style={styles.text}>Preencha firebaseConfig.json para habilitar o aplicativo.</Text></Screen>; }
const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%', maxWidth: 960, alignSelf: 'center', backgroundColor: '#f3f8ff', padding: 20, gap: 14 },
  auth: { flexGrow: 1, width: '100%', maxWidth: 460, alignSelf: 'center', justifyContent: 'center', gap: 14, paddingVertical: 30 },
  brandMark: { width: 62, height: 62, borderRadius: 20, backgroundColor: '#008754', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  brand: { fontSize: 34, fontWeight: '800', color: '#0746ad', letterSpacing: -1 },
  tagline: { color: '#49706f', fontSize: 16, marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: '700', flexShrink: 1, color: '#073b86' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingBottom: 16, borderBottomWidth: 2, borderColor: '#b8d6ef' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: { borderColor: '#c9dde2', borderWidth: 1, backgroundColor: '#fff', color: '#183a4a', borderRadius: 14, padding: 14, fontSize: 16, minHeight: 48 },
  label: { marginBottom: 7, marginTop: 6, fontWeight: '600', color: '#254f60' },
  link: { color: '#006a43', textAlign: 'center', marginTop: 10, paddingVertical: 6, fontWeight: '600' },
  text: { fontSize: 16, color: '#325d69', lineHeight: 24 },
  muted: { color: '#51717a', fontSize: 12, lineHeight: 19 },
  row: { padding: 16, borderWidth: 1, borderColor: '#bcd4ed', borderRadius: 16, backgroundColor: '#fff', marginVertical: 5, gap: 4 },
  rowTitle: { fontSize: 17, fontWeight: '700', color: '#0746ad' },
  loading: { flex: 1, minHeight: 90, justifyContent: 'center', alignItems: 'center', padding: 20 },
  list: { flex: 1 },
  choice: { padding: 12, borderRadius: 12, backgroundColor: '#e4edff', marginVertical: 3 },
  choiceSelected: { backgroundColor: '#0756d6', borderWidth: 1, borderColor: '#0756d6' },
  choiceSelectedText: { color: '#ffffff', fontSize: 16, lineHeight: 24, fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: '#d5e5e9', paddingTop: 12, paddingBottom: 8 },
  composerInput: { flex: 1, minWidth: 0, backgroundColor: '#fff', color: '#183a4a', borderWidth: 1, borderColor: '#c9dde2', borderRadius: 18, padding: 14, maxHeight: 120 },
  bubble: { padding: 14, borderRadius: 18, marginVertical: 5, maxWidth: '88%', gap: 4 },
  mine: { backgroundColor: '#acebcf', borderWidth: 1, borderColor: '#13a66c', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  theirs: { backgroundColor: '#ccdefe', borderWidth: 1, borderColor: '#6899ef', alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  messageText: { fontSize: 16, lineHeight: 24, color: '#102f4c', flexShrink: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 52, height: 52, borderRadius: 18, borderWidth: 2, borderColor: '#c4e6dc' },
  avatarFallback: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#c7f2dc', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#008754' },
});
