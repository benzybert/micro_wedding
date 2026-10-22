import { createHash, randomBytes } from "node:crypto";

/** 128-bit URL-safe random token (22 chars). */
export function newToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
