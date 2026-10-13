import { ipcMain } from "electron";
import type { Proxy as ProxyRow } from "@prisma/client";
import { IpcChannels } from "@tubeanty/shared";
import type { Proxy, ProxyInput, ProxyProtocol, ProxyTestResult } from "@tubeanty/shared";
import { getPrismaClient } from "../db/prisma";
import { encryptSecret } from "../crypto/vault";
import { testProxy } from "../engine/ProxyManager";

function toDto(row: ProxyRow): Proxy {
  return {
    id: row.id,
    label: row.label,
    // SQLite nao tem enum nativo; protocol e validado como ProxyProtocol
    // na fronteira do IPC (create/update), nunca escrito fora desse union.
    protocol: row.protocol as ProxyProtocol,
    host: row.host,
    port: row.port,
    username: row.username,
    rotationUrl: row.rotationUrl,
    lastIp: row.lastIp,
    lastLatencyMs: row.lastLatencyMs,
    lastCountryCode: row.lastCountryCode,
    lastTimezone: row.lastTimezone,
    lastLocale: row.lastLocale,
    lastCheckAt: row.lastCheckAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function registerProxyHandlers(): void {
  const prisma = getPrismaClient();

  ipcMain.handle(IpcChannels.proxies.list, async (): Promise<Proxy[]> => {
    const rows = await prisma.proxy.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toDto);
  });

  ipcMain.handle(IpcChannels.proxies.create, async (_event, input: ProxyInput): Promise<Proxy> => {
    const row = await prisma.proxy.create({
      data: {
        label: input.label,
        protocol: input.protocol,
        host: input.host,
        port: input.port,
        username: input.username ?? null,
        passwordCipher: input.password ? encryptSecret(input.password) : null,
        rotationUrl: input.rotationUrl ?? null,
      },
    });
    return toDto(row);
  });

  ipcMain.handle(
    IpcChannels.proxies.update,
    async (_event, id: string, input: Partial<ProxyInput>): Promise<Proxy> => {
      const row = await prisma.proxy.update({
        where: { id },
        data: {
          ...(input.label !== undefined && { label: input.label }),
          ...(input.protocol !== undefined && { protocol: input.protocol }),
          ...(input.host !== undefined && { host: input.host }),
          ...(input.port !== undefined && { port: input.port }),
          ...(input.username !== undefined && { username: input.username }),
          ...(input.password !== undefined && {
            passwordCipher: input.password ? encryptSecret(input.password) : null,
          }),
          ...(input.rotationUrl !== undefined && { rotationUrl: input.rotationUrl }),
        },
      });
      return toDto(row);
    },
  );

  ipcMain.handle(IpcChannels.proxies.delete, async (_event, id: string): Promise<void> => {
    await prisma.proxy.delete({ where: { id } });
  });

  ipcMain.handle(
    IpcChannels.proxies.test,
    async (_event, id: string | null, input: ProxyInput): Promise<ProxyTestResult> => {
      const result = await testProxy(input);
      if (id && result.ok) {
        await prisma.proxy.update({
          where: { id },
          data: {
            lastIp: result.ip ?? null,
            lastLatencyMs: result.latencyMs ?? null,
            lastCountryCode: result.countryCode ?? null,
            lastTimezone: result.timezone ?? null,
            lastLocale: result.locale ?? null,
            lastCheckAt: new Date(),
          },
        });
      }
      return result;
    },
  );

  ipcMain.handle(
    IpcChannels.proxies.rotateIp,
    async (_event, id: string): Promise<{ ok: boolean; error?: string }> => {
      const proxy = await prisma.proxy.findUniqueOrThrow({ where: { id } });
      if (!proxy.rotationUrl) {
        return { ok: false, error: "Nenhuma URL de rotacao configurada para este proxy." };
      }
      try {
        const res = await fetch(proxy.rotationUrl, { signal: AbortSignal.timeout(15_000) });
        return { ok: res.ok };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Falha ao rotacionar IP." };
      }
    },
  );
}
