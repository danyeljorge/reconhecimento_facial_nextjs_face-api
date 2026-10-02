/**
 * TURNSTILE & SISRU ACCESS INTEGRATION SERVICE
 * 
 * Responsável pela comunicação com o sistema SISRU e com o banco de dados / API das catracas.
 * 
 * Regra de Negócio:
 * - A foto capturada na verificação de vivacidade NÃO é persistida permanentemente no banco SQLite local.
 * - A foto é enviada diretamente ao endpoint da catraca/SISRU para cadastro do controle de acesso físico.
 * - O banco local mantém apenas o estado lógico (hasFaceRegistered = true, timestamps e auditorias).
 */

export interface TurnstileAccessPayload {
  userId: string;
  name: string;
  cpf: string;
  siap: string;
  userType: string;
  photoBase64: string;
  timestamp: string;
}

export interface TurnstileAccessResult {
  success: boolean;
  message: string;
  turnstileSyncId?: string;
  externalResponseCode?: number;
}

export class TurnstileService {
  private turnstileApiUrl: string;
  private turnstileApiKey: string;
  private saveLocalPhoto: boolean;

  constructor() {
    this.turnstileApiUrl = process.env.TURNSTILE_API_URL || "";
    this.turnstileApiKey = process.env.TURNSTILE_API_KEY || "";
    this.saveLocalPhoto = process.env.SAVE_LOCAL_PHOTO === "true";
  }

  /**
   * Indica se a foto deve ser salva no banco local (padrão: false para não salvar localmente).
   */
  public shouldSaveLocalPhoto(): boolean {
    return this.saveLocalPhoto;
  }

  /**
   * Envia os dados biométricos e foto para a API da catraca / SISRU.
   */
  public async sendPhotoToTurnstile(
    payload: TurnstileAccessPayload
  ): Promise<TurnstileAccessResult> {
    const logPrefix = `[SISRU / Turnstile Integration] [CPF: ${payload.cpf}]`;

    // Se houver uma URL configurada para o banco/API da catraca, envia a requisição HTTP
    if (this.turnstileApiUrl) {
      try {
        console.log(`${logPrefix} Enviando foto e biometria para a catraca: ${this.turnstileApiUrl}...`);

        const res = await fetch(this.turnstileApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.turnstileApiKey
              ? { Authorization: `Bearer ${this.turnstileApiKey}` }
              : {}),
          },
          body: JSON.stringify({
            userId: payload.userId,
            name: payload.name,
            cpf: payload.cpf,
            siap: payload.siap,
            userType: payload.userType,
            faceImage: payload.photoBase64,
            capturedAt: payload.timestamp,
            origin: "RECFACIAL_LIVENESS_SYSTEM",
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`${logPrefix} Erro retornado pela API da catraca: ${res.status} - ${errorText}`);
          return {
            success: false,
            message: `Falha na sincronização com a catraca (${res.status}).`,
            externalResponseCode: res.status,
          };
        }

        const data = await res.json().catch(() => ({}));
        console.log(`${logPrefix} Biometria facial sincronizada com sucesso na catraca!`);

        return {
          success: true,
          message: "Biometria enviada com sucesso para a catraca.",
          turnstileSyncId: data.syncId || data.id || `sync_${Date.now()}`,
          externalResponseCode: res.status,
        };
      } catch (err: unknown) {
        console.error(`${logPrefix} Falha de conexão com a API da catraca:`, err);
        return {
          success: false,
          message: "Erro de comunicação com o serviço externo da catraca.",
        };
      }
    }

    // Modo Standalone / Homologação (quando TURNSTILE_API_URL não estiver configurada no .env):
    // Simula a integração com sucesso garantido para desenvolvimento e testes
    console.log(
      `${logPrefix} [Modo de Integração Ativo] Foto recebida (${Math.round(
        payload.photoBase64.length / 1024
      )} KB). Simulando envio direto para o banco de dados da catraca (TURNSTILE_API_URL não definida).`
    );

    return {
      success: true,
      message: "Biometria processada e despachada para o sistema de acesso da catraca (Simulado).",
      turnstileSyncId: `mock_turnstile_${Date.now()}`,
    };
  }
}

export const turnstileService = new TurnstileService();
