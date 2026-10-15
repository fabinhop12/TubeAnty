import { createHash, randomBytes } from "node:crypto";
import { request as httpsRequest } from "node:https";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/**
 * Escopos minimos pra estatisticas de canal: leitura de dados do canal
 * (inscritos/visualizacoes/videos) e leitura de relatorios do YouTube
 * Analytics. Nenhum escopo de escrita, upload ou gerenciamento de contas.
 */
export const YOUTUBE_READONLY_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

export interface PkcePair {
  verifier: string;
  challenge: string;
}

/** RFC 7636: verifier aleatorio de 43-128 caracteres URL-safe. */
export function generatePkcePair(): PkcePair {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export interface BuildAuthUrlOptions {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scopes?: string[];
}

export function buildAuthUrl(options: BuildAuthUrlOptions): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (options.scopes ?? YOUTUBE_READONLY_SCOPES).join(" "));
  url.searchParams.set("code_challenge", options.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", options.state);
  // access_type=offline + prompt=consent garantem que um refresh_token
  // seja emitido mesmo se o usuario ja autorizou este app antes.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
  scope: string;
}

interface GoogleTokenApiResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

function postForm(body: URLSearchParams): Promise<GoogleTokenApiResponse> {
  const payload = body.toString();
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      TOKEN_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 15_000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data) as GoogleTokenApiResponse);
          } catch (error) {
            reject(error instanceof Error ? error : new Error("Resposta invalida do Google ao trocar token."));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Timeout na troca de token com o Google.")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export interface ExchangeCodeOptions {
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export async function exchangeCodeForTokens(options: ExchangeCodeOptions): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    code: options.code,
    code_verifier: options.codeVerifier,
    redirect_uri: options.redirectUri,
    grant_type: "authorization_code",
  });
  const result = await postForm(body);
  if (result.error) {
    throw new Error(result.error_description ?? result.error);
  }
  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresInSeconds: result.expires_in,
    scope: result.scope,
  };
}

export interface RefreshTokenOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function refreshAccessToken(options: RefreshTokenOptions): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    refresh_token: options.refreshToken,
    grant_type: "refresh_token",
  });
  const result = await postForm(body);
  if (result.error) {
    throw new Error(result.error_description ?? result.error);
  }
  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresInSeconds: result.expires_in,
    scope: result.scope,
  };
}
