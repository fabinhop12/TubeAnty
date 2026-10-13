import { app, ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { Profile as ProfileRow, Proxy as ProxyRow } from "@prisma/client";
import { IpcChannels } from "@tubeanty/shared";
import type { LaunchResult, Profile, ProfileInput, ProxyProtocol } from "@tubeanty/shared";
import { getOrCreateLocalUser, getPrismaClient } from "../db/prisma";
import { launchProfile, openYoutubeStudio, type LaunchOptions } from "../engine/ProfileEngine";

function toDto(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    userId: row.userId,
    proxyId: row.proxyId,
    userDataDir: row.userDataDir,
    timezone: row.timezone,
    locale: row.locale,
    userAgent: row.userAgent,
    viewportWidth: row.viewportWidth,
    viewportHeight: row.viewportHeight,
    notes: row.notes,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toLaunchOptions(row: ProfileRow & { proxy: ProxyRow | null }): LaunchOptions {
  return {
    userDataDir: row.userDataDir,
    viewportWidth: row.viewportWidth,
    viewportHeight: row.viewportHeight,
    locale: row.locale,
    timezone: row.timezone,
    userAgent: row.userAgent,
    proxy: row.proxy
      ? {
          // SQLite nao tem enum nativo; protocol e validado como ProxyProtocol
          // na fronteira do IPC (create/update de Proxy), nunca escrito fora desse union.
          protocol: row.proxy.protocol as ProxyProtocol,
          host: row.proxy.host,
          port: row.proxy.port,
          username: row.proxy.username,
          passwordCipher: row.proxy.passwordCipher,
        }
      : null,
  };
}

export function registerProfileHandlers(): void {
  const prisma = getPrismaClient();

  ipcMain.handle(IpcChannels.profiles.list, async (): Promise<Profile[]> => {
    const rows = await prisma.profile.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toDto);
  });

  ipcMain.handle(IpcChannels.profiles.create, async (_event, input: ProfileInput): Promise<Profile> => {
    const user = await getOrCreateLocalUser();
    const id = randomUUID();
    const userDataDir = join(app.getPath("userData"), "profiles-data", id);
    const row = await prisma.profile.create({
      data: {
        id,
        name: input.name,
        userId: user.id,
        proxyId: input.proxyId ?? null,
        userDataDir,
        timezone: input.timezone ?? null,
        locale: input.locale ?? null,
        userAgent: input.userAgent ?? null,
        viewportWidth: input.viewportWidth ?? 1366,
        viewportHeight: input.viewportHeight ?? 768,
        notes: input.notes ?? null,
      },
    });
    return toDto(row);
  });

  ipcMain.handle(
    IpcChannels.profiles.update,
    async (_event, id: string, input: Partial<ProfileInput>): Promise<Profile> => {
      const row = await prisma.profile.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.proxyId !== undefined && { proxyId: input.proxyId }),
          ...(input.timezone !== undefined && { timezone: input.timezone }),
          ...(input.locale !== undefined && { locale: input.locale }),
          ...(input.userAgent !== undefined && { userAgent: input.userAgent }),
          ...(input.viewportWidth !== undefined && { viewportWidth: input.viewportWidth }),
          ...(input.viewportHeight !== undefined && { viewportHeight: input.viewportHeight }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
      return toDto(row);
    },
  );

  ipcMain.handle(IpcChannels.profiles.delete, async (_event, id: string): Promise<void> => {
    await prisma.profile.delete({ where: { id } });
  });

  ipcMain.handle(IpcChannels.profiles.open, async (_event, id: string): Promise<LaunchResult> => {
    try {
      const row = await prisma.profile.findUniqueOrThrow({ where: { id }, include: { proxy: true } });
      await launchProfile(toLaunchOptions(row));
      await prisma.profile.update({ where: { id }, data: { lastOpenedAt: new Date() } });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Falha ao abrir perfil." };
    }
  });

  ipcMain.handle(IpcChannels.profiles.openYoutubeStudio, async (_event, id: string): Promise<LaunchResult> => {
    try {
      const row = await prisma.profile.findUniqueOrThrow({ where: { id }, include: { proxy: true } });
      await openYoutubeStudio(toLaunchOptions(row));
      await prisma.profile.update({ where: { id }, data: { lastOpenedAt: new Date() } });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Falha ao abrir YouTube Studio." };
    }
  });
}
