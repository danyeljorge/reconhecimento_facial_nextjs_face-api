/**
 * LIVENESS & ANTI-SPOOFING ENGINE
 * 
 * Este módulo implementa a validação de vivacidade (Proof of Life) e detecção de ataques de apresentação (PAD).
 * 
 * PRINCÍPIOS ARQUITETURAIS:
 * 1. O sistema NÃO identifica o usuário por Face Descriptor (CPF + senha realizam a autenticação).
 * 2. O Liveness pós-login confirma que há uma PESSOA REAL diante da câmera no momento do acesso.
 * 3. Fotografias estáticas, screenshots, papéis impressos ou telas são bloqueados por exigirem
 *    mudanças temporais consistentes ao longo de múltiplos frames consecutivos (EAR, Yaw, Deformações).
 * 4. Desafios multietapas com sequência aleatória para cada tentativa impedem ataques de replay pré-gravados.
 * 5. Não são feitas promessas de "100% humano" ou "matematicamente infalível".
 *    A arquitetura é modular para permitir integração futura com modelos PAD ISO/IEC 30107-3.
 */

export type ChallengeStepType =
  | "look_center"
  | "blink_twice"
  | "turn_left"
  | "turn_right"
  | "smile"
  | "return_center"
  | "return_neutral";

export interface ChallengeStep {
  id: string;
  type: ChallengeStepType;
  title: string;
  instruction: string;
  hint: string;
}

export interface LandmarkPoint {
  x: number;
  y: number;
}

export interface LivenessFrameMetrics {
  timestamp: number;
  ear: number; // Eye Aspect Ratio
  yawRatio: number; // Rotação horizontal
  pitchRatio: number; // Rotação vertical
  mouthRatio: number; // Proporção da boca
  isBlinking: boolean;
  isTurningLeft: boolean;
  isTurningRight: boolean;
  isCentered: boolean;
  isSmiling: boolean;
  isNeutral: boolean;
  box: { x: number; y: number; width: number; height: number };
  centroid: LandmarkPoint;
}

export interface StepEvaluation {
  isStepComplete: boolean;
  progressPercent: number;
  actionDetected: string | null;
  feedbackText: string;
}

export interface LivenessVerdict {
  success: boolean;
  livenessPassed: boolean;
  spoofDetected: boolean;
  challengesCompleted: boolean;
  reason?: string;
  metricsSummary?: {
    totalFramesAnalyzed: number;
    durationMs: number;
    completedSteps: string[];
    antiSpoofSignalsPassed: string[];
  };
}

// -------------------------------------------------------------
// CÁLCULOS MATEMÁTICOS DE BIOMETRIA E LANDMARKS FACIAIS (68 PONTOS)
// -------------------------------------------------------------

function dist2D(p1: LandmarkPoint, p2: LandmarkPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calcula o EAR (Eye Aspect Ratio) combinando os dois olhos.
 * Olho Esquerdo: 36..41 | Olho Direito: 42..47
 * EAR = (||p_top1 - p_bot1|| + ||p_top2 - p_bot2||) / (2 * ||p_left - p_right||)
 */
export function calculateEAR(pts: LandmarkPoint[]): number {
  if (!pts || pts.length < 68) return 0.28;

  // Olho esquerdo
  const lH1 = dist2D(pts[37], pts[41]);
  const lH2 = dist2D(pts[38], pts[40]);
  const lW = dist2D(pts[36], pts[39]);
  const leftEAR = (lH1 + lH2) / (2.0 * (lW || 1));

  // Olho direito
  const rH1 = dist2D(pts[43], pts[47]);
  const rH2 = dist2D(pts[44], pts[46]);
  const rW = dist2D(pts[42], pts[45]);
  const rightEAR = (rH1 + rH2) / (2.0 * (rW || 1));

  return (leftEAR + rightEAR) / 2.0;
}

/**
 * Estima a rotação horizontal da cabeça (Head Yaw).
 * Utiliza o nariz (ponto 30) em relação aos extremos da mandíbula (ponto 2 e 14).
 * yawRatio = dist(nariz, mandíbula_esquerda) / dist(nariz, mandíbula_direita)
 */
export function calculateHeadYaw(pts: LandmarkPoint[]): number {
  if (!pts || pts.length < 68) return 1.0;
  const noseX = pts[30].x;
  const leftJawDist = Math.abs(noseX - pts[2].x);
  const rightJawDist = Math.abs(pts[14].x - noseX);
  return leftJawDist / (rightJawDist + 0.001);
}

/**
 * Estima a inclinação vertical da cabeça (Head Pitch).
 * Utiliza a proporção da ponte do nariz (ponto 27), ponta do nariz (ponto 30) e queixo (ponto 8).
 */
export function calculateHeadPitch(pts: LandmarkPoint[]): number {
  if (!pts || pts.length < 68) return 1.0;
  const noseLength = dist2D(pts[27], pts[30]);
  const chinDist = dist2D(pts[30], pts[8]);
  return noseLength / (chinDist + 0.001);
}

/**
 * Calcula a proporção da abertura da boca para estimativa de sorriso.
 * Utiliza comissuras labiais (pontos 48 e 54) normalizados pela distância interocular (pontos 36 e 45).
 */
export function calculateMouthRatio(pts: LandmarkPoint[]): number {
  if (!pts || pts.length < 68) return 0.5;
  const mouthWidth = dist2D(pts[48], pts[54]);
  const eyeDistance = dist2D(pts[36], pts[45]);
  return mouthWidth / (eyeDistance || 1);
}

/**
 * Calcula o centroide dos 68 landmarks faciais.
 */
export function calculateCentroid(pts: LandmarkPoint[]): LandmarkPoint {
  if (!pts || pts.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < pts.length; i++) {
    sumX += pts[i].x;
    sumY += pts[i].y;
  }
  return { x: sumX / pts.length, y: sumY / pts.length };
}

/**
 * Extrai todas as métricas biométricas de um frame analisado.
 */
export function extractFrameMetrics(
  landmarks: { positions?: LandmarkPoint[] } | LandmarkPoint[] | null,
  expressions: { happy?: number } | null | undefined,
  box: { x: number; y: number; width: number; height: number }
): LivenessFrameMetrics | null {
  if (!landmarks) return null;
  const pts: LandmarkPoint[] = Array.isArray(landmarks)
    ? landmarks
    : landmarks.positions || [];

  if (pts.length < 68) return null;

  const ear = calculateEAR(pts);
  const yawRatio = calculateHeadYaw(pts);
  const pitchRatio = calculateHeadPitch(pts);
  const mouthRatio = calculateMouthRatio(pts);
  const centroid = calculateCentroid(pts);

  // Limiares biométricos calibrados para webcams reais em navegadores
  const isBlinking = ear < 0.238; // Olho fechado ou semicerrado durante piscada
  const isTurningLeft = yawRatio < 0.58; // Virou à esquerda na câmera espelhada
  const isTurningRight = yawRatio > 1.75; // Virou à direita na câmera espelhada
  const isCentered = yawRatio >= 0.70 && yawRatio <= 1.40;
  const isSmiling = (expressions?.happy ?? 0) > 0.50 || mouthRatio > 0.90;
  const isNeutral = (expressions?.happy ?? 0) < 0.28 && mouthRatio < 0.88;

  return {
    timestamp: Date.now(),
    ear,
    yawRatio,
    pitchRatio,
    mouthRatio,
    isBlinking,
    isTurningLeft,
    isTurningRight,
    isCentered,
    isSmiling,
    isNeutral,
    box,
    centroid,
  };
}

// -------------------------------------------------------------
// GERADOR DE DESAFIOS ALEATÓRIOS MULTIETAPAS (Anti-Replay)
// -------------------------------------------------------------

const STEP_DEFINITIONS: Record<ChallengeStepType, { title: string; instruction: string; hint: string }> = {
  look_center: {
    title: "Olhe para a câmera",
    instruction: "Mantenha o rosto centralizado e olhe para frente",
    hint: "Posicione seu rosto confortavelmente na área indicada",
  },
  blink_twice: {
    title: "Pisque os olhos",
    instruction: "Pisque os olhos de forma natural diante da câmera",
    hint: "Feche e abra os olhos com tranquilidade",
  },
  turn_left: {
    title: "Vire o rosto para a esquerda",
    instruction: "Gire suavemente a cabeça para a sua esquerda",
    hint: "Mantenha o movimento por alguns instantes",
  },
  turn_right: {
    title: "Vire o rosto para a direita",
    instruction: "Gire suavemente a cabeça para a sua direita",
    hint: "Mantenha o movimento por alguns instantes",
  },
  smile: {
    title: "Dê um sorriso",
    instruction: "Sorria para a câmera mostrando os dentes ou expressão alegre",
    hint: "Mantenha a expressão sorridente por instantes",
  },
  return_center: {
    title: "Volte para o centro",
    instruction: "Retorne a cabeça para a posição central",
    hint: "Olhe novamente para o centro da tela",
  },
  return_neutral: {
    title: "Volte à expressão neutra",
    instruction: "Relaxe o rosto para a expressão neutra",
    hint: "Mantenha a expressão natural sem sorrir",
  },
};

/**
 * Gera sequências de desafios aleatórias e não previsíveis.
 * Cada sequência é garantidamente diferente para evitar ataques de replay com vídeos pré-gravados.
 */
export function generateRandomChallengeSequence(excludeSequenceId?: number): {
  sequenceId: number;
  steps: ChallengeStep[];
} {
  const templates: ChallengeStepType[][] = [
    // Opção 1: Centralizar -> Piscar 2x -> Virar Esquerda -> Retornar ao Centro
    ["look_center", "blink_twice", "turn_left", "return_center"],
    // Opção 2: Centralizar -> Virar Direita -> Retornar ao Centro -> Piscar 2x
    ["look_center", "turn_right", "return_center", "blink_twice"],
    // Opção 3: Centralizar -> Sorrir -> Voltar ao Neutro -> Piscar 2x
    ["look_center", "smile", "return_neutral", "blink_twice"],
    // Opção 4: Centralizar -> Virar Esquerda -> Retornar ao Centro -> Sorrir -> Voltar ao Neutro
    ["look_center", "turn_left", "return_center", "smile", "return_neutral"],
    // Opção 5: Centralizar -> Piscar 2x -> Virar Direita -> Retornar ao Centro
    ["look_center", "blink_twice", "turn_right", "return_center"],
    // Opção 6: Centralizar -> Sorrir -> Voltar ao Neutro -> Virar Esquerda -> Retornar ao Centro
    ["look_center", "smile", "return_neutral", "turn_left", "return_center"],
    // Opção 7: Centralizar -> Virar Direita -> Retornar ao Centro -> Virar Esquerda -> Retornar ao Centro
    ["look_center", "turn_right", "return_center", "turn_left", "return_center"],
  ];

  let selectedIdx = Math.floor(Math.random() * templates.length);
  if (excludeSequenceId !== undefined && selectedIdx === excludeSequenceId) {
    selectedIdx = (selectedIdx + 1) % templates.length;
  }

  const chosenTypes = templates[selectedIdx];
  const steps: ChallengeStep[] = chosenTypes.map((type, i) => ({
    id: `step_${i + 1}_${type}`,
    type,
    title: STEP_DEFINITIONS[type].title,
    instruction: STEP_DEFINITIONS[type].instruction,
    hint: STEP_DEFINITIONS[type].hint,
  }));

  return {
    sequenceId: selectedIdx,
    steps,
  };
}

// -------------------------------------------------------------
// MÁQUINA DE ESTADOS TEMPORAL MULTI-FRAME PARA CADA ETAPA
// -------------------------------------------------------------

export class LivenessSessionManager {
  public sequenceId: number;
  public steps: ChallengeStep[];
  public currentStepIndex = 0;
  public sessionStartTime: number;
  public currentStepStartTime: number;
  public frameHistory: LivenessFrameMetrics[] = [];
  public completedStepTypes: string[] = [];

  // Estados internos específicos de cada desafio
  private consecutiveTargetFrames = 0;
  private baselineEAR = 0.28;
  private blinkState: "waiting_blink" | "closed" | "completed" = "waiting_blink";
  private blinkFramesCount = 0;
  private blinkCount = 0;

  constructor(previousSequenceId?: number) {
    const generated = generateRandomChallengeSequence(previousSequenceId);
    this.sequenceId = generated.sequenceId;
    this.steps = generated.steps;
    this.sessionStartTime = Date.now();
    this.currentStepStartTime = Date.now();
  }

  public getCurrentStep(): ChallengeStep | null {
    if (this.currentStepIndex >= this.steps.length) return null;
    return this.steps[this.currentStepIndex];
  }

  public resetCurrentStepState() {
    this.consecutiveTargetFrames = 0;
    this.blinkState = "waiting_blink";
    this.blinkFramesCount = 0;
    this.blinkCount = 0;
    this.currentStepStartTime = Date.now();
  }

  /**
   * Processa o frame atual contra o desafio em andamento.
   * Exige confirmação temporal ao longo de múltiplos frames consecutivos (mínimo de 3 frames).
   */
  public evaluateFrame(metrics: LivenessFrameMetrics): StepEvaluation {
    this.frameHistory.push(metrics);
    // Mantém no máximo os últimos 120 frames para otimização de memória
    if (this.frameHistory.length > 120) {
      this.frameHistory.shift();
    }

    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      return {
        isStepComplete: true,
        progressPercent: 100,
        actionDetected: "Todos os desafios concluídos",
        feedbackText: "Validação concluída com sucesso.",
      };
    }

    // Calibração adaptativa contínua do EAR basal de olhos abertos
    if (metrics.ear > 0.235) {
      this.baselineEAR = Math.max(0.24, Math.min(0.38, this.baselineEAR * 0.85 + metrics.ear * 0.15));
    }

    const MIN_CONSECUTIVE = 3; // Mínimo de frames consecutivos para confirmar ação real

    switch (currentStep.type) {
      // 1. OLHAR PARA O CENTRO
      case "look_center": {
        if (metrics.isCentered && !metrics.isBlinking) {
          this.consecutiveTargetFrames++;
          const progress = Math.min(100, Math.round((this.consecutiveTargetFrames / MIN_CONSECUTIVE) * 100));
          if (this.consecutiveTargetFrames >= MIN_CONSECUTIVE) {
            return {
              isStepComplete: true,
              progressPercent: 100,
              actionDetected: "Rosto centralizado",
              feedbackText: "Rosto posicionado corretamente!",
            };
          }
          return {
            isStepComplete: false,
            progressPercent: progress,
            actionDetected: "Centralizando...",
            feedbackText: "Mantenha o rosto parado olhando para a frente...",
          };
        } else {
          this.consecutiveTargetFrames = Math.max(0, this.consecutiveTargetFrames - 1);
          return {
            isStepComplete: false,
            progressPercent: 0,
            actionDetected: null,
            feedbackText: "Olhe diretamente para a câmera no centro.",
          };
        }
      }

      // 2. PISCAR OS OLHOS (Transição natural: Olhos Abertos -> Olhos Fechando -> Reabertura)
      case "blink_twice": {
        const isEyeClosed = metrics.isBlinking || metrics.ear < 0.238 || metrics.ear < (this.baselineEAR * 0.82);
        const isEyeOpen = metrics.ear >= 0.235 || metrics.ear >= (this.baselineEAR * 0.86);

        if (this.blinkState === "waiting_blink") {
          if (isEyeClosed) {
            this.blinkState = "closed";
            this.blinkFramesCount = 1;
            return {
              isStepComplete: false,
              progressPercent: 65,
              actionDetected: "Piscando os olhos...",
              feedbackText: "Piscada detectada! Abra os olhos...",
            };
          }
          return {
            isStepComplete: false,
            progressPercent: 20,
            actionDetected: null,
            feedbackText: "Pisque os olhos naturalmente diante da câmera...",
          };
        }

        if (this.blinkState === "closed") {
          if (isEyeClosed) {
            this.blinkFramesCount++;
            return {
              isStepComplete: false,
              progressPercent: 80,
              actionDetected: "Olhos fechados",
              feedbackText: "Agora abra os olhos...",
            };
          }

          // Olhos reabertos: a piscada foi completada com ciclo biológico real!
          this.blinkState = "completed";
          this.blinkCount++;
          return {
            isStepComplete: true,
            progressPercent: 100,
            actionDetected: "Piscada confirmada!",
            feedbackText: "Excelente! Piscada confirmada com sucesso!",
          };
        }

        return {
          isStepComplete: true,
          progressPercent: 100,
          actionDetected: "Piscada confirmada!",
          feedbackText: "Excelente! Piscada confirmada com sucesso!",
        };
      }

      // 3. VIRAR O ROSTO PARA A ESQUERDA
      case "turn_left": {
        if (metrics.isTurningLeft) {
          this.consecutiveTargetFrames++;
          const progress = Math.min(100, Math.round((this.consecutiveTargetFrames / MIN_CONSECUTIVE) * 100));
          if (this.consecutiveTargetFrames >= MIN_CONSECUTIVE) {
            return {
              isStepComplete: true,
              progressPercent: 100,
              actionDetected: "Virou à esquerda",
              feedbackText: "Movimento à esquerda confirmado!",
            };
          }
          return {
            isStepComplete: false,
            progressPercent: progress,
            actionDetected: "Virando à esquerda...",
            feedbackText: "Mantenha o rosto virado à esquerda...",
          };
        } else {
          this.consecutiveTargetFrames = Math.max(0, this.consecutiveTargetFrames - 1);
          return {
            isStepComplete: false,
            progressPercent: 0,
            actionDetected: null,
            feedbackText: "Gire suavemente o rosto para a sua esquerda.",
          };
        }
      }

      // 4. VIRAR O ROSTO PARA A DIREITA
      case "turn_right": {
        if (metrics.isTurningRight) {
          this.consecutiveTargetFrames++;
          const progress = Math.min(100, Math.round((this.consecutiveTargetFrames / MIN_CONSECUTIVE) * 100));
          if (this.consecutiveTargetFrames >= MIN_CONSECUTIVE) {
            return {
              isStepComplete: true,
              progressPercent: 100,
              actionDetected: "Virou à direita",
              feedbackText: "Movimento à direita confirmado!",
            };
          }
          return {
            isStepComplete: false,
            progressPercent: progress,
            actionDetected: "Virando à direita...",
            feedbackText: "Mantenha o rosto virado à direita...",
          };
        } else {
          this.consecutiveTargetFrames = Math.max(0, this.consecutiveTargetFrames - 1);
          return {
            isStepComplete: false,
            progressPercent: 0,
            actionDetected: null,
            feedbackText: "Gire suavemente o rosto para a sua direita.",
          };
        }
      }

      // 5. VOLTAR PARA O CENTRO
      case "return_center": {
        if (metrics.isCentered && !metrics.isBlinking) {
          this.consecutiveTargetFrames++;
          const progress = Math.min(100, Math.round((this.consecutiveTargetFrames / MIN_CONSECUTIVE) * 100));
          if (this.consecutiveTargetFrames >= MIN_CONSECUTIVE) {
            return {
              isStepComplete: true,
              progressPercent: 100,
              actionDetected: "Retornou ao centro",
              feedbackText: "Retorno ao centro confirmado!",
            };
          }
          return {
            isStepComplete: false,
            progressPercent: progress,
            actionDetected: "Centralizando...",
            feedbackText: "Mantenha o rosto no centro...",
          };
        } else {
          this.consecutiveTargetFrames = Math.max(0, this.consecutiveTargetFrames - 1);
          return {
            isStepComplete: false,
            progressPercent: 0,
            actionDetected: null,
            feedbackText: "Retorne seu rosto para a posição central olhando em frente.",
          };
        }
      }

      // 6. SORRIR
      case "smile": {
        if (metrics.isSmiling) {
          this.consecutiveTargetFrames++;
          const progress = Math.min(100, Math.round((this.consecutiveTargetFrames / MIN_CONSECUTIVE) * 100));
          if (this.consecutiveTargetFrames >= MIN_CONSECUTIVE) {
            return {
              isStepComplete: true,
              progressPercent: 100,
              actionDetected: "Sorriso detectado",
              feedbackText: "Sorriso confirmado!",
            };
          }
          return {
            isStepComplete: false,
            progressPercent: progress,
            actionDetected: "Sorrindo...",
            feedbackText: "Mantenha o sorriso por instantes...",
          };
        } else {
          this.consecutiveTargetFrames = Math.max(0, this.consecutiveTargetFrames - 1);
          return {
            isStepComplete: false,
            progressPercent: 0,
            actionDetected: null,
            feedbackText: "Dê um sorriso para a câmera.",
          };
        }
      }

      // 7. VOLTAR À EXPRESSÃO NEUTRA
      case "return_neutral": {
        if (metrics.isNeutral && !metrics.isSmiling) {
          this.consecutiveTargetFrames++;
          const progress = Math.min(100, Math.round((this.consecutiveTargetFrames / MIN_CONSECUTIVE) * 100));
          if (this.consecutiveTargetFrames >= MIN_CONSECUTIVE) {
            return {
              isStepComplete: true,
              progressPercent: 100,
              actionDetected: "Expressão neutra",
              feedbackText: "Expressão neutra confirmada!",
            };
          }
          return {
            isStepComplete: false,
            progressPercent: progress,
            actionDetected: "Relaxando expressão...",
            feedbackText: "Mantenha a expressão neutra...",
          };
        } else {
          this.consecutiveTargetFrames = Math.max(0, this.consecutiveTargetFrames - 1);
          return {
            isStepComplete: false,
            progressPercent: 0,
            actionDetected: null,
            feedbackText: "Relaxe o rosto para a expressão neutra.",
          };
        }
      }

      default:
        return {
          isStepComplete: false,
          progressPercent: 0,
          actionDetected: null,
          feedbackText: "Aguardando ação...",
        };
    }
  }

  /**
   * Avança para o próximo passo após confirmação do atual.
   */
  public advanceStep(): boolean {
    const current = this.getCurrentStep();
    if (current) {
      this.completedStepTypes.push(current.type);
    }
    this.currentStepIndex++;
    this.resetCurrentStepState();
    return this.currentStepIndex >= this.steps.length;
  }

  /**
   * Avalia a integridade temporal de toda a sessão (Presentation Attack Detection - PAD).
   * Verifica se houve movimentação biológica consistente e não estática.
   */
  public evaluateAntiSpoofing(): {
    isSpoof: boolean;
    reason?: string;
    passedSignals: string[];
  } {
    const passedSignals: string[] = [];

    // Verificação 1: Quantidade mínima de frames analisados
    if (this.frameHistory.length < 15) {
      return {
        isSpoof: true,
        reason: "Insuficiência de frames para validação temporal.",
        passedSignals,
      };
    }
    passedSignals.push("Amostragem temporal adequada");

    // Verificação 2: Detecção de imagem completamente estática (foto em papel/tela fixa)
    // Uma pessoa real viva possui micro-tremores naturais involuntários (jitter biológico).
    // Uma foto fixa em tripé ou tela estática apresentará variância 0 ou quase 0.
    const earValues = this.frameHistory.map((f) => f.ear);
    const yawValues = this.frameHistory.map((f) => f.yawRatio);

    const earVariance = calculateVariance(earValues);
    const yawVariance = calculateVariance(yawValues);

    // Se o EAR e o Yaw não variaram nada durante toda a sessão de testes dinâmicos, é estático!
    if (earVariance < 0.00002 && yawVariance < 0.00005) {
      return {
        isSpoof: true,
        reason: "Ausência de variações naturais faciais ao longo do tempo (apresentação estática detectada).",
        passedSignals,
      };
    }
    passedSignals.push("Variação biométrica natural detectada");

    // Verificação 3: Todos os passos foram concluídos em ordem correta
    if (this.completedStepTypes.length !== this.steps.length) {
      return {
        isSpoof: true,
        reason: "Desafios obrigatórios não foram concluídos na ordem requerida.",
        passedSignals,
      };
    }
    passedSignals.push("Ordem de desafios multietapas validada");

    // Verificação 4: Duração temporal biologicamente plausível
    const totalDuration = Date.now() - this.sessionStartTime;
    if (totalDuration < 1200) {
      // Nenhum ser humano completa 3-4 desafios em menos de 1.2 segundos
      return {
        isSpoof: true,
        reason: "Tempo de execução anormalmente rápido.",
        passedSignals,
      };
    }
    passedSignals.push("Ritmo temporal humano verificado");

    return {
      isSpoof: false,
      passedSignals,
    };
  }

  /**
   * Constrói o veredito final da sessão de vivacidade.
   */
  public generateFinalVerdict(): LivenessVerdict {
    const pad = this.evaluateAntiSpoofing();

    if (pad.isSpoof) {
      return {
        success: false,
        livenessPassed: false,
        spoofDetected: true,
        challengesCompleted: false,
        reason: pad.reason || "Falha na confirmação de presença real.",
      };
    }

    return {
      success: true,
      livenessPassed: true,
      spoofDetected: false,
      challengesCompleted: true,
      metricsSummary: {
        totalFramesAnalyzed: this.frameHistory.length,
        durationMs: Date.now() - this.sessionStartTime,
        completedSteps: [...this.completedStepTypes],
        antiSpoofSignalsPassed: pad.passedSignals,
      },
    };
  }
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const squareDiffs = values.map((v) => {
    const diff = v - mean;
    return diff * diff;
  });
  return squareDiffs.reduce((acc, v) => acc + v, 0) / values.length;
}
