import { auth } from './firebase';

export async function apiRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const base = process.env.EXPO_PUBLIC_NOTIFICATION_API_URL;
  if (!base) throw new Error('EXPO_PUBLIC_NOTIFICATION_API_URL não está configurada no .env da raiz. Reinicie o Expo após preencher.');
  if (!auth.currentUser) throw new Error('Sessão ausente. Entre novamente.');
  const token = await auth.currentUser.getIdToken();
  let response: Response;
  try { response = await fetch(`${base.trim().replace(/\/+$/, '')}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
  catch { throw new Error('Não foi possível conectar à API. Confira a URL, o servidor e a conexão.'); }
  if (!response.ok) {
    if (response.status === 401) throw new Error('API recusou a sessão (401). Entre novamente e confira se a API usa o mesmo projeto Firebase.');
    if (response.status === 403) throw new Error('Operação sem permissão (403).');
    if (response.status === 404) throw new Error('Rota da API não encontrada (404). Reinicie o servidor com o código atualizado.');
    throw new Error(`API recusou a operação (HTTP ${response.status}). Confira as permissões da conta de serviço e os logs do servidor.`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}
