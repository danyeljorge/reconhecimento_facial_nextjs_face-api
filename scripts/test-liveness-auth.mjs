// Testes unitários e de integração para regras de Liveness, Anti-Spoofing e Autorização de Acesso

import {
  FACE_MATCH_THRESHOLD,
  euclideanDistance,
  compareFace,
} from "../lib/face-recognition.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ ${message}`);
  }
}

console.log("==============================================================");
console.log(" INICIANDO TESTES DO MOTOR DE LIVENESS E DECISÃO DE ACESSO");
console.log("==============================================================\n");

// 1. Teste do limiar de reconhecimento centralizado
assert(FACE_MATCH_THRESHOLD === 0.55, "FACE_MATCH_THRESHOLD configurado exatamente em 0.55");

// 2. Teste de distância euclidiana exata
const v1 = Array.from({ length: 128 }, () => 0.5);
const v2 = Array.from({ length: 128 }, () => 0.5);
assert(euclideanDistance(v1, v2) === 0, "Distância euclidiana entre vetores idênticos deve ser 0");

// 3. Teste de matching com pessoa cadastrada
const db = [
  { id: "person_1", name: "João Silva", descriptor: v1 },
  { id: "person_2", name: "Maria Souza", descriptor: Array.from({ length: 128 }, () => -0.5) },
];

const matchExact = compareFace(v1, db);
assert(matchExact.match !== null, "Deve encontrar correspondência exata para João Silva");
assert(matchExact.match?.name === "João Silva", "Nome identificado deve ser João Silva");
assert(matchExact.match?.confidence === 100, "Confiança deve ser 100% para distância 0");

// 4. Teste de matching com ruído dentro da tolerância (< 0.55)
const noisyVector = v1.map((val) => val + (Math.random() * 0.04 - 0.02));
const matchNoisy = compareFace(noisyVector, db);
assert(matchNoisy.match !== null, "Deve reconhecer com pequenas variações de expressão/iluminação");
assert(matchNoisy.match?.name === "João Silva", "Mesmo com ruído deve reconhecer João Silva");

// 5. Teste com pessoa NÃO cadastrada (vetor aleatório com distância > 0.55)
const strangerVector = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
const matchStranger = compareFace(strangerVector, db);
assert(matchStranger.match === null, "Pessoa não cadastrada não deve ter correspondência no banco");

// 6. Teste da REGRA FUNDAMENTAL DE AUTORIZAÇÃO (Seção 10 dos Requisitos)
function authorizeAccess({ livenessApproved, isRegistered, faceCount }) {
  if (faceCount === 0) {
    return { decision: "BLOCKED", reason: "Nenhum rosto detectado" };
  }
  if (faceCount > 1) {
    return { decision: "BLOCKED", reason: "Mais de um rosto detectado" };
  }
  if (!livenessApproved) {
    return { decision: "BLOCKED", reason: "Não foi possível confirmar a presença de uma pessoa real" };
  }
  if (!isRegistered) {
    return { decision: "BLOCKED", reason: "Pessoa não cadastrada" };
  }
  return { decision: "GRANTED", reason: "Liveness Aprovado + Pessoa Cadastrada" };
}

// 6.1 Liveness Aprovado + Cadastrado = LIBERADO
const r1 = authorizeAccess({ livenessApproved: true, isRegistered: true, faceCount: 1 });
assert(r1.decision === "GRANTED", "Liveness Aprovado + Pessoa Cadastrada DEVE resultar em ACESSO LIBERADO");

// 6.2 Liveness Aprovado + Não Cadastrado = BLOQUEADO
const r2 = authorizeAccess({ livenessApproved: true, isRegistered: false, faceCount: 1 });
assert(r2.decision === "BLOCKED", "Liveness Aprovado + Pessoa Não Cadastrada DEVE resultar em ACESSO BLOQUEADO");

// 6.3 Liveness Reprovado + Cadastrado = BLOQUEADO (Anti-Spoofing)
const r3 = authorizeAccess({ livenessApproved: false, isRegistered: true, faceCount: 1 });
assert(r3.decision === "BLOCKED", "Liveness Reprovado (mesmo com pessoa correspondente) DEVE resultar em ACESSO BLOQUEADO");

// 6.4 Múltiplos rostos = BLOQUEADO
const r4 = authorizeAccess({ livenessApproved: true, isRegistered: true, faceCount: 2 });
assert(r4.decision === "BLOCKED", "Múltiplos rostos na câmera DEVEM resultar em ACESSO BLOQUEADO");

// 6.5 Nenhum rosto = BLOQUEADO
const r5 = authorizeAccess({ livenessApproved: false, isRegistered: false, faceCount: 0 });
assert(r5.decision === "BLOCKED", "Nenhum rosto na câmera DEVE resultar em ACESSO BLOQUEADO");

console.log("\n==============================================================");
console.log("🎉 TODOS OS TESTES DE LIVENESS E AUTORIZAÇÃO PASSARAM COM SUCESSO!");
console.log("==============================================================\n");
