import { request as httpsRequest } from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import type { ProxyInput, ProxyTestResult } from "@tubeanty/shared";

type ProxyAgentLike = Pick<ProxyInput, "protocol" | "host" | "port" | "username" | "password">;

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

function fetchIpViaAgent(agent: HttpsProxyAgent<string> | SocksProxyAgent): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        host: "api.ipify.org",
        path: "/?format=json",
        method: "GET",
        agent,
        timeout: 10_000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data) as { ip: string };
            resolve(parsed.ip);
          } catch (error) {
            reject(error instanceof Error ? error : new Error("Resposta invalida do servico de IP."));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Timeout ao testar proxy.")));
    req.on("error", reject);
    req.end();
  });
}

export async function testProxy(input: ProxyAgentLike): Promise<ProxyTestResult> {
  const agent = buildAgent(input);
  const start = Date.now();
  try {
    const ip = await fetchIpViaAgent(agent);
    return { ok: true, ip, latencyMs: Date.now() - start };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Falha desconhecida ao testar proxy." };
  }
}
