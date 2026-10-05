import { test } from 'node:test';
import { deepStrictEqual } from 'node:assert';
import { recipients } from './policy.js';
test('grupo: todos, sem remetente e sem duplicatas', () => deepStrictEqual(recipients(['a','b','b'], 'a', 'group', 'all_group_messages'), ['b']));
test('menções: rejeita não participante', () => deepStrictEqual(recipients(['a','b'], 'a', 'group', 'mentioned_members', ['a','b','intruso']), ['b']));
test('disabled bloqueia conversa direta', () => deepStrictEqual(recipients(['a','b'], 'a', 'direct', 'disabled'), []));
test('direct_messages_only bloqueia grupos', () => deepStrictEqual(recipients(['a','b'], 'a', 'group', 'direct_messages_only'), []));
test('direct_messages_only permite direto', () => deepStrictEqual(recipients(['a','b'], 'a', 'direct', 'direct_messages_only'), ['b']));
test('remetente removido não gera push', () => deepStrictEqual(recipients(['b','c'], 'a', 'group', 'all_group_messages'), []));
