import { ipcMain } from "electron";
import type { YoutubeAccount as YoutubeAccountRow } from "@prisma/client";
import { IpcChannels } from "@tubeanty/shared";
import type { YoutubeAccount, YoutubeConnectResult } from "@tubeanty/shared";
import { getPrismaClient } from "../db/prisma";
import { getGoogleOAuthConfig } from "../db/settings";
import { decryptSecret, encryptSecret } from "../crypto/vault";
import { exchangeCodeForTokens, refreshAccessToken } from "../engine/GoogleOAuth";
import { runOAuthConsentFlow } from "../engine/YoutubeOAuthFlow";
import { fetchChannelInfo, fetchRecentViews } from "../engine/YoutubeApi";

function toDto(row: YoutubeAccountRow): YoutubeAccount {
  return {
    profileId: row.profileId,
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    subscriberCount: row.subscriberCount,
    viewCount: row.viewCount,
    videoCount: row.videoCount,
    recentViews48h: row.recentViews48h,
    lastStatsAt: row.lastStatsAt?.toISOString() ?? null,
  };
}

/** Troca o access token por um novo via refresh_token se estiver vencido (ou perto disso). */
async function getValidAccessToken(row: YoutubeAccountRow, clientId: string, clientSecret: string): Promise<string> {
  const prisma = getPrismaClient();
  const stillValidForAWhile = row.expiresAt.getTime() - Date.now() > 60_000;
  if (stillValidForAWhile) return decryptSecret(row.accessTokenCipher);

  const refreshed = await refreshAccessToken({
    clientId,
    clientSecret,
    refreshToken: decryptSecret(row.refreshTokenCipher),
  });
  const expiresAt = new Date(Date.now() + refreshed.expiresInSeconds * 1000);
  await prisma.youtubeAccount.update({
    where: { id: row.id },
    data: {
      accessTokenCipher: encryptSecret(refreshed.accessToken),
      ...(refreshed.refreshToken ? { refreshTokenCipher: encryptSecret(refreshed.refreshToken) } : {}),
      expiresAt,
    },
  });
  return refreshed.accessToken;
}

export function registerYoutubeHandlers(): void {
  const prisma = getPrismaClient();

  ipcMain.handle(
    IpcChannels.youtube.getAccount,
    async (_event, profileId: string): Promise<YoutubeAccount | null> => {
      const row = await prisma.youtubeAccount.findUnique({ where: { profileId } });
      return row ? toDto(row) : null;
    },
  );

  ipcMain.handle(IpcChannels.youtube.connect, async (_event, profileId: string): Promise<YoutubeConnectResult> => {
    try {
      const { clientId, clientSecret } = await getGoogleOAuthConfig();
      if (!clientId || !clientSecret) {
        return {
          ok: false,
          error: "Configure o Client ID e Client Secret do Google em Configuracoes antes de conectar um canal.",
        };
      }

      const consent = await runOAuthConsentFlow(clientId, profileId);
      const tokens = await exchangeCodeForTokens({
        clientId,
        clientSecret,
        code: consent.code,
        codeVerifier: consent.codeVerifier,
        redirectUri: consent.redirectUri,
      });
      if (!tokens.refreshToken) {
        return {
          ok: false,
          error:
            "Google nao retornou um refresh token. Revogue o acesso em myaccount.google.com/permissions e tente novamente.",
        };
      }

      const channel = await fetchChannelInfo(tokens.accessToken);
      const expiresAt = new Date(Date.now() + tokens.expiresInSeconds * 1000);
      const common = {
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        accessTokenCipher: encryptSecret(tokens.accessToken),
        refreshTokenCipher: encryptSecret(tokens.refreshToken),
        expiresAt,
        scope: tokens.scope,
        subscriberCount: channel.subscriberCount,
        viewCount: channel.viewCount,
        videoCount: channel.videoCount,
        lastStatsAt: new Date(),
      };

      await prisma.youtubeAccount.upsert({
        where: { profileId },
        create: { profileId, ...common },
        update: common,
      });

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Falha ao conectar com o YouTube." };
    }
  });

  ipcMain.handle(IpcChannels.youtube.disconnect, async (_event, profileId: string): Promise<void> => {
    await prisma.youtubeAccount.deleteMany({ where: { profileId } });
  });

  ipcMain.handle(
    IpcChannels.youtube.refreshStats,
    async (_event, profileId: string): Promise<YoutubeConnectResult> => {
      try {
        const row = await prisma.youtubeAccount.findUnique({ where: { profileId } });
        if (!row) return { ok: false, error: "Nenhuma conta do YouTube conectada para este perfil." };

        const { clientId, clientSecret } = await getGoogleOAuthConfig();
        if (!clientId || !clientSecret) {
          return { ok: false, error: "Configuracao do Google OAuth ausente." };
        }

        const accessToken = await getValidAccessToken(row, clientId, clientSecret);
        const channel = await fetchChannelInfo(accessToken);
        const recentViews48h = await fetchRecentViews(accessToken, channel.channelId).catch(() => null);

        await prisma.youtubeAccount.update({
          where: { profileId },
          data: {
            channelTitle: channel.channelTitle,
            subscriberCount: channel.subscriberCount,
            viewCount: channel.viewCount,
            videoCount: channel.videoCount,
            recentViews48h,
            lastStatsAt: new Date(),
          },
        });

        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Falha ao atualizar estatisticas do YouTube.",
        };
      }
    },
  );
}
