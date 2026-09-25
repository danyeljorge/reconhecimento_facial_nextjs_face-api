# 👁️ Sistema de Reconhecimento Facial & Controle de Acesso com Liveness (Anti-Spoofing)

<p align="center">
  <img src="./public/cover.png" alt="Capa do Sistema de Reconhecimento Facial" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Liveness-Anti--Spoofing-10B981?style=for-the-badge&logo=shieldcheck" alt="Liveness Anti-Spoofing" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-5.21-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
</p>

---

## 📌 Sobre o Projeto

O **Sistema de Reconhecimento Facial** é uma aplicação web moderna e progressiva (PWA) de controle de acesso biométrico de alta segurança e precisão.

A arquitetura do sistema é dividida em dois momentos completamente distintos e desacoplados:

1. **Momento 1 — Cadastro por Foto:** O usuário cadastra uma pessoa enviando uma imagem/fotografia. O sistema valida se há **exatamente 1 rosto**, gera a referência biométrica (*Face Descriptor* de 128 dimensões) e a armazena no banco de dados SQLite local.
2. **Momento 2 — Acesso Exclusivo via Câmera com Liveness (Anti-Spoofing):** Para obter autorização de entrada, o acesso deve ser feito **obrigatoriamente pela câmera ao vivo**. O sistema executa primeiro uma validação ativa de vivacidade (*Liveness*) para confirmar que se trata de uma pessoa real diante da lente (impedindo fraudes por fotos impressas, telas ou vídeos) e, somente após a aprovação do Liveness, compara a biometria com os registros do banco de dados.

Todo o processamento neural ocorre **100% no navegador (Client-Side AI)**, garantindo total privacidade, conformidade com a LGPD e latência ultrabaixa.

---

## 🛡️ Regra Fundamental de Autorização de Acesso

O acesso só é liberado quando as **duas condições** forem atendidas simultaneamente:

$$\text{ACESSO LIBERADO} \iff (\text{Liveness} = \text{APROVADO}) \land (\text{Pessoa} = \text{CADASTRADA NO BANCO})$$

### Tabela Verdade de Decisão do Sistema

| Liveness (Pessoa Real?) | Reconhecimento Facial (Cadastrado?) | Detecção | Decisão Final | Ação Visual |
| :---: | :---: | :---: | :---: | :---: |
| ✅ **Aprovado** | ✅ **Cadastrado** | Exatamente 1 face | 🟢 **ACESSO LIBERADO** | Destaque verde com nome, similaridade (%) e humor |
| ✅ **Aprovado** | ❌ **Não Cadastrado** | Exatamente 1 face | 🟡 **ACESSO BLOQUEADO** | Alerta: *"Pessoa não cadastrada no sistema"* |
| ❌ **Reprovado** | ⚠️ *Qualquer resultado* | 1 face estática | 🔴 **ACESSO BLOQUEADO** | Alerta: *"Não foi possível confirmar pessoa real (Anti-Spoofing)"* |
| ⚠️ *Pendente* | ⚠️ *Pendente* | Mais de 1 face | 🔴 **ACESSO BLOQUEADO** | Alerta: *"Mais de um rosto detectado na câmera"* |
| ⚠️ *Pendente* | ⚠️ *Pendente* | 0 faces | ⚪ **AGUARDANDO** | Instrução: *"Posicione-se diante da câmera"* |

> ⚠️ **Importante:** Fotografias enviadas no cadastro servem apenas para criar a referência biométrica. O fluxo de reconhecimento **não aceita upload de imagens** em hipótese alguma, exigindo a presença física diante da câmera.

---

## 🧠 Como o Projeto Foi Desenvolvido

### 1. Processamento On-Device com Modelos Neurais
O pipeline de visão computacional utiliza a `@vladmandic/face-api` (implementação otimizada do TensorFlow.js para navegadores), executando 4 redes neurais simultâneas em WebAssembly/WebGL:
- **`ssdMobilenetv1`:** Detecção facial de alta acurácia com retorno de caixas delimitadoras (*bounding boxes*).
- **`faceLandmark68Net`:** Mapeamento de 68 pontos anatômicos (olhos, sobrancelhas, nariz, lábios e contorno mandibular).
- **`faceRecognitionNet`:** Extração do vetor biométrico **Face Descriptor** (vetor de 128 floats de alta dimensionalidade).
- **`faceExpressionNet`:** Classificação em tempo real de expressões e humor (neutro, feliz, surpreso, etc.).

### 2. Motor de Liveness / Anti-Spoofing
Para impedir tentativas simples de spoofing (fotos em papel, fotografias em telas de celular ou monitores), implementamos uma camada de validação biométrica ativa e temporal baseada nos 68 landmarks anatômicos:
- **Detecção de Piscar de Olhos (EAR - Eye Aspect Ratio):** Calcula a razão de aspecto dos olhos a partir dos pontos $(36..41)$ e $(42..47)$:
  $$\text{EAR} = \frac{\|p_2 - p_6\| + \|p_3 - p_5\|}{2 \cdot \|p_1 - p_4\|}$$
  O sistema rastreia o ciclo natural de piscar ($\text{EAR}_{\text{aberto}} \ge 0.24 \rightarrow \text{EAR}_{\text{fechado}} < 0.20 \rightarrow \text{EAR}_{\text{reaberto}} \ge 0.23$). Fotos estáticas e telas imóveis não conseguem reproduzir essa transição.
- **Detecção de Rotação da Cabeça (Head Yaw Ratio):** Monitora a variação horizontal da ponta do nariz (ponto 30) em relação aos extremos da mandíbula (pontos 2 e 14).
- **Detecção de Expressão e Sorriso:** Rastreia o alargamento da boca e microexpressões faciais genuínas.
- **Temporizador de Inatividade:** Se um rosto for detectado, mas permanecer sem qualquer movimento natural por mais de 15 segundos, o Liveness é automaticamente **Reprovado**.

### 3. Centralização do Limiar Biométrico (Threshold)
A comparação de vetores faciais foi centralizada no módulo `lib/face-recognition.ts`, garantindo paridade total entre o frontend e a API REST:
- **Limiar Padronizado:** `FACE_MATCH_THRESHOLD = 0.55` (padrão de máxima acurácia dlib/face-api).
- **Métrica Euclidiana:** $d(p, q) = \sqrt{\sum_{i=1}^{128} (p_i - q_i)^2}$.
- Distâncias $\le 0.55$ confirmam a mesma pessoa com cálculo ponderado de confiança ($50\%$ a $100\%$).

---

## 🌟 Funcionalidades Detalhadas

### 📸 1. Cadastro por Foto (`/cadastro`)
- **Upload de Imagem Facial:** Seleção por clique ou arrastar e soltar (*drag & drop*) de arquivos JPG, PNG ou WebP.
- **Pré-visualização Instantânea:** Exibição da foto com renderização das marcações faciais (*landmarks*) no `<canvas>`.
- **Validações Biométricas Automáticas:**
  - *Nenhum rosto na imagem:* Exibe `"Não foi possível identificar um rosto na foto."`;
  - *Mais de um rosto:* Exibe `"A foto deve conter apenas uma pessoa."`;
  - *Rosto válido:* Exibe `"Rosto identificado. Cadastro facial pronto para ser salvo!"` e habilita a gravação.
- **Alternativa via Webcam:** Permite alternar opcionalmente para captura direta por câmera.
- **Persistência Segura:** Envia o nome e o vetor de 128 dimensões para o SQLite via `POST /api/persons`.

### 🛡️ 2. Controle de Acesso com Liveness (`/reconhecer`)
- **Acesso Exclusivo por Câmera:** Não permite envio de arquivos estáticos.
- **Painel em Duas Etapas:**
  1. *Etapa 1 (Liveness):* Instrução ativa na tela (*"Pisque os olhos ou sorria"*);
  2. *Etapa 2 (Banco SQLite):* Identificação instantânea da pessoa autorizada.
- **Card de Decisão Final:**
  - 🟢 **ACESSO LIBERADO:** Exibe nome completo, similaridade facial (ex.: 98%), prova de Liveness realizada e humor detectado.
  - 🟡 **ACESSO BLOQUEADO (Não cadastrado):** Alerta que a presença é real, mas o usuário não consta na base autorizada.
  - 🔴 **ACESSO BLOQUEADO (Liveness reprovado):** Alerta de ausência de movimento facial natural (possível tentativa de foto/spoofing).
- **Botão "Nova Verificação":** Reinicia o ciclo para o próximo usuário sem necessidade de recarregar a página.
- **Histórico da Sessão:** Registra todas as tentativas de liberação ou bloqueio com horários, motivos e expressões detectadas.

### 👥 3. Gerenciamento de Cadastros (`/cadastros`)
- Listagem completa de biometrias registradas com paginação e busca instantânea por nome.
- Edição do nome da pessoa sem alterar o vetor biométrico.
- Exclusão definitiva de registros no SQLite com modal de confirmação.

---

## 📱 Aplicação PWA (Progressive Web App)

- **Instalação com 1 Clique:** Prompt personalizado via componente `InstallPwaPrompt.tsx`.
- **Cache Inteligente de Modelos Neurais (`CacheFirst`):** Os pesos dos modelos de IA (`/models/*`) ficam cacheados no Service Worker por 30 dias.
- **Execução Standalone:** Funciona como app desktop ou mobile sem barras de endereço do navegador.
- **Contingência Offline:** Página dedicada `app/~offline/page.tsx`.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Framework Full-Stack** | Next.js 14 (App Router) | Renderização híbrida, páginas dinâmicas e API Routes |
| **Biblioteca de UI** | React 18 | Interfaces declarativas e hooks de estado em tempo real |
| **Linguagem** | TypeScript 5 | Tipagem estática e segurança de ponta a ponta |
| **Visão Computacional & IA** | `@vladmandic/face-api` | Modelos SSD MobileNet, 68 Landmarks, Reconhecimento e Expressões |
| **Módulo Biométrico** | `lib/face-recognition.ts` | Lógica centralizada de matching euclidiano e limiares |
| **ORM & Banco de Dados** | Prisma 5 + SQLite local | Persistência local em arquivo (`prisma/dev.db`) com isolamento |
| **PWA & Service Worker** | `@ducanh2912/next-pwa` + Workbox | Cache offline e suporte a aplicativo instalável |
| **Estilização** | Tailwind CSS 3 | Design limpo em tema claro (*Light Theme*), moderno e responsivo |
| **Iconografia** | Lucide React | Ícones SVG consistentes |

---

## 📂 Estrutura de Diretórios

```text
├── app/
│   ├── api/
│   │   ├── persons/            # CRUD de pessoas (validação estrita do vetor 128D)
│   │   │   └── [id]/           # Edição e exclusão individual de registros
│   │   ├── recognize/          # Endpoint REST de reconhecimento facial
│   │   └── stats/              # Estatísticas de cadastros
│   ├── cadastro/               # Cadastro por upload de foto com validação facial
│   ├── cadastros/              # Gerenciamento de registros cadastrados
│   ├── reconhecer/             # Câmera de acesso com Liveness e decisão de autorização
│   ├── ~offline/               # Página de contingência offline
│   ├── layout.tsx              # Layout base com Navbar e PWA
│   └── page.tsx                # Dashboard principal
├── components/
│   ├── RecognitionCameraView.tsx # Motor de câmera com Liveness (EAR/Blink) e canvas
│   ├── CameraView.tsx          # Componente de câmera para cadastro opcional
│   ├── InstallPwaPrompt.tsx    # Banner de instalação do aplicativo PWA
│   ├── Navbar.tsx              # Barra de navegação principal
│   └── Modal.tsx               # Modal de confirmação e edição
├── lib/
│   ├── face-api.ts             # Carregamento dos modelos neurais e detecção em imagens
│   ├── face-recognition.ts     # Centralização do limiar (0.55) e cálculo de similaridade
│   ├── validation.ts           # Validações estruturais de dados e vetores
│   └── prisma.ts               # Cliente singleton do Prisma
├── prisma/
│   ├── schema.prisma           # Esquema do banco de dados SQLite
│   └── dev.db                  # Banco de dados SQLite físico local
├── public/
│   ├── models/                 # Pesos das redes neurais pré-treinadas
│   ├── manifest.json           # Manifesto PWA da aplicação
│   └── icons/                  # Ícones PWA e favicons
├── scripts/
│   ├── test-liveness-auth.mjs  # Testes das regras de Liveness e tabela verdade de acesso
│   ├── test-recognition.mjs    # Testes de integração de rotas e matching biométrico
│   └── test-system.mjs         # Testes de ponta a ponta do banco e CRUD
├── next.config.mjs             # Configurações do Next.js, PWA e filtros do Webpack
└── package.json                # Dependências e scripts do projeto
```

---

## 💻 Como Executar o Projeto

### Pré-requisitos
- **Node.js** (versão 18.18+ ou 20+)
- **NPM** instalado
- Câmera / Webcam conectada (para o fluxo de acesso)

### 1. Clonar o repositório e entrar na pasta
```bash
git clone <url-do-repositorio>
cd reconhecimento_facial_next-js
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Sincronizar o banco de dados SQLite
```bash
npx prisma db push
```

### 4. Executar em modo de desenvolvimento
```bash
npm run dev
```

Abra em seu navegador:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Testes Automatizados

O projeto inclui três suítes de testes automatizados:

### 1. Teste de Liveness e Regras de Autorização
Valida a lógica matemática de matching, o limiar de $0.55$ e todas as combinações da tabela verdade de acesso:
```bash
node --experimental-strip-types scripts/test-liveness-auth.mjs
```

### 2. Teste de Reconhecimento e Integração de Rotas
```bash
node scripts/test-recognition.mjs
```

### 3. Teste Completo de Persistência e CRUD
```bash
node scripts/test-system.mjs
```

---

## 🔒 Privacidade e Conformidade com a LGPD

- **Sem Nuvem para Biometria:** Nenhum frame de vídeo ou foto do usuário é transmitido para serviços em nuvem.
- **Armazenamento Minimalista:** As fotos de acesso não são guardadas; apenas a referência matemática vetorial (128 floats) é persistida no SQLite.
- **Execução Local:** Toda a inferência de inteligência artificial roda no hardware local do usuário.

---

<p align="center">
  Desenvolvido com foco em alta segurança, validação de vivacidade (*anti-spoofing*) e privacidade de ponta a ponta.
</p>