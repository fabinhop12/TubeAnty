export type ProxyProtocol = "HTTP" | "HTTPS" | "SOCKS5";

export interface Proxy {
  id: string;
  label: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username: string | null;
  /** Never sent to renderer in plain text; present only in create/update payloads. */
  password?: string | null;
  rotationUrl: string | null;
  lastIp: string | null;
  lastLatencyMs: number | null;
  lastCountryCode: string | null;
  lastTimezone: string | null;
  lastLocale: string | null;
  lastCheckAt: string | null;
  createdAt: string;
}

export interface ProxyInput {
  label: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  rotationUrl?: string | null;
}

export interface ProxyTestResult {
  ok: boolean;
  ip?: string;
  latencyMs?: number;
  countryCode?: string;
  timezone?: string;
  locale?: string;
  error?: string;
}

export interface Profile {
  id: string;
  name: string;
  userId: string;
  proxyId: string | null;
  group: string | null;
  userDataDir: string;
  timezone: string | null;
  locale: string | null;
  userAgent: string | null;
  viewportWidth: number;
  viewportHeight: number;
  notes: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
}

export interface ProfileInput {
  name: string;
  proxyId?: string | null;
  group?: string | null;
  timezone?: string | null;
  locale?: string | null;
  userAgent?: string | null;
  viewportWidth?: number;
  viewportHeight?: number;
  notes?: string | null;
}

export interface LaunchResult {
  ok: boolean;
  error?: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  /** Nunca enviado ao renderer; presente so no payload de escrita. */
  clientSecret?: string;
  /** true se um client secret ja foi salvo (sem revelar o valor). */
  hasClientSecret: boolean;
}

export interface GoogleOAuthConfigInput {
  clientId: string;
  clientSecret: string;
}

/**
 * Estatisticas de canal disponiveis pela YouTube Data/Analytics API oficial.
 * Status de monetizacao e alertas de strike NAO existem em nenhuma API
 * publica do Google — nao e omissao, e indisponibilidade da plataforma.
 */
export interface YoutubeAccount {
  profileId: string;
  channelId: string;
  channelTitle: string;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
  /** Visualizacoes nos ultimos ~2 dias via YouTube Analytics API; sujeito a atraso de processamento do lado do Google (nao e tempo real). */
  recentViews48h: number | null;
  lastStatsAt: string | null;
}

export interface YoutubeConnectResult {
  ok: boolean;
  error?: string;
}
