import { app } from "electron";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const dbPath = join(app.getPath("userData"), "tubeanty.db");
  return `file:${dbPath}`;
}

let client: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!client) {
    process.env.DATABASE_URL = resolveDatabaseUrl();
    client = new PrismaClient();
  }
  return client;
}

/**
 * TubeAnty v1 e mono-usuario por instalacao: este e o proprietario local
 * implicito ao qual todo Profile fica associado. Contas multi-usuario sao
 * um passo futuro do roadmap.
 */
export async function getOrCreateLocalUser() {
  const prisma = getPrismaClient();
  const existing = await prisma.user.findFirst();
  if (existing) return existing;
  return prisma.user.create({ data: { email: "local@tubeanty.app", name: "Local" } });
}
