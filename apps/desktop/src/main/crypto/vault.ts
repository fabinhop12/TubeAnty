import { app } from "electron";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KEY_FILE = "vault.key";

/**
 * Chave mestra em arquivo com permissao restrita (0600), nao no keychain do
 * OS. Suficiente para um vault local de SQLite; trocar por `keytar` antes de
 * distribuir um build que precise sobreviver a copia deste arquivo para
 * outra maquina.
 */
function getMasterKey(): Buffer {
  const dir = app.getPath("userData");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, KEY_FILE);
  if (existsSync(path)) {
    return readFileSync(path);
  }
  const key = randomBytes(32);
  writeFileSync(path, key, { mode: 0o600 });
  return key;
}

export function encryptSecret(plainText: string): string {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const key = getMasterKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
