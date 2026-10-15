import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import { BrowserWindow } from "electron";
import { buildAuthUrl, generatePkcePair } from "./GoogleOAuth";

const FLOW_TIMEOUT_MS = 5 * 60 * 1000;

export interface OAuthConsentResult {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

/**
 * Abre a tela de consentimento REAL do Google numa janela do Electron com
 * sessao efemera (particao sem "persist:", nunca tocada em disco — some
 * quando a janela fecha), pra cada autorizacao comecar sem vies de login de
 * outro perfil. Um servidor HTTP local efemero em 127.0.0.1 captura o
 * redirect com o authorization code; nada disso contorna login, captcha ou
 * qualquer verificacao do Google — e exatamente o fluxo OAuth padrao que
 * qualquer app desktop legitimo usa.
 */
export function runOAuthConsentFlow(clientId: string, profileId: string): Promise<OAuthConsentResult> {
  const { verifier, challenge } = generatePkcePair();
  const state = randomBytes(16).toString("hex");

  return new Promise((resolve, reject) => {
    let settled = false;
    let server: Server | null = null;
    let authWindow: BrowserWindow | null = null;
    let timeoutHandle: NodeJS.Timeout | null = null;

    function cleanup() {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (server) server.close();
      if (authWindow && !authWindow.isDestroyed()) authWindow.destroy();
    }

    function settleResolve(result: OAuthConsentResult) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    }

    function settleReject(error: Error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    }

    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404).end();
        return;
      }
      const error = url.searchParams.get("error");
      const returnedState = url.searchParams.get("state");
      const code = url.searchParams.get("code");

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<!doctype html><html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>${error ? "Falha na autorizacao" : "Autorizado"}</h2>
          <p>Pode fechar esta janela e voltar para o TubeAnty.</p>
        </body></html>`,
      );

      if (error) {
        settleReject(new Error(`Google recusou a autorizacao: ${error}`));
        return;
      }
      if (returnedState !== state) {
        settleReject(new Error("State OAuth nao corresponde (possivel tentativa invalida)."));
        return;
      }
      if (!code) {
        settleReject(new Error("Google nao retornou um authorization code."));
        return;
      }
      settleResolve({ code, codeVerifier: verifier, redirectUri: `http://127.0.0.1:${port}` });
    });

    server.listen(0, "127.0.0.1");
    const address = server.address();
    if (!address || typeof address === "string") {
      settleReject(new Error("Nao foi possivel abrir o servidor local de callback OAuth."));
      return;
    }
    const port = address.port;
    const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

    const authUrl = buildAuthUrl({ clientId, redirectUri, codeChallenge: challenge, state });

    authWindow = new BrowserWindow({
      width: 480,
      height: 680,
      title: "Conectar conta do YouTube",
      autoHideMenuBar: true,
      webPreferences: {
        partition: `oauth-${profileId}-${Date.now()}`,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    authWindow.on("closed", () => {
      settleReject(new Error("Janela de autorizacao fechada antes de concluir o login do Google."));
    });
    authWindow.loadURL(authUrl);

    timeoutHandle = setTimeout(() => {
      settleReject(new Error("Tempo esgotado aguardando a autorizacao do Google."));
    }, FLOW_TIMEOUT_MS);
  });
}
