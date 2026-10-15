import { getPrismaClient } from "./prisma";
import { decryptSecret, encryptSecret } from "../crypto/vault";

const CLIENT_ID_KEY = "google_oauth_client_id";
const CLIENT_SECRET_KEY = "google_oauth_client_secret_cipher";

export async function getGoogleOAuthConfig(): Promise<{ clientId: string | null; clientSecret: string | null }> {
  const prisma = getPrismaClient();
  const rows = await prisma.appSetting.findMany({ where: { key: { in: [CLIENT_ID_KEY, CLIENT_SECRET_KEY] } } });
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const clientId = map.get(CLIENT_ID_KEY) ?? null;
  const clientSecretCipher = map.get(CLIENT_SECRET_KEY) ?? null;
  return { clientId, clientSecret: clientSecretCipher ? decryptSecret(clientSecretCipher) : null };
}

export async function setGoogleOAuthConfig(clientId: string, clientSecret: string): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: CLIENT_ID_KEY },
      create: { key: CLIENT_ID_KEY, value: clientId },
      update: { value: clientId },
    }),
    prisma.appSetting.upsert({
      where: { key: CLIENT_SECRET_KEY },
      create: { key: CLIENT_SECRET_KEY, value: encryptSecret(clientSecret) },
      update: { value: encryptSecret(clientSecret) },
    }),
  ]);
}
