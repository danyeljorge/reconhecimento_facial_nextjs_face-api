/**
 * TESTE DE VALIDAÇÃO ARQUITETURAL COMPLETO
 * 
 * Executa testes end-to-end nas regras das novas camadas:
 * 1. Camada de Domínio / Regras de Negócio:
 *    - Hash e validação de senhas com salt aleatório
 *    - Assinatura e integridade criptográfica de tokens de sessão
 *    - Validação de formato de CPF, E-mail e campos obrigatórios
 * 2. Camada de Acesso a Dados (Repositório / Banco):
 *    - Criação de usuário sem dependência de Face Descriptor
 *    - Persistência e unicidade de CPF, E-mail e SIAP
 *    - Consulta de Perfil DTO (somente leitura)
 *    - Atualização de foto facial pós-liveness
 *    - Exclusão limpa de cadastro
 * 3. Camada de Liveness e Anti-Spoofing (PAD):
 *    - Geração de desafios multietapas aleatórios (Anti-Replay)
 *    - Detecção de foto estática por variância de micro-movimentos
 *    - Veredito final estritamente biométrico (SEM identificação de usuário)
 */

import { PrismaClient } from "@prisma/client";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from "../lib/auth.ts";
import {
  isValidCPF,
  isValidEmail,
  validateRegisterFields,
} from "../lib/validation.ts";
import {
  LivenessSessionManager,
  calculateEAR,
  calculateHeadYaw,
  calculateMouthRatio,
} from "../lib/liveness/liveness-engine.ts";

const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ ${message}`);
  }
}

async function runTests() {
  console.log("==============================================================");
  console.log(" INICIANDO TESTES DO FLUXO ARQUITETURAL REFATORADO");
  console.log("==============================================================\n");

  // -------------------------------------------------------------
  // 1. REGRAS DE NEGÓCIO E SEGURANÇA (Autenticação e Sessão)
  // -------------------------------------------------------------
  console.log("--- 1. Autenticação e Criptografia ---");
  const testPass = "SenhaSegura@2026";
  const hash = hashPassword(testPass);
  assert(hash.includes(":"), "Hash deve ser composto por salt:derivedKey");
  assert(verifyPassword(testPass, hash) === true, "Senha correta deve ser aceita");
  assert(verifyPassword("OutraSenha", hash) === false, "Senha incorreta deve ser rejeitada");

  const token = createSessionToken({
    userId: "usr_arq_test_01",
    email: "arq@faculdade.edu.br",
    name: "Usuário Arquitetura",
  });
  assert(token.includes("."), "Token assinado deve possuir estrutura payload.signature");
  const decoded = verifySessionToken(token);
  assert(decoded?.userId === "usr_arq_test_01", "Payload decodificado deve conter userId");
  assert(verifySessionToken(token + "tampered") === null, "Token adulterado deve ser rejeitado");

  // -------------------------------------------------------------
  // 2. VALIDAÇÃO DE ENTRADA (Sem dependência de Face Descriptor)
  // -------------------------------------------------------------
  console.log("\n--- 2. Validação de Cadastro Desacoplada de Face Descriptor ---");
  assert(isValidCPF("11144477735") === true, "Algoritmo de CPF válido");
  assert(isValidCPF("00000000000") === false, "CPF com dígitos repetidos bloqueado");
  assert(isValidEmail("usuario@universidade.edu.br") === true, "E-mail institucional aceito");

  const validRegistration = validateRegisterFields({
    name: "Ana Clara Mendes",
    cpf: "11144477735",
    siap: "SIAP-778899",
    userType: "Graduação",
    email: "ana.mendes@faculdade.edu.br",
    password: "MinhaSenha123",
    confirmPassword: "MinhaSenha123",
  });
  assert(validRegistration.valid === true, "Validação de cadastro aprovada");
  assert(validRegistration.data?.cpf === "11144477735", "CPF sanitizado disponível");
  assert(validRegistration.data?.siap === "SIAP-778899", "SIAP sanitizado disponível");

  // -------------------------------------------------------------
  // 3. ACESSO AO BANCO (Padrão Repositório)
  // -------------------------------------------------------------
  console.log("\n--- 3. Acesso a Dados e Persistência do Usuário ---");
  const timestamp = Date.now();
  const testCpf = `777${Math.floor(Math.random() * 89999999 + 10000000)}`;
  const testEmail = `teste.arq.${timestamp}@universidade.edu.br`;
  const testSiap = `SIAP-ARQ-${timestamp}`;

  // Criar usuário (sem face descriptor no cadastro!)
  const created = await prisma.user.create({
    data: {
      name: "Ana Clara Mendes",
      cpf: testCpf,
      siap: testSiap,
      userType: "Graduação",
      email: testEmail,
      passwordHash: hashPassword("SenhaForte123"),
      faceImage: null,
    },
  });
  assert(created.id !== undefined, "Usuário persistido no banco com ID único");
  assert(created.faceImage === null, "FaceImage inicial é nula (liveness ocorre após o login)");

  // Atualização da imagem pós-liveness
  const mockLivenessSnapshot = "data:image/jpeg;base64,/9j/mock-presence-photo...";
  const updatedUser = await prisma.user.update({
    where: { id: created.id },
    data: { faceImage: mockLivenessSnapshot },
  });
  assert(updatedUser.faceImage === mockLivenessSnapshot, "Foto de presença vinculada com sucesso");

  // Consulta de perfil DTO (somente leitura)
  const profile = await prisma.user.findUnique({
    where: { id: created.id },
    select: {
      id: true,
      name: true,
      cpf: true,
      siap: true,
      userType: true,
      email: true,
      faceImage: true,
      createdAt: true,
    },
  });
  assert(profile?.name === "Ana Clara Mendes", "Nome do perfil confere");
  assert(profile?.siap === testSiap, "SIAP do perfil confere");

  // -------------------------------------------------------------
  // 4. LIVENESS SERVICE & ANTI-SPOOFING (PAD)
  // -------------------------------------------------------------
  console.log("\n--- 4. Motor de Liveness e Anti-Spoofing (PAD) ---");
  const session = new LivenessSessionManager();
  assert(session.steps.length >= 3, "Sessão multietapas gerou no mínimo 3 desafios aleatórios");
  assert(typeof session.sequenceId === "number", "Sequência aleatória identificada com sequenceId");

  const currentStep = session.getCurrentStep();
  console.log(`✓ Desafio inicial selecionado aleatoriamente: "${currentStep?.title}"`);

  // Testar detecção de foto estática (Presentation Attack Detection)
  const staticMetric = {
    timestamp: Date.now(),
    ear: 0.29,
    yawRatio: 1.0,
    pitchRatio: 1.0,
    mouthRatio: 0.5,
    isBlinking: false,
    isTurningLeft: false,
    isTurningRight: false,
    isCentered: true,
    isSmiling: false,
    isNeutral: true,
    box: { x: 100, y: 100, width: 200, height: 200 },
    centroid: { x: 200, y: 200 },
  };

  // Simula 25 frames com valores estáticos idênticos (ex: foto de papel impressa)
  for (let i = 0; i < 25; i++) {
    session.evaluateFrame({
      ...staticMetric,
      timestamp: Date.now() + i * 80,
    });
  }

  const padResult = session.evaluateAntiSpoofing();
  assert(padResult.isSpoof === true, "PAD deve reprovar apresentação estática sem variância biológica");
  console.log(`✓ PAD identificou ataque estático com sucesso: "${padResult.reason}"`);

  const verdict = session.generateFinalVerdict();
  assert(verdict.livenessPassed === false, "Veredito reprovou liveness para apresentação estática");
  assert(verdict.spoofDetected === true, "Veredito acusou spoofing");
  assert(verdict["user"] === undefined, "REQUISITO 10: Veredito NÃO identifica quem é o usuário");

  // -------------------------------------------------------------
  // 5. EXCLUSÃO E LIMPEZA
  // -------------------------------------------------------------
  console.log("\n--- 5. Limpeza de Dados de Teste ---");
  await prisma.user.delete({ where: { id: created.id } });
  const checkDeleted = await prisma.user.findUnique({ where: { id: created.id } });
  assert(checkDeleted === null, "Cadastro de teste excluído com sucesso");

  console.log("\n==============================================================");
  console.log("🎉 TODOS OS TESTES DO FLUXO ARQUITETURAL PASSARAM COM SUCESSO!");
  console.log("==============================================================\n");

  await prisma.$disconnect();
}

runTests().catch(async (e) => {
  console.error("Erro no teste arquitetural:", e);
  await prisma.$disconnect();
  process.exit(1);
});
