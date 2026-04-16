import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const minPasswordLength = 8;
const maxPasswordLength = 72;
const handlePattern = /^[a-z0-9_]{3,24}$/;

export function normalizeHandle(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePassword(value: string) {
  return value.trim();
}

export function validateHandle(handle: string) {
  if (!handlePattern.test(handle)) {
    return "Handles must be 3-24 characters using lowercase letters, numbers, or underscores.";
  }

  return null;
}

export function validateDisplayName(displayName: string) {
  if (displayName.length < 2 || displayName.length > 64) {
    return "Display names must be between 2 and 64 characters.";
  }

  return null;
}

export function validatePassword(password: string) {
  if (password.length < minPasswordLength || password.length > maxPasswordLength) {
    return `Passwords must be between ${minPasswordLength} and ${maxPasswordLength} characters.`;
  }

  return null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedBuffer = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedBuffer.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, salt, expectedHashHex] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHashHex) {
    return false;
  }

  const expectedHash = Buffer.from(expectedHashHex, "hex");
  const derivedBuffer = (await scrypt(password, salt, expectedHash.length)) as Buffer;
  if (derivedBuffer.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, expectedHash);
}
