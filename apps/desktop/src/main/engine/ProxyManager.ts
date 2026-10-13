import { request as httpsRequest } from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import type { ProxyInput, ProxyTestResult } from "@tubeanty/shared";

type ProxyAgentLike = Pick<ProxyInput, "protocol" | "host" | "port" | "username" | "password">;

interface GeoLookup {
  ip: string;
  countryCode?: string;
  timezone?: string;
}

/**
 * Mapa minimo de pais -> locale para sugerir navigator.languages coerente
 * com a geolocalizacao do proxy. Nao e exaustivo; o usuario pode editar o
 * valor sugerido na UI.
 */
const COUNTRY_TO_LOCALE: Record<string, string> = {
  BR: "pt-BR",
  PT: "pt-PT",
  US: "en-US",
  GB: "en-GB",
  CA: "en-CA",
  ES: "es-ES",
  MX: "es-MX",
  AR: "es-AR",
  FR: "fr-FR",
  DE: "de-DE",
  IT: "it-IT",
  NL: "nl-NL",
  JP: "ja-JP",
  KR: "ko-KR",
  CN: "zh-CN",
  IN: "en-IN",
  RU: "ru-RU",
  PL: "pl-PL",
  TR: "tr-TR",
};

function buildProxyUrl(input: ProxyAgentLike): string {
  const auth = input.username
    ? `${encodeURIComponent(input.username)}:${encodeURIComponent(input.password ?? "")}@`
    : "";
  const scheme = input.protocol === "SOCKS5" ? "socks5" : input.protocol.toLowerCase();
  return `${scheme}://${auth}${input.host}:${input.port}`;
}

function buildAgent(input: ProxyAgentLike): HttpsProxyAgent<string> | SocksProxyAgent {
  const url = buildProxyUrl(input);
  return input.protocol === "SOCKS5" ? new SocksProxyAgent(url) : new HttpsProxyAgent(url);
}

function getJsonViaAgent<T>(
  agent: HttpsProxyAgent<string> | SocksProxyAgent,
  host: string,
  path: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest({ host, path, method: "GET", agent, timeout: 10_000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch (error) {
          reject(error instanceof Error ? error : new Error("Resposta invalida do servico remoto."));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("Timeout ao testar proxy.")));
    req.on("error", reject);
    req.end();
  });
}

/**
 * Consulta feita atraves do proprio proxy (ve o IP de saida real), usada so
 * para sugerir timezone/idioma coerentes na UI — nunca para alterar
 * comportamento de fingerprint do navegador.
 */
async function lookupGeo(agent: HttpsProxyAgent<string> | SocksProxyAgent): Promise<GeoLookup> {
  const result = await getJsonViaAgent<{
    ip: string;
    country_code?: string;
    timezone?: string;
  }>(agent, "ipapi.co", "/json/");
  return { ip: result.ip, countryCode: result.country_code, timezone: result.timezone };
}

export async function testProxy(input: ProxyAgentLike): Promise<ProxyTestResult> {
  const agent = buildAgent(input);
  const start = Date.now();
  try {
    const geo = await lookupGeo(agent);
    return {
      ok: true,
      ip: geo.ip,
      latencyMs: Date.now() - start,
      countryCode: geo.countryCode,
      timezone: geo.timezone,
      locale: geo.countryCode ? COUNTRY_TO_LOCALE[geo.countryCode] : undefined,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha desconhecida ao testar proxy." };
  }
}
