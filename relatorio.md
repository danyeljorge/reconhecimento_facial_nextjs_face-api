# 📋 Relatório de Refatoração Arquitetural do MVP

**Projeto:** Sistema de Reconhecimento Facial & Controle de Acesso com Liveness  
**Data:** 30 de Setembro de 2026  
**Status:** Concluído com Sucesso & Build Validado  

---

## 1. Sumário Executivo & Motivação

O objetivo desta refatoração foi transformar a estrutura inicial do MVP em uma arquitetura limpa, escalável e com **separação estrita de responsabilidades (SoC - Separation of Concerns)**, sem reconstruir o projeto do zero e preservando rigorosamente todas as funcionalidades em operação:
- Login por CPF e Senha;
- Cadastro de usuários com validações completas (CPF com algoritmo de dígitos verificadores, SIAP, e-mail, senhas);
- Sessões seguras com cookies HTTP-Only e hashing criptográfico (PBKDF2/SHA256);
- Dashboard com abas de Reconhecimento/Câmera, Extrato financeiro e Perfil;
- Painel administrativo de gerenciamento de cadastros (`/cadastros`);
- Validação biométrica de Vivacidade (*Liveness / Proof of Life*) com detecção de ataques de apresentação (*Anti-Spoofing / PAD*).

### Mudança Fundamental no Papel da Biometria Facial
No modelo original de MVP, o sistema herdava rotinas de reconhecimento facial 1:N (busca por `faceDescriptor` de 128 dimensões com distância euclidiana e `FACE_MATCH_THRESHOLD`). No entanto, o requisito de negócio real da aplicação estabelece:
1. **Identificação e Autenticação:** Feitas estritamente por **CPF + Senha**.
2. **Biometria:** Utilizada exclusivamente como **barreira de vivacidade e presença física (Liveness / Anti-Spoofing)**, não para descobrir "quem é o usuário".

A refatoração removeu o acoplamento com descritores de 128D no fluxo principal e organizou o código em camadas modulares e testáveis.

---

## 2. Visão da Arquitetura: Antes vs. Depois

### 2.1 Cenário Anterior (Acoplado)
```text
[Frontend / Componentes React]
   │
   ├─► Chamada a rotas /api
   │     └─► [Route Handlers executando prisma.* diretamente]
   │
   └─► [face-api.js / face-recognition.ts]
         └─► Mistura de carregamento de redes, cálculo de EAR/Yaw,
             decisões de desafio e comparação de descriptors 128D
```
*Problemas identificados:*
- Rotas de API manipulavam diretamente o Prisma Client e regras de negócio no mesmo bloco de código.
- Validação de pessoas exigia obrigatoriamente um vetor de 128 números de ponto flutuante, travando cadastros normais.
- Acesso à câmera, manipulação de redes neurais do `face-api.js` e regras de vivacidade estavam concentrados em arquivos híbridos.

---

### 2.2 Cenário Refatorado (Em Camadas)

A aplicação foi organizada em duas trilhas arquiteturais bem delimitadas:

#### Trilha A: Fluxo de Aplicação e Persistência de Dados
```text
FRONTEND (Páginas, Componentes, Hooks, Formulários)
   ↓
API ROUTE HANDLERS (app/api/**)
   ↓
CONTROLLERS (lib/controllers/**)
   ↓
SERVICES (lib/services/**)
   ↓
REPOSITORIES (lib/repositories/**)
   ↓
PRISMA CLIENT (lib/prisma.ts)
   ↓
DATABASE (SQLite - prisma/dev.db)
```

#### Trilha B: Fluxo de Visão Computacional e Liveness
```text
CAMERA SERVICE (lib/camera/camera-service.ts)
   ↓
FACE ENGINE (lib/face-engine/face-engine.ts) [Isola face-api.js]
   ↓
LIVENESS SERVICE (lib/services/liveness-service.ts) [Avaliação PAD e Desafios]
   ↓
LIVENESS CONTROLLER (lib/controllers/liveness-controller.ts)
   ↓
FRONTEND COMPONENT (components/LivenessSecurityVerification.tsx)
```

---

## 3. Detalhamento das Camadas Implementadas

### 3.1 Camada de Tipos e Contratos (`lib/types/`)
Centralização de interfaces compartilhadas e Data Transfer Objects (DTOs), eliminando tipagens redundantes e isolando dados internos de entidades públicas.

- **`lib/types/user.ts`**: Define `UserDTO`, `UserProfileDTO`, `UserStatementDTO`, `CreateUserDTO`, `UpdateUserDTO` e `IUserRepository`.
- **`lib/types/auth.ts`**: Define `LoginCredentials`, `AuthSessionData`, `AuthResult`, `UserRegistrationData` e `IAuthService`.
- **`lib/types/liveness.ts`**: Define `FaceDetectionFrame`, `LivenessVerificationResult`, `LivenessChallengeType`, `ChallengeStep`, `ILivenessService`, `IFaceEngine` e `ICameraService`.
- **`lib/types/index.ts`**: Barrel de exportação centralizada de tipos.

### 3.2 Camada de Repositórios (`lib/repositories/`)
Encapsula integralmente o acesso ao banco de dados e ao Prisma ORM. Nenhuma página, componente ou rota de API acessa o Prisma diretamente.

- **`lib/repositories/user-repository.ts`**:
  - Implementa `IUserRepository`.
  - Métodos: `findById`, `findByCpf`, `findByEmail`, `findBySiap`, `findAll`, `create`, `update`, `delete`, `updateFaceImage`, `count`.
- **`lib/repositories/person-repository.ts`**:
  - Implementa `IPersonRepository` para isolar registros legados de person/faceDescriptor.
  - Métodos: `findAll`, `findById`, `findByName`, `create`, `delete`, `count`.
- **`lib/repositories/index.ts`**: Exporta instâncias singleton (`userRepository`, `personRepository`).

### 3.3 Camada de Serviços de Negócio (`lib/services/`)
Concentra regras de negócio, transformações de dados e lógica de decisão.

- **`lib/services/auth-service.ts`**:
  - Responsável por autenticação de credenciais (CPF + Senha com PBKDF2), criação e validação de tokens HMAC-SHA256, gerenciamento de cookies de sessão (`auth_token`) e registro seguro de usuários.
  - Injeta dependência de `IUserRepository`.
- **`lib/services/user-service.ts`**:
  - Responsável pela montagem de perfis (`UserProfileDTO`), extrato financeiro e histórico de acessos simulados (`UserStatementDTO`), atualização de foto biométrica e regras administrativas de cadastro.
  - Injeta dependência de `IUserRepository`.
- **`lib/services/liveness-service.ts`**:
  - Responsável unicamente pela verificação de vivacidade e detecção de ataques de apresentação (PAD).
  - Gera sequências dinâmicas de desafios (*look_center*, *blink_twice*, *turn_left*, *turn_right*, *smile*, *return_center*).
  - Avalia métricas biométricas temporais: EAR (*Eye Aspect Ratio*), Head Yaw Ratio, variância temporal (jitter biológico involuntário) para barrar fotos estáticas e telas digitais.
  - **Retorno estrito de presença:** Retorna `{ success, livenessPassed, spoofDetected, challengesCompleted }`, sem qualquer identificação de identidade de usuário.
- **`lib/services/face-service.ts`**:
  - Facade leve mantido para compatibilidade com carregamento assíncrono de modelos do navegador.

### 3.4 Camada de Visão Computacional e Câmera (`lib/camera/` & `lib/face-engine/`)
Isola bibliotecas externas para permitir substituição futura sem impacto na aplicação.

- **`lib/camera/camera-service.ts`**:
  - Implementa `ICameraService`.
  - Gerencia o ciclo de vida do `MediaStream` da webcam (inicialização, resolução ideal, interrupção de tracks e captura de snapshot em base64/JPEG).
- **`lib/face-engine/face-engine.ts`**:
  - Implementa `IFaceEngine`.
  - Encapsula o `@vladmandic/face-api`. Carrega os modelos neurais pré-treinados (`tinyFaceDetector`, `faceLandmark68Net`, `faceExpressionNet`) e normaliza a detecção de cada frame em uma estrutura agnóstica (`FaceDetectionFrame`), contendo caixa delimitadora, 68 marcos anatômicos, expressão e score de confiança.

### 3.5 Camada de Controladores (`lib/controllers/`)
Coordena a entrada de dados (HTTP Request / DTO), orquestra as chamadas aos serviços e produz a resposta apropriada (HTTP Response).

- **`lib/controllers/auth-controller.ts`**:
  - Métodos: `login(req)`, `register(req)`, `session(req)`, `logout(req)`.
  - Trata cookies de sessão HTTP-Only e códigos de status HTTP (200, 201, 400, 401, 409, 500).
- **`lib/controllers/user-controller.ts`**:
  - Métodos: `getProfile(req)`, `getStatement(req)`, `updateFace(req)`, `listUsers(req)`, `getUserById(id)`, `createUser(req)`, `updateUser(id, req)`, `deleteUser(id)`.
- **`lib/controllers/liveness-controller.ts`**:
  - Métodos: `startSession()`, `evaluateFrame(history, current)`, `verifySession(history)`.

### 3.6 Camada de Rotas de API (`app/api/**`)
Todas as rotas foram transformadas em delegadores limpos de uma linha para os respectivos controllers:
- `app/api/auth/login/route.ts` ➔ `authController.login(req)`
- `app/api/auth/register/route.ts` ➔ `authController.register(req)`
- `app/api/auth/session/route.ts` ➔ `authController.session(req)`
- `app/api/auth/logout/route.ts` ➔ `authController.logout(req)`
- `app/api/user/profile/route.ts` ➔ `userController.getProfile(req)`
- `app/api/user/statement/route.ts` ➔ `userController.getStatement(req)`
- `app/api/user/face/route.ts` ➔ `userController.updateFace(req)`
- `app/api/cadastros/route.ts` ➔ `userController.listUsers(req)` e `userController.createUser(req)`
- `app/api/cadastros/[id]/route.ts` ➔ `userController.getUserById/updateUser/deleteUser`
- `app/api/persons/**` ➔ Operações delegadas para `personRepository`.

---

## 4. Remoção de Dependências Legadas de Reconhecimento 1:N

| Item Legado | Situação Anterior | Situação Atual Refatorada |
| :--- | :--- | :--- |
| **`compareFace()`** | Comparava vetores euclidianos de 128 dimensões para autenticar usuário | **Removido do fluxo de autenticação.** Autenticação é exclusivamente por CPF e Senha. |
| **`FACE_MATCH_THRESHOLD`** | Threshold rígido (0.55) para matching de identidade | **Removido.** A decisão biométrica agora avalia vivacidade (EAR < 0.238, rotação Yaw, variância temporal). |
| **Validação de 128D em `lib/validation.ts`** | Função `validatePerson` exigia vetor de 128 floats, falhando em validações normais | **Refatorado.** Validação agora aceita registros normais de dados e validações estruturais de cadastro. |
| **Acoplamento Direto do Prisma** | Chamadas `prisma.user.*` espalhadas em 8 rotas de API | **Isolado.** Zero chamadas diretas fora de `lib/repositories/`. |

---

## 5. Auditoria de Código e Verificação de Não-Regressão

### 5.1 Auditoria do Prisma ORM
Foi executada varredura global no diretório `app/` e `components/`:
- **Resultado:** Nenhuma importação de `prisma` ou `db` nas camadas de apresentação, componentes ou rotas de API.
- Todo o tráfego de persistência flui exclusivamente por `UserRepository` e `PersonRepository`.

### 5.2 Testes Automatizados Executados
Foram executados scripts de validação de ponta a ponta:

1. **`node scripts/test-mvp-flow.mjs`**:
   - Validação algorítmica de CPF com cálculo de dígitos verificadores: **OK**
   - Hashing seguro PBKDF2 e comparação constante: **OK**
   - Criação e decodificação de tokens de sessão HMAC-SHA256: **OK**
   - Consulta e sanitização de dados no banco SQLite: **OK**
   - **Resultado:** 100% de sucesso.

2. **`node scripts/test-architecture-flow.mjs`**:
   - Criação de instâncias dos Repositórios: **OK**
   - Execução do `AuthService` e geração de DTOs: **OK**
   - Execução do `UserService` e montagem do perfil: **OK**
   - Execução do `LivenessService` (geração de desafios, verificação temporal e rejeição de foto estática): **OK**
   - Execução dos Controllers (`AuthController`, `UserController`, `LivenessController`): **OK**
   - **Resultado:** 100% de sucesso.

3. **`npm run build`**:
   - Compilação estática do Next.js 14.2 com TypeScript e geração de rotas:
   ```text
   Route (app)                              Size     First Load JS
   ┌ ○ /                                    30.7 kB         135 kB
   ├ ○ /_not-found                          873 B           105 kB
   ├ ○ /~offline                            380 B           104 kB
   ├ ƒ /api/auth/login                      0 B                0 B
   ├ ƒ /api/auth/logout                     0 B                0 B
   ├ ƒ /api/auth/register                   0 B                0 B
   ├ ƒ /api/auth/session                    0 B                0 B
   ├ ƒ /api/cadastros                       0 B                0 B
   ├ ƒ /api/cadastros/[id]                  0 B                0 B
   ├ ƒ /api/persons                         0 B                0 B
   ├ ƒ /api/persons/[id]                    0 B                0 B
   ├ ƒ /api/recognize                       0 B                0 B
   ├ ƒ /api/stats                           0 B                0 B
   ├ ƒ /api/user/face                       0 B                0 B
   ├ ƒ /api/user/profile                    0 B                0 B
   ├ ƒ /api/user/statement                  0 B                0 B
   ├ ○ /cadastro                            16.2 kB         120 kB
   ├ ○ /cadastros                           4.61 kB         109 kB
   └ ○ /dashboard                           13.7 kB         121 kB
   + First Load JS shared by all            104 kB
   ```
   - **Resultado:** Compilação finalizada com **Exit Code 0**, sem erros de tipagem TypeScript ou de runtime.

---

## 6. Conclusão da Refatoração Inicial

A refatoração arquitetural foi concluída com êxito. O sistema apresenta alta coesão e baixo acoplamento nas camadas de Frontend, Controllers, Serviços, Repositórios e Visão Computacional.

---

## 7. Atualização do Sistema: Liveness Otimizado, Novo Layout e Integração SISRU / Catracas (02/10/2026)

Em atendimento às novas diretrizes operacionais de controle de acesso, o sistema recebeu as seguintes implementações:

### 7.1 Reposicionamento do Card de Desafios (UI/UX)
- **Localização:** O bloco de instruções do desafio atual foi movido para **CIMA da câmera** (`components/LivenessSecurityVerification.tsx`).
- **Benefício:** O usuário lê primeiro a instrução e o desafio a ser executado antes de posicionar o rosto na câmera, eliminando a necessidade de rolar a página ou desviar os olhos do enquadramento.

### 7.2 Redução da Dificuldade e Calibração de Liveness
- **Sequências de 2 Etapas:** Substituição de sequências longas por ciclos rápidos e amigáveis de 2 etapas (ex.: *Centralizar rosto* $\rightarrow$ *Piscar suavemente* ou *Sorriso leve*).
- **Flexibilização de Limiares:**
  - **Head Yaw (Rotação):** Aceita viradas sutis ($15^\circ$–$20^\circ$) com limites de $0.72$ e $1.38$ (anteriormente exigia $0.58$ e $1.75$).
  - **Sorriso:** Ativação com `happy > 0.32` ou proporção labial moderada (anteriormente exigia $0.50$ e $0.90$).
  - **Piscada:** Calibração adaptativa com detecção de ciclo natural de reabertura sem esforço forçado.
  - **Enquadramento:** Proporção facial ampliada para $10\%$ a $94\%$ da largura do vídeo, acomodando diferentes câmeras e distâncias confortáveis.
  - **Confirmação Ágil:** Redução do requisito de confirmação temporal consecutiva para 2 frames.

### 7.3 Lógica Condicional de Acesso e Auditoria Aleatória (3 a 5 Acessos)
- **Acesso Direto para Usuários com Biometria:** Usuários que já possuem o rosto cadastrado entram direto no sistema com as abas confidenciais (Extrato e Perfil) liberadas, sem exigir a câmera de liveness a cada login.
- **Sorteio de Auditoria Periódica:** Cada login contabiliza um acesso. Quando o usuário atinge a meta sorteada aleatoriamente entre **3 e 5 acessos**, o sistema exige uma prova de vida rápida para revalidar a presença física. Após a aprovação, o contador é resetado para 0 e um novo gatilho entre 3 e 5 é sorteado.
- **Campos adicionados no Prisma:** `hasFaceRegistered`, `accessCountSinceLastVerification`, `nextVerificationTrigger`, `lastVerificationAt`.

### 7.4 Integração SISRU & Despacho para Catracas
- **Serviço de Integração Criado (`lib/services/turnstile-service.ts`):** Envia os dados e a foto validada via requisição HTTP direta para o sistema da catraca e SISRU.
- **Sem Retenção de Foto no Banco Local:** A foto em Base64 não é salva no banco SQLite local por padrão (`SAVE_LOCAL_PHOTO=false`), liberando espaço de armazenamento e garantindo conformidade com a LGPD, delegando a retenção biométrica para a infraestrutura de controle de acesso físico.

