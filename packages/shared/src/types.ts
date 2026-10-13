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
