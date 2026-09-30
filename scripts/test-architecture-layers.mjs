/**
 * TESTE DAS CAMADAS ARQUITETURAIS REFATORADAS
 * 
 * Verifica a segregação de responsabilidades entre:
 * 1. Repositories (UserRepository)
 * 2. Services (AuthService, UserService, LivenessService)
 * 3. Controllers (AuthController, UserController)
 * 4. Models / Types (DTOs)
 * 5. Liveness vs Authentication (Desacoplamento estrito)
 */

import { userRepository } from "../lib/repositories/user-repository.ts";
import { authService } from "../lib/services/auth-service.ts";
import { userService } from "../lib/services/user-service.ts";
import { livenessService } from "../lib/services/liveness-service.ts";
import { cameraService } from "../lib/camera/camera-service.ts";
import { faceEngine } from "../lib/face-engine/face-engine.ts";
import { prisma } from "../lib/prisma.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ ${message}`);
  }
}

async function runArchitectureTests() {
  console.log("==============================================================");
  console.log(" INICIANDO TESTES DAS CAMADAS ARQUITETURAIS REFATORADAS");
  console.log("==============================================================\n");

  const timestamp = Date.now();
  const testCpf = `888${Math.floor(Math.random() * 89999999 + 10000000)}`;
  const testEmail = `arq.test.${timestamp}@universidade.edu.br`;
  const testSiap = `SIAP-ARQ-${timestamp}`;
  const testPassword = "SenhaArquitetura@2026";

  // -------------------------------------------------------------
  // 1. TESTE DA CAMADA DE REPOSITÓRIO (UserRepository)
  // -------------------------------------------------------------
  console.log("--- 1. Camada de Repositório (UserRepository) ---");
  assert(typeof userRepository.findByCpf === "function", "userRepository deve implementar findByCpf");
  assert(typeof userRepository.findByEmail === "function", "userRepository deve implementar findByEmail");
  assert(typeof userRepository.create === "function", "userRepository deve implementar create");
  assert(typeof userRepository.findProfileById === "function", "userRepository deve implementar findProfileById");
  assert(typeof userRepository.deleteById === "function", "userRepository deve implementar deleteById");

  // -------------------------------------------------------------
  // 2. TESTE DA CAMADA DE SERVIÇO DE AUTENTICAÇÃO (AuthService)
  // -------------------------------------------------------------
  console.log("\n--- 2. Camada de Serviço de Autenticação (AuthService) ---");

  // 2.1 Registro via AuthService
  const registerResult = await authService.register({
    name: "Mariana Alencar Silva",
    cpf: testCpf,
    siap: testSiap,
    ciap: testSiap,
    userType: "Professor",
    email: testEmail,
    password: testPassword,
    confirmPassword: testPassword,
  });

  assert(registerResult.success === true, "AuthService.register deve concluir com sucesso");
  assert(registerResult.user !== undefined, "AuthService deve retornar DTO do usuário");
  assert(registerResult.user.cpf === testCpf, "CPF do usuário registrado deve corresponder");
  assert(registerResult.user.name === "Mariana Alencar Silva", "Nome do usuário registrado deve corresponder");
  const createdUserId = registerResult.user.id;

  // 2.2 Tentativa de registro duplicado (deve ser rejeitado pelas regras de negócio)
  const dupEmailResult = await authService.register({
    name: "Outro Nome",
    cpf: `777${Math.floor(Math.random() * 89999999 + 10000000)}`,
    siap: `SIAP-${Date.now() + 1}`,
    userType: "Graduação",
    email: testEmail, // E-mail duplicado
    password: testPassword,
    confirmPassword: testPassword,
  });
  assert(dupEmailResult.success === false, "AuthService deve rejeitar e-mail duplicado");

  // 2.3 Login com credenciais corretas
  const loginSuccess = await authService.login(testCpf, testPassword);
  assert(loginSuccess.success === true, "AuthService.login com CPF e senha corretos deve ter sucesso");
  assert(loginSuccess.user.id === createdUserId, "ID do usuário autenticado deve corresponder");

  // 2.4 Login com senha incorreta
  const loginWrongPass = await authService.login(testCpf, "SenhaInvalida");
  assert(loginWrongPass.success === false, "AuthService.login com senha errada deve falhar");

  // 2.5 Login com CPF inexistente
  const loginWrongCpf = await authService.login("00000000000", testPassword);
  assert(loginWrongCpf.success === false, "AuthService.login com CPF inexistente deve falhar");

  // -------------------------------------------------------------
  // 3. TESTE DA CAMADA DE SERVIÇO DE USUÁRIO (UserService)
  // -------------------------------------------------------------
  console.log("\n--- 3. Camada de Serviço de Usuário (UserService) ---");

  // 3.1 Consulta de perfil DTO
  const profileDTO = await userService.getUserProfile(createdUserId);
  assert(profileDTO !== null, "UserService.getUserProfile deve retornar dados");
  assert(profileDTO.id === createdUserId, "ID do perfil DTO deve ser consistente");
  assert(profileDTO.cpf === testCpf, "CPF do perfil DTO deve ser consistente");
  assert(profileDTO.ciap === testSiap, "CIAP/SIAP deve ser retornado no DTO");

  // 3.2 Extrato de movimentações
  const statementDTO = await userService.getUserStatement(createdUserId);
  assert(statementDTO !== null, "UserService.getUserStatement deve retornar objeto");
  assert(statementDTO.balance === 0.0, "Saldo inicial deve ser 0.00");
  assert(Array.isArray(statementDTO.items), "Itens de extrato devem ser um array");

  // 3.3 Atualização de imagem facial (pós-liveness)
  const fakeLivenessPhoto = "data:image/jpeg;base64,/9j/mock-liveness-photo-2026...";
  const updatedUser = await userService.updateFaceImage(createdUserId, fakeLivenessPhoto);
  assert(updatedUser.faceImage === fakeLivenessPhoto, "UserService.updateFaceImage deve persistir a imagem facial");

  // -------------------------------------------------------------
  // 4. TESTE DA CAMADA DE LIVENESS (LivenessService)
  // -------------------------------------------------------------
  console.log("\n--- 4. Camada de Liveness e PAD (LivenessService) ---");
  assert(typeof livenessService.createSession === "function", "LivenessService deve criar sessões");

  const session = livenessService.createSession();
  assert(session.steps.length >= 3, "Sessão deve gerar sequência de múltiplos desafios");
  assert(session.getCurrentStep() !== null, "Primeiro desafio deve estar disponível");

  const firstStep = session.getCurrentStep();
  console.log(`✓ Desafio 1 da sessão aleatória: "${firstStep.title}" (tipo: ${firstStep.type})`);

  // Simular alimentação de métricas de frame
  const mockMetrics = {
    timestamp: Date.now(),
    ear: 0.30,
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

  const evalStep = session.evaluateFrame(mockMetrics);
  assert(evalStep !== undefined, "Avaliação de frame deve retornar StepEvaluation");
  assert(typeof evalStep.progressPercent === "number", "Progresso percentual deve ser numérico");

  // Avaliação de Anti-Spoofing: Sessão estática (sem variância biológica de movimentos)
  // Alimentar múltiplos frames absolutamente idênticos (simulação de foto impressa)
  for (let i = 0; i < 20; i++) {
    session.evaluateFrame({
      ...mockMetrics,
      timestamp: Date.now() + i * 100,
    });
  }
  const padCheck = session.evaluateAntiSpoofing();
  assert(padCheck.isSpoof === true, "Apresentação sem variação temporal deve ser detectada como spoofing!");
  console.log(`✓ Anti-Spoofing PAD confirmou bloqueio de foto estática: "${padCheck.reason}"`);

  // Veredito final de Liveness não contém identificação de usuário
  const verdict = session.generateFinalVerdict();
  assert(verdict.livenessPassed !== undefined, "Veredito deve conter livenessPassed");
  assert(verdict.spoofDetected !== undefined, "Veredito deve conter spoofDetected");
  assert(verdict["user"] === undefined, "Veredito de Liveness NÃO deve identificar quem é o usuário!");
  assert(verdict["userId"] === undefined, "Veredito de Liveness NÃO deve conter userId!");

  // -------------------------------------------------------------
  // 5. TESTE DA CAMADA DE CAMERA E ENGINE (Interfaces desacopladas)
  // -------------------------------------------------------------
  console.log("\n--- 5. Interfaces de Câmera e FaceEngine ---");
  assert(typeof cameraService.startCamera === "function", "CameraService deve implementar startCamera");
  assert(typeof cameraService.stopCamera === "function", "CameraService deve implementar stopCamera");
  assert(typeof cameraService.captureSnapshot === "function", "CameraService deve implementar captureSnapshot");
  assert(typeof faceEngine.initialize === "function", "FaceEngine deve implementar initialize");
  assert(typeof faceEngine.detectFace === "function", "FaceEngine deve implementar detectFace");

  // -------------------------------------------------------------
  // 6. LIMPEZA DO REGISTRO DE TESTE (UserService.deleteUser)
  // -------------------------------------------------------------
  console.log("\n--- 6. Limpeza e Exclusão no Repositório ---");
  const deleteOk = await userService.deleteUser(createdUserId);
  assert(deleteOk === true, "UserService.deleteUser deve excluir o cadastro com sucesso");

  const checkDeleted = await userRepository.findById(createdUserId);
  assert(checkDeleted === null, "Usuário não deve mais existir no banco de dados após exclusão");

  console.log("\n==============================================================");
  console.log("🎉 TODAS AS CAMADAS ARQUITETURAIS FORAM VALIDADAS COM SUCESSO!");
  console.log("==============================================================\n");

  await prisma.$disconnect();
}

runArchitectureTests().catch(async (e) => {
  console.error("Erro fatal no teste arquitetural:", e);
  await prisma.$disconnect();
  process.exit(1);
});
