import { describe, expect, it } from "vitest";
import { buildProxyUrl, COUNTRY_TO_LOCALE, type ProxyAgentLike } from "./ProxyManager";

describe("buildProxyUrl", () => {
  it("monta URL HTTP sem autenticacao", () => {
    const input: ProxyAgentLike = { protocol: "HTTP", host: "1.2.3.4", port: 8080 };
    expect(buildProxyUrl(input)).toBe("http://1.2.3.4:8080");
  });

  it("monta URL HTTPS sem autenticacao", () => {
    const input: ProxyAgentLike = { protocol: "HTTPS", host: "proxy.example.com", port: 443 };
    expect(buildProxyUrl(input)).toBe("https://proxy.example.com:443");
  });

  it("usa o esquema socks5 (minusculo) para SOCKS5", () => {
    const input: ProxyAgentLike = { protocol: "SOCKS5", host: "1.2.3.4", port: 1080 };
    expect(buildProxyUrl(input)).toBe("socks5://1.2.3.4:1080");
  });

  it("inclui usuario e senha codificados quando presentes", () => {
    const input: ProxyAgentLike = {
      protocol: "HTTP",
      host: "1.2.3.4",
      port: 8080,
      username: "user@domain",
      password: "p@ss:word",
    };
    expect(buildProxyUrl(input)).toBe("http://user%40domain:p%40ss%3Aword@1.2.3.4:8080");
  });

  it("omite o bloco de autenticacao quando nao ha usuario", () => {
    const input: ProxyAgentLike = { protocol: "HTTP", host: "1.2.3.4", port: 8080, password: "ignorada-sem-user" };
    expect(buildProxyUrl(input)).toBe("http://1.2.3.4:8080");
  });

  it("usa senha vazia quando ha usuario mas nenhuma senha informada", () => {
    const input: ProxyAgentLike = { protocol: "HTTP", host: "1.2.3.4", port: 8080, username: "user" };
    expect(buildProxyUrl(input)).toBe("http://user:@1.2.3.4:8080");
  });
});

describe("COUNTRY_TO_LOCALE", () => {
  it("mapeia o Brasil para pt-BR", () => {
    expect(COUNTRY_TO_LOCALE.BR).toBe("pt-BR");
  });

  it("nao tem sugestao para um codigo de pais desconhecido", () => {
    expect(COUNTRY_TO_LOCALE.ZZ).toBeUndefined();
  });
});
