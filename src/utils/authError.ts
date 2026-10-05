export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Este e-mail já possui uma conta. Entre ou use outro e-mail para cadastrar.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/operation-not-allowed': 'Habilite E-mail/senha no Authentication deste projeto Firebase.',
    'auth/network-request-failed': 'Não foi possível conectar ao Firebase. Verifique sua conexão.',
    'permission-denied': 'O Firestore recusou a criação do perfil. Publique firestore.rules no banco (default) do mesmo projeto do aplicativo.',
    'unavailable': 'Firestore indisponível. Verifique a conexão e se o banco foi criado.',
    'auth/invalid-api-key': 'A configuração pública do Firebase possui uma API key inválida.',
  };
  if (messages[code]) return messages[code];
  if (error instanceof Error && !code) return error.message;
  return `Não foi possível concluir o cadastro/login${code ? ` (${code})` : ''}.`;
}
