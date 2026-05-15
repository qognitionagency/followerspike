import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { requiredEnv } from "@/lib/env";

function key(): Buffer {
  return createHash("sha256").update(requiredEnv("SESSION_ENCRYPTION_KEY")).digest();
}

export function encryptLinkedInSession(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptLinkedInSession(value: string): string {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) {
    throw new Error("Invalid encrypted LinkedIn session format");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
