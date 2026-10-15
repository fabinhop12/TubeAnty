import { request as httpsRequest } from "node:https";

interface GoogleApiErrorBody {
  error?: { message?: string };
}

function getJson<T>(url: string, accessToken: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = httpsRequest(
      {
        host: target.host,
        path: `${target.pathname}${target.search}`,
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15_000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          let parsed: unknown;
          try {
            parsed = JSON.parse(data);
          } catch {
            reject(new Error(`Resposta invalida da API do Google (status ${status}).`));
            return;
          }
          if (status < 200 || status >= 300) {
            const message = (parsed as GoogleApiErrorBody).error?.message ?? `status ${status}`;
            reject(new Error(`Erro na API do YouTube: ${message}`));
            return;
          }
          resolve(parsed as T);
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("Timeout na chamada a API do YouTube.")));
    req.on("error", reject);
    req.end();
  });
}

export interface ChannelInfo {
  channelId: string;
  channelTitle: string;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
}

interface ChannelsListResponse {
  items: Array<{
    id: string;
    snippet: { title: string };
    statistics: {
      subscriberCount?: string;
      viewCount?: string;
      videoCount?: string;
      hiddenSubscriberCount?: boolean;
    };
  }>;
}

/** Dados do proprio canal autenticado (nunca de terceiros: `mine=true`). */
export async function fetchChannelInfo(accessToken: string): Promise<ChannelInfo> {
  const url = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true";
  const response = await getJson<ChannelsListResponse>(url, accessToken);
  const channel = response.items[0];
  if (!channel) {
    throw new Error("Nenhum canal do YouTube encontrado para esta conta do Google.");
  }
  return {
    channelId: channel.id,
    channelTitle: channel.snippet.title,
    subscriberCount: channel.statistics.hiddenSubscriberCount
      ? null
      : parseCount(channel.statistics.subscriberCount),
    viewCount: parseCount(channel.statistics.viewCount),
    videoCount: parseCount(channel.statistics.videoCount),
  };
}

function parseCount(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface AnalyticsReportsResponse {
  rows?: number[][];
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Soma de visualizacoes nos ultimos ~2 dias via YouTube Analytics API.
 * Sujeito ao atraso normal de processamento de dados do lado do Google
 * (geralmente 1-2 dias) — nao e uma contagem em tempo real.
 */
export async function fetchRecentViews(accessToken: string, channelId: string): Promise<number | null> {
  const end = new Date();
  const start = new Date(end.getTime() - 2 * 24 * 60 * 60 * 1000);
  const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  url.searchParams.set("ids", `channel==${channelId}`);
  url.searchParams.set("startDate", formatDate(start));
  url.searchParams.set("endDate", formatDate(end));
  url.searchParams.set("metrics", "views");

  const response = await getJson<AnalyticsReportsResponse>(url.toString(), accessToken);
  const total = response.rows?.[0]?.[0];
  return typeof total === "number" ? total : null;
}
