import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(encryptedString: string): string {
  const [ivB64, authTagB64, dataB64] = encryptedString.split(":");
  const decipher = crypto.createDecipheriv(
    ALGORITHM, getEncryptionKey(), Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return decipher.update(Buffer.from(dataB64, "base64")) + decipher.final("utf8");
}
