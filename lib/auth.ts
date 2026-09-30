import crypto from "crypto";

function getCookieStore() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nextHeaders = require("next/headers");
    return nextHeaders.cookies();
  } catch {
    return null;
  }
}


const SESSION_COOKIE_NAME = "facial_mvp_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "facial-recognition-mvp-secret-key-2026";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias em segundos

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  exp: number;
}

/**
 * Cria o hash seguro de uma senha com salt aleatório usando scrypt nativo
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Valida a senha contra o hash armazenado
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

function sign(payloadStr: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadStr)
    .digest("hex");
}

/**
 * Cria um token de sessão assinado
 */
export function createSessionToken(data: { userId: string; email: string; name: string }): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload: SessionPayload = {
    userId: data.userId,
    email: data.email,
    name: data.name,
    exp,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

/**
 * Valida e decodifica o token de sessão
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    const expectedSig = sign(payloadBase64);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const json = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload: SessionPayload = JSON.parse(json);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expirado
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Configura o cookie de sessão httpOnly
 */
export function setSessionCookie(token: string) {
  const cookieStore = getCookieStore();
  if (!cookieStore) return;
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Limpa o cookie de sessão
 */
export function clearSessionCookie() {
  const cookieStore = getCookieStore();
  if (!cookieStore) return;
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Obtém a sessão atual a partir dos cookies da requisição
 */
export function getCurrentSession(): SessionPayload | null {
  try {
    const cookieStore = getCookieStore();
    if (!cookieStore) return null;
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) return null;
    return verifySessionToken(sessionCookie.value);
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME };
