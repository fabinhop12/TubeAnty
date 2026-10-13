import { chromium, type BrowserContext } from "playwright-core";
import { decryptSecret } from "../crypto/vault";

export interface LaunchProxyOptions {
  protocol: "HTTP" | "HTTPS" | "SOCKS5";
  host: string;
  port: number;
  username?: string | null;
  passwordCipher?: string | null;
}

export interface LaunchOptions {
  userDataDir: string;
  viewportWidth: number;
  viewportHeight: number;
  locale?: string | null;
  timezone?: string | null;
  userAgent?: string | null;
  proxy?: LaunchProxyOptions | null;
}

/**
 * Lanca um contexto Chromium persistente e isolado para o perfil: mesma
 * pasta de dados sempre, proxy proprio, sem nenhum motor de evasao de
 * fingerprint contra o Google — so isolamento de sessao/rede por perfil.
 */
export async function launchProfile(options: LaunchOptions): Promise<BrowserContext> {
  const proxyConfig = options.proxy
    ? {
        server: `${options.proxy.protocol.toLowerCase()}://${options.proxy.host}:${options.proxy.port}`,
        username: options.proxy.username ?? undefined,
        password: options.proxy.passwordCipher ? decryptSecret(options.proxy.passwordCipher) : undefined,
      }
    : undefined;

  return chromium.launchPersistentContext(options.userDataDir, {
    headless: false,
    proxy: proxyConfig,
    viewport: { width: options.viewportWidth, height: options.viewportHeight },
    locale: options.locale ?? undefined,
    timezoneId: options.timezone ?? undefined,
    userAgent: options.userAgent ?? undefined,
  });
}

export async function openYoutubeStudio(options: LaunchOptions): Promise<BrowserContext> {
  const context = await launchProfile(options);
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://studio.youtube.com/");
  return context;
}
