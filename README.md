# Connect Chat

Aplicativo acadêmico de chat individual e em grupo, desenvolvido com React Native, Expo e TypeScript. Usa Firebase Authentication para autenticação, Firestore para perfis e conversas, Realtime Database para mensagens e Cloudinary para fotos.

## Integrantes

Preencher antes da entrega: nomes completos e RMs de todos os integrantes. Segundo o enunciado, a ausência dessa identificação implica nota zero.

| Nome completo | RM |
| --- | --- |
| A preencher | A preencher |

## Funcionalidades

- Cadastro, login, recuperação de senha e persistência de sessão.
- Perfis com foto, nome, celular e nascimento.
- Conversas diretas e mensagens em tempo real.
- Grupos com proprietário, limite de integrantes e gerenciamento pela API.
- Fotos de perfil e grupo hospedadas externamente.
- Políticas de push: todas as mensagens do grupo, membros mencionados, apenas conversas diretas ou desativado.
- Autorização por participante e acesso protegido a perfis.

## Tecnologias e responsabilidades

| Tecnologia | Uso no projeto |
| --- | --- |
| React Native 0.86.3 e React 19.2.3 | Interface mobile e componentes |
| Expo SDK 57 (`~57.0.26`) | Execução e integração com recursos nativos; atende SDK 55+ |
| TypeScript | Tipagem do cliente e servidor; ESLint proíbe `any` explícito |
| Firebase Authentication | Cadastro e login exclusivamente por e-mail/senha, recuperação de senha e identificação por `uid` |
| Cloud Firestore | Perfis, grupos, conversas diretas, dispositivos, reservas de notificações e locks |
| Firebase Realtime Database | Persistência e listeners das mensagens; espelho de autorização por conversa |
| Expo Notifications / Expo Push Service | Permissões, registro de token e encaminhamento de push |
| FCM / APNs | Transporte nativo de push Android / iOS, dependente das credenciais da build |
| Cloudinary e Expo Image Picker | Seleção e hospedagem externa das fotos |
| Node.js, Express 5 e Firebase Admin SDK | API própria autenticada; validações e envio seguro de notificações |
| Render | Hospedagem escolhida para a API HTTPS |

`useState` mantém formulários e seleção; `useEffect` observa sessão e listeners; `useMemo` calcula a lista filtrada de usuários; `useCallback` mantém callbacks dos fluxos. O hook `useMessages` reúne sincronização de acesso e observação do histórico. A navegação é controlada em `App.tsx`.

### Pré-requisitos de desenvolvimento

Node.js e npm, projeto Firebase com Authentication (e-mail/senha), Firestore e Realtime Database, além de um preset unsigned de imagens no Cloudinary. Push remoto requer configuração EAS/FCM/APNs e build próprio compatível; executar o app no Expo Go não comprova entrega de push.

## Configuração

1. Preencha `firebaseConfig.json` com a configuração pública do SDK Firebase, incluindo a URL do Realtime Database.
2. Publique `firestore.rules` e `database.rules.json` no mesmo projeto Firebase.
3. Copie `.env.example` para `.env` na raiz e configure:

```dotenv
EXPO_PUBLIC_NOTIFICATION_API_URL=https://SUA-API.onrender.com
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=SEU_CLOUD
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=SEU_PRESET
```

4. Para executar a API local, copie `server/.env.example` para `server/.env` e preencha as credenciais administrativas e a URL do banco. Não coloque essas credenciais no aplicativo.

### Firebase

No Firebase Console, habilite Authentication → E-mail/senha, crie o Cloud Firestore e o Realtime Database no mesmo projeto. Registre um aplicativo Web para obter a configuração pública em `firebaseConfig.json`. Os perfis são criados pelo cadastro do aplicativo; criar apenas uma conta no Console não cria seu documento de perfil.

Publique as regras pelo Console ou pela CLI:

```bash
npx firebase-tools deploy --only firestore:rules,database --project SEU_PROJECT_ID
```

A URL do RTDB no cliente e em `FIREBASE_DATABASE_URL` da API deve apontar para o mesmo banco. Se a consulta de recibos solicitar um índice de coleção-grupo `devices` no campo `token`, crie o índice indicado pelo Firestore.

### Fotos no Cloudinary

Crie um upload preset **unsigned** no painel do Cloudinary, restrito a imagens e com limite de tamanho, e configure seu cloud name e preset nas variáveis públicas do app. Não coloque API Secret no cliente. A seleção solicita permissão de fotos quando necessária. O arquivo é enviado ao Cloudinary; apenas `photoUrl` HTTPS fica no Firestore, nunca Base64 ou o binário. O avatar padrão é exibido quando não há imagem ou quando seu carregamento falha.

O guia completo está em [CONFIGURACAO_E_ENTREGA.md](CONFIGURACAO_E_ENTREGA.md).

## Executar o aplicativo

Na raiz:

```bash
npm ci
npx expo start --clear
```

No PowerShell, se scripts estiverem bloqueados, use `npm.cmd` e `npx.cmd`.

Abra no navegador ou escaneie o QR Code com um Expo Go compatível. Para API local no celular, use `http://IP_DO_COMPUTADOR:3000`, não `localhost`, e mantenha ambos na mesma rede. Reinicie o Expo após alterar o `.env`. Builds já instalados precisam receber nova build ou atualização com a configuração alterada.

## Executar a API local

Em outro terminal:

```bash
cd server
npm ci --include=dev
npm run dev
```

Teste `http://localhost:3000/health`. Essa rota confirma disponibilidade HTTP, não o funcionamento completo do Firebase ou do push.

## Publicar a API no Render

Crie um Web Service conectado ao repositório:

| Campo | Valor |
| --- | --- |
| Root Directory | `server` |
| Build Command | `npm ci --include=dev` |
| Start Command | `npm start` |

Cadastre no painel as variáveis de `server/.env.example`. Não envie arquivos privados ao GitHub. Configure no `.env` da raiz a URL HTTPS resultante, sem `/health`. O plano gratuito pode suspender a API quando ociosa, atrasando o primeiro acesso e pausando o processamento periódico de recibos.

**URL pública da API:** preencher com a URL real do serviço publicado.

**Repositório:** [ViniMata/Chat-Mobile_IOT](https://github.com/ViniMata/Chat-Mobile_IOT).

### Variáveis exclusivas do servidor

| Nome | Finalidade |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Projeto usado pelo Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Identidade da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | Chave privada, cadastrada exclusivamente como segredo |
| `FIREBASE_DATABASE_URL` | Endereço do Realtime Database |
| `PORT` | Porta HTTP; na hospedagem, usar a fornecida pelo provedor |
| `EXPO_ACCESS_TOKEN` | Autorização opcional do serviço Expo Push |

O professor não deve iniciar servidor local, configurar segredos ou fazer deploy. A equipe deve manter a API pronta e disponível durante toda a correção, com permissões administrativas mínimas necessárias.

### Endpoints da API

Com exceção de `/health`, os endpoints exigem `Authorization: Bearer <Firebase ID Token>`.

| Método e caminho | Responsabilidade |
| --- | --- |
| `GET /health` | Disponibilidade HTTP; resposta `{"status":"ok"}` |
| `GET /users` | Diretório mínimo de usuários, sem o usuário autenticado |
| `GET /users/:uid` | Perfil próprio ou de participante de conversa/grupo em comum |
| `POST /direct-conversations` | Localiza ou cria conversa com `otherUid` |
| `POST /conversation-access/sync` | Valida participação e sincroniza autorização RTDB; recebe `conversationId` e `type` |
| `PATCH /groups/:id` | Proprietário altera nome, foto, limite, política ou integrantes |
| `POST /notifications/messages` | Valida mensagem e calcula destinatários; recebe `conversationId` e `messageId` |

## Configuração e funcionamento do push

O fluxo é: persistir mensagem no RTDB → solicitar push à API com ID Token → validar remetente e mensagem → consultar participantes e política no Firestore → enviar pelo Expo Push Service → FCM no Android ou APNs no iOS. Não há Cloud Functions nem credenciais administrativas no mobile. Alertas da interface não são evidência de push remoto.

### Android

1. Vincule o projeto à conta EAS e configure `extra.eas.projectId` e `android.package` em `app.json`.
2. Registre esse identificador como aplicativo Android no Firebase e configure `android.googleServicesFile` com o arquivo cliente correspondente.
3. Configure credenciais de envio **FCM v1** no EAS, mantendo a chave administrativa fora do repositório e do app.
4. Gere e instale uma build própria, conceda permissão de notificações e confirme registro do dispositivo.

### iOS

1. Configure `ios.bundleIdentifier` e o mesmo projeto EAS.
2. Configure assinatura/provisionamento e chave de push APNs no EAS, com acesso Apple Developer apropriado.
3. Instale a build em um iPhone e conceda permissão de notificações.

Para uma development build, instale `expo-dev-client` antes de gerar a build e use o perfil `development` de `eas.json`. Configure as variáveis públicas também no ambiente de build. Consulte o [guia oficial de push](https://docs.expo.dev/push-notifications/push-notifications-setup/) e o [guia de builds](https://docs.expo.dev/build/setup/). As configurações e os testes físicos ainda precisam ser concluídos e comprovados pela equipe.

### Políticas de destinatários

| Política | Comportamento |
| --- | --- |
| `all_group_messages` | Notifica integrantes ativos do grupo, exceto o remetente |
| `mentioned_members` | Notifica somente integrantes selecionados/mencionados, exceto o remetente |
| `direct_messages_only` | Não notifica mensagens do grupo; conversas diretas continuam com push |
| `disabled` | Não gera push para mensagens do grupo configurado |

As políticas são configuradas por grupo; conversas diretas notificam o outro participante. O servidor calcula os destinatários, não confia em lista fornecida pelo cliente, reserva o envio por mensagem para evitar duplicatas e desativa dispositivos identificados como inválidos. O payload inclui `conversationId` e `conversationType`; tocar no push solicita abertura da conversa após validar acesso.

## Modelo de dados e organização

| Local | Conteúdo |
| --- | --- |
| Firestore `users/{uid}` | Nome, e-mail, celular, nascimento, URL da foto e criação |
| Firestore `users/{uid}/devices/{deviceId}` | Token, plataforma, estado habilitado e atualização |
| Firestore `groups/{groupId}` | Nome, foto, proprietário, integrantes, limite, política e datas |
| Firestore `directConversations/{id}` | Dois participantes e data de criação; ID com UIDs ordenados |
| Firestore `conversationLocks`, `notificationDeliveries`, `pushReceipts` | Serialização, idempotência e acompanhamento de push; acesso pelo servidor |
| RTDB `messages/{conversationId}/{messageId}` | Texto, remetente, tipo, destino, menções e data |
| RTDB `conversationAccess/{conversationId}/{uid}` | Autorização espelhada pela API |

```text
App.tsx                     Sessão e navegação
src/components/             Componentes reutilizáveis e layout
src/screens/screens.tsx     Telas e fluxos
src/hooks/useMessages.ts    Histórico em tempo real
src/services/               Firebase, autenticação, chat, grupos, fotos e push
src/types/                  Tipos de domínio
src/utils/                  Tratamento de erros
server/src/app.ts           Rotas e autenticação da API
server/src/services/        Grupos, locks, autorização e notificações
firestore.rules             Regras Firestore
database.rules.json         Regras RTDB
firebaseConfig.json         Configuração pública obrigatória do cliente
.env.example                Variáveis do aplicativo, com valores fictícios
server/.env.example         Variáveis da API, sem segredos reais
```

## Segurança e proteção do limite de grupos

As regras de [Firestore](firestore.rules) permitem acesso aos próprios dados/dispositivos e leitura de conversas/grupos por participantes. A criação de grupo exige proprietário integrante, membros únicos, mínimo de dois e quantidade dentro do limite. Alterações de grupos pelo cliente são bloqueadas e passam pela API. A API libera o perfil completo de outro usuário apenas quando há conversa ou grupo em comum.

As regras do [Realtime Database](database.rules.json) exigem autorização em `conversationAccess` para ler e enviar mensagens e verificam `senderId` contra o usuário autenticado. O cliente não pode editar esse espelho; somente a API o atualiza.

Para alterações de integrantes e limite, a API adquire um lock persistente da conversa e executa uma transação Firestore que verifica proprietário, membros e capacidade atual. O limite inclui o proprietário, não pode ficar abaixo da quantidade de integrantes e não depende apenas de botão desabilitado. Requisições concorrentes são serializadas ou rejeitadas para nova tentativa. Na remoção, o acesso RTDB é revogado antes da alteração e o espelho é reconciliado ao terminar. Não há transação atômica entre os dois bancos; falhas de processo podem exigir reconciliação operacional conforme o guia. A proteção ainda requer teste de concorrência para comprovação.

## Prints e evidências para avaliação

Não há capturas de execução ou evidência de push no repositório neste momento. Adicionar capturas reais, com dados pessoais de teste, e incorporar suas imagens nesta seção antes de entregar:

| Evidência | O que deve demonstrar |
| --- | --- |
| Login e cadastro | Campos exigidos e autenticação |
| Conversas e usuários | Diretos, grupos e busca |
| Chat direto e grupo | Envio, recebimento, autoria e sincronização |
| Criação/edição do grupo | Foto, limite, vagas, política e ações do proprietário |
| Perfil | Foto e dados cadastrais autorizados |
| Push Android e iOS | Notificação remota recebida em build própria |
| Toque no push | Abertura da conversa correta |
| API pública | `/health` acessível e operação sem servidor local |

## Entrega no Microsoft Teams

Enviar na tarefa indicada pelo professor o link do GitHub e a URL HTTPS da API. Manter repositório acessível e API disponível durante toda a correção. Máximo de cinco integrantes. Preencher nomes/RMs, URL pública e evidências reais antes do envio; a documentação não substitui a validação funcional de push ou dos demais requisitos.

## Verificações automatizadas

Na raiz:

```bash
npm run typecheck
npm run lint
```

Na pasta `server`:

```bash
npm run typecheck
npm test
```

## Roteiro de teste e evidências

- Cadastre dois usuários e confirme seus perfis no Firestore.
- Teste login, logout, recuperação de senha e restauração de sessão.
- Abra a mesma conversa direta pelos dois usuários; confirme que não foi duplicada.
- Envie mensagens nos dois sentidos; reabra o chat e confira o histórico.
- Crie um grupo, teste proprietário após novo login, limite e remoção de integrantes.
- Confirme que integrante removido não consegue ler ou enviar mensagens.
- Teste fotos e fallback quando a imagem não carregar.
- Teste as quatro políticas de push em builds próprios e a abertura da conversa ao tocar na notificação.
- Com a API local desligada, repita os testes usando a API HTTPS pública.
- Adicione prints, evidências de push e links de entrega neste README.

Mensagem gravada e solicitação de push são etapas distintas. Se o aviso push falhar, não reenvie a mensagem que já aparece no histórico.

## Segurança e limitações

Configurações públicas Firebase podem ser versionadas. `.env`, chaves privadas e JSON de conta de serviço não podem. Credenciais administrativas ficam somente no servidor e nos secrets da hospedagem. Revogue qualquer chave exposta.

Os testes unitários e exports não substituem validação física Android/iOS, testes das regras no Emulator ou testes de concorrência. A auditoria está em [AUDIT.md](AUDIT.md). Idempotência de push sem recuperação automática e locks persistentes após falha de processo ainda têm limitações operacionais, documentadas no guia de entrega.
