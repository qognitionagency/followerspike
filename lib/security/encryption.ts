/**
 * Symmetric encryption for secrets at rest.
 *
 * AES-256-GCM, with the key derived from `SESSION_ENCRYPTION_KEY` by SHA-256 so
 * any passphrase length works. The serialized form is
 * `base64(iv).base64(authTag).base64(ciphertext)`; a fresh 12-byte IV per call
 * means the same plaintext never encrypts to the same string twice, and the
 * auth tag makes tampering a decrypt failure rather than garbage output.
 *
 * Used for `social_accounts.access_token_enc` / `refresh_token_enc` via
 * `lib/platforms/tokens.ts`. Server-only — `SESSION_ENCRYPTION_KEY` must never
 * reach a client bundle.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { requiredEnv } from "@/lib/env";

function key(): Buffer {
  return createHash("sha256").update(requiredEnv("SESSION_ENCRYPTION_KEY")).digest();
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string): string {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) {
    throw new Error("Invalid encrypted value format");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * @deprecated Named for the retired LinkedIn session store; the implementation
 * was never LinkedIn-specific. Use `encryptSecret`.
 */
export const encryptLinkedInSession = encryptSecret;

/**
 * @deprecated Use `decryptSecret`. Ciphertext written under the old name
 * decrypts unchanged — the algorithm and serialized format are identical.
 */
export const decryptLinkedInSession = decryptSecret;
