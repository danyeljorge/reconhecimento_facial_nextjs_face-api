# ARQUITETURA DO SISTEMA — SEPARAÇÃO DE RESPONSABILIDADES

Este documento detalha a arquitetura refatorada do MVP de Controle de Acesso Biométrico e Prova de Vida (Liveness/Anti-Spoofing), concebida sobre o Next.js com rigorosa separação de responsabilidades.

---

## 1. Visão Geral Conceitual

A arquitetura do sistema separa estritamente o fluxo transacional de dados do fluxo biométrico de presença, eliminando qualquer acoplamento indevido ou chamadas diretas ao banco de dados no frontend.

```text
FLUXO DE APLICAÇÃO E NEGÓCIO:

  ┌──────────────┐
  │   FRONTEND   │ (Páginas, Telas, Formulários, Câmera Visual)
  └──────┬───────┘
         │ HTTP Fetch (JSON / DTOs)
         ▼
  ┌──────────────┐
  │ CONTROLLERS  │ (AuthController, UserController, Route Handlers)
  └──────┬───────┘
         │ Invocação de Regras de Negócio
         ▼
  ┌──────────────┐
  │   SERVICES   │ (AuthService, UserService)
  └──────┬───────┘
         │ Consultas e Mutações Abstratas
         ▼
  ┌──────────────┐
  │ REPOSITORIES │ (UserRepository, PersonRepository)
  └──────┬───────┘
         │ ORM
         ▼
  ┌──────────────┐
  │    PRISMA    │
  └──────┬───────┘
         │ Driver SQL
         ▼
  ┌──────────────┐
  │   DATABASE   │ (SQLite Local)
  └──────────────┘

FLUXO BIOMÉTRICO (PROVA DE VIDA / LIVENESS):

  ┌──────────────────────────────────┐
  │             FRONTEND             │
  │  (LivenessSecurityVerification)  │
  └─────────────────┬────────────────┘
                    │ Coordenação
                    ▼
  ┌──────────────────────────────────┐
  │       LIVENESS CONTROLLER        │
  └────────┬─────────────────┬───────┘
           │                 │
           ▼                 ▼
  ┌─────────────────┐  ┌──────────────────┐
  │ CAMERA SERVICE  │  │ LIVENESS SERVICE │
  │ (getUserMedia,  │  │ (Desafios, PAD,  │
  │  Snapshot JPEG) │  │  Validação Temp) │
  └─────────────────┘  └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   FACE ENGINE    │ (Abstração IFaceEngine)
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   face-api.js    │ (SSD MobileNet, Landmarks 68)
                       └──────────────────┘
```

---

## 2. Responsabilidade das Camadas

### 2.1 FRONTEND (`app/`, `components/`)
- **Papel**: Interface com o usuário, captura de interações, renderização de estados de carregamento, alertas e reprodução do feed da câmera.
- **Regra**: O frontend **NÃO** acessa o Prisma ou o banco de dados diretamente.
- **Comunicação**: O frontend conversa com o backend exclusivamente via requisições HTTP REST (`/api/*`), trafegando DTOs (Data Transfer Objects).
- **Componentes Chave**:
  - `app/page.tsx`: Tela de entrada (Login com CPF + Senha ou Cadastro).
  - `app/dashboard/page.tsx`: Painel com abas de Reconhecimento/Liveness, Extrato e Perfil.
  - `app/cadastros/page.tsx`: Gerenciamento de cadastros básicos com exclusão protegida por modal.
  - `components/LivenessSecurityVerification.tsx`: Câmera visual de liveness com instruções dinâmicas por etapas, feedback de progresso e contagem regressiva.

### 2.2 CONTROLLERS / APPLICATION LAYER (`lib/controllers/`)
- **Papel**: Coordenar a entrada das requisições, realizar validações de formato HTTP/JSON, despachar para os serviços adequados e estruturar as respostas HTTP padronizadas.
- **Arquivos**:
  - `auth-controller.ts`: Orquestra `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `GET /api/auth/session`.
  - `user-controller.ts`: Orquestra `GET /api/user/profile`, `GET /api/user/statement`, `POST /api/user/face`, `GET/POST /api/cadastros`, `GET/DELETE /api/cadastros/[id]`.
  - `liveness-controller.ts`: Coordenador no lado cliente que orquestra o ciclo da câmera, visão computacional e desafios de vivacidade.

### 2.3 SERVICES (`lib/services/`)
- **Papel**: Concentrar 100% das regras de negócio do sistema.
- **Arquivos**:
  - `auth-service.ts`:
    - Validação de credenciais de login.
    - Criptografia com hash seguro (`scrypt` + salt aleatório de 16 bytes).
    - Validação de unicidade no cadastro (CPF, E-mail, SIAP).
    - Criação e validação de tokens de sessão assinados (HMAC-SHA256) e cookies HTTP-Only.
  - `user-service.ts`:
    - Consulta e montagem do DTO de perfil (`UserProfileDTO`).
    - Estruturação do extrato de movimentações (`UserStatementDTO`).
    - Listagem e exclusão de cadastros.
    - Atualização da imagem facial de confirmação pós-liveness.
  - `liveness-service.ts`:
    - Criação de sessões com sequências aleatórias de desafios multietapas (Anti-Replay).
    - Extração e cálculo de métricas biométricas temporais: EAR (Eye Aspect Ratio), Yaw Ratio (rotação horizontal), Pitch Ratio (inclinação vertical) e Mouth Ratio (abertura da boca / sorriso).
    - Presentation Attack Detection (PAD): bloqueio de fotos estáticas através da análise de variância de micro-movimentos faciais ao longo do tempo.
    - Emissão de veredito de liveness (`LivenessVerdict`).
    - **Princípio**: O `LivenessService` **NÃO autentica e NÃO identifica o usuário**. Apenas atesta a presença de uma pessoa real.

### 2.4 REPOSITORIES (`lib/repositories/`)
- **Papel**: Isolar completamente a camada de persistência de dados e o ORM Prisma.
- **Arquivos**:
  - `user-repository.ts`: Interface `IUserRepository` e implementação `UserRepositoryPrisma`. Concentra todas as operações com `prisma.user` (`findByCpf`, `findByEmail`, `findBySiap`, `findProfileById`, `create`, `updateFaceImage`, `listAll`, `deleteById`).
  - `person-repository.ts`: Interface `IPersonRepository` e implementação para compatibilidade com a tabela `Person`.
- **Regra**: Nenhuma rota de API e nenhum componente chama `prisma.user.*` diretamente. Toda operação passa obrigatoriamente pelo repositório.

### 2.5 BIOMETRIA E VISÃO COMPUTACIONAL
- `lib/camera/camera-service.ts`:
  - Interface `ICameraService` e classe `CameraService`.
  - Controla `navigator.mediaDevices.getUserMedia`, inicialização de tracks de vídeo, parada e captura de snapshots em Base64 JPEG.
- `lib/face-engine/face-engine.ts`:
  - Interface `IFaceEngine` e classe `FaceApiEngine`.
  - Isola o `@vladmandic/face-api` atrás de uma interface genérica.
  - Detecta rostos, enquadramento, 68 landmarks faciais e expressões emocionais.
  - **Permite substituição futura**: É possível trocar o `face-api.js` por MediaPipe, WebAssembly ou APIs proprietárias alterando apenas este módulo, sem modificar a interface do usuário ou o `LivenessService`.

### 2.6 MODELS / TYPES / DTOs (`lib/types/`)
- Centraliza tipos, contratos e DTOs que trafegam entre as camadas:
  - `user.ts`: `UserProfileDTO`, `UserStatementDTO`, `StatementItemDTO`, `UserListItemDTO`, `RegisterUserInput`.
  - `auth.ts`: `SessionPayload`, `LoginCredentials`, `AuthResult`, `AuthenticatedUserDTO`.
  - `liveness.ts`: `ChallengeStep`, `LivenessFrameMetrics`, `LivenessVerdict`, `FaceDetectionResult`, `StepEvaluation`.

---

## 3. Fluxos Operacionais

### 3.1 Fluxo de Autenticação (Login)
```text
1. Usuário digita CPF e Senha na HomePage
2. HomePage faz POST /api/auth/login
3. auth/login/route.ts delega para AuthController.handleLogin()
4. AuthController invoca AuthService.login(cpf, password)
5. AuthService consulta UserRepository.findByCpf()
6. UserRepository executa prisma.user.findUnique()
7. AuthService valida senha com verifyPassword() (scrypt timingSafeEqual)
8. AuthService cria SessionToken assinado e grava cookie httpOnly
9. Resposta 200 OK com DTO do usuário é retornada ao Frontend
10. Frontend redireciona para /dashboard
```

### 3.2 Fluxo de Prova de Vida (Liveness pós-login)
```text
1. No /dashboard, abas de Perfil e Extrato permanecem bloqueadas
2. Componente LivenessSecurityVerification inicia CameraService e FaceEngine
3. LivenessService gera sequência aleatória de desafios (ex: Centralizar -> Piscar -> Virar Rosto)
4. Laço de detecção captura frames contínuos (~12 fps)
5. LivenessService calcula EAR, Yaw e avalia cumprimento de cada etapa por múltiplos frames
6. LivenessService executa Anti-Spoofing PAD (detecta ausência de variância para bloquear fotos impressas)
7. Emitido LivenessVerdict: { success: true, livenessPassed: true, spoofDetected: false }
8. CameraService captura snapshot em alta qualidade
9. Frontend salva foto via POST /api/user/face (UserController -> UserService -> UserRepository)
10. Dashboard desbloqueia acesso às abas de Perfil e Extrato
```

### 3.3 Fluxo de Cadastro de Usuário
```text
1. Formulário em /cadastro ou HomePage (StepRegisterFlow)
2. Coleta: Nome, CPF, SIAP, Tipo de Usuário, E-mail, Senha e Confirmação
3. Validação de formato via validateRegisterFields (sem Face Descriptor)
4. POST /api/auth/register
5. AuthController -> AuthService.register()
6. AuthService verifica duplicidade de CPF, E-mail e SIAP via UserRepository
7. AuthService aplica hashPassword() com salt aleatório
8. UserRepository.create() persiste no SQLite
9. AuthService autentica automaticamente o usuário recém-criado
10. Redirecionamento suave para /dashboard
```

---

## 4. Onde Encontrar Cada Responsabilidade

| Responsabilidade | Localização |
| :--- | :--- |
| **Interface com Usuário** | `app/`, `components/` |
| **Orquestração de Rotas HTTP** | `lib/controllers/auth-controller.ts`, `lib/controllers/user-controller.ts` |
| **Regras de Negócio de Autenticação** | `lib/services/auth-service.ts` |
| **Regras de Negócio de Usuários e Extrato** | `lib/services/user-service.ts` |
| **Acesso ao Banco de Dados (Prisma)** | `lib/repositories/user-repository.ts` |
| **Controle de Câmera e Snapshot** | `lib/camera/camera-service.ts` |
| **Isolamento da Biblioteca Face API** | `lib/face-engine/face-engine.ts` |
| **Desafios e Anti-Spoofing (Liveness)** | `lib/services/liveness-service.ts`, `lib/liveness/liveness-engine.ts` |
| **DTOs e Tipos Compartilhados** | `lib/types/` |
