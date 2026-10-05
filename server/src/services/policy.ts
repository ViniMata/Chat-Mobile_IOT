export type Policy = 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';
export function recipients(members: string[], sender: string, type: 'direct' | 'group', policy: Policy, mentioned: string[] = []): string[] {
  if (!members.includes(sender) || policy === 'disabled' || (type === 'group' && policy === 'direct_messages_only')) return [];
  const selected = type === 'group' && policy === 'mentioned_members' ? mentioned : members;
  return [...new Set(selected)].filter(uid => uid !== sender && members.includes(uid));
}
