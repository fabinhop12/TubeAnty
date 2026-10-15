import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAuthUrl, generatePkcePair, YOUTUBE_READONLY_SCOPES } from "./GoogleOAuth";

describe("generatePkcePair", () => {
  it("gera um verifier dentro da faixa de tamanho do RFC 7636 (43-128 chars)", () => {
    const { verifier } = generatePkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it("usa apenas caracteres URL-safe no verifier", () => {
    const { verifier } = generatePkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("deriva o challenge como SHA-256(verifier) em base64url, por S256", () => {
    const { verifier, challenge } = generatePkcePair();
    const expected = createHash("sha256").update(verifier).digest("base64url");
    expect(challenge).toBe(expected);
  });

  it("gera pares diferentes a cada chamada", () => {
    const a = generatePkcePair();
    const b = generatePkcePair();
    expect(a.verifier).not.toBe(b.verifier);
  });
});

describe("buildAuthUrl", () => {
  const baseOptions = {
    clientId: "client-123.apps.googleusercontent.com",
    redirectUri: "http://127.0.0.1:54321/oauth2callback",
    codeChallenge: "challenge-abc",
    state: "state-xyz",
  };

  it("aponta para o endpoint de autorizacao do Google", () => {
    const url = new URL(buildAuthUrl(baseOptions));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it("inclui todos os parametros PKCE e OAuth esperados", () => {
    const url = new URL(buildAuthUrl(baseOptions));
    expect(url.searchParams.get("client_id")).toBe(baseOptions.clientId);
    expect(url.searchParams.get("redirect_uri")).toBe(baseOptions.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge")).toBe(baseOptions.codeChallenge);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(baseOptions.state);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });

  it("usa os escopos somente-leitura do YouTube por padrao", () => {
    const url = new URL(buildAuthUrl(baseOptions));
    expect(url.searchParams.get("scope")).toBe(YOUTUBE_READONLY_SCOPES.join(" "));
  });

  it("permite sobrescrever os escopos", () => {
    const url = new URL(buildAuthUrl({ ...baseOptions, scopes: ["https://www.googleapis.com/auth/custom"] }));
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/custom");
  });
});
