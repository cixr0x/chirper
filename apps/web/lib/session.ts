import "server-only";

import { cookies } from "next/headers";
import { getCurrentSession, type SessionEnvelope } from "./bff";

const sessionCookieName = "chirper_session";

function useSecureSessionCookie() {
  const explicit = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (explicit === "true") {
    return true;
  }
  if (explicit === "false") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(sessionCookieName)?.value ?? null;
}

export async function setSessionToken(sessionToken: string, expiresAt: string) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, sessionToken, {
    httpOnly: true,
    expires: new Date(expiresAt),
    path: "/",
    sameSite: "lax",
    secure: useSecureSessionCookie(),
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function getSessionState(): Promise<SessionEnvelope | null> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    return null;
  }

  const session = await getCurrentSession(sessionToken);
  if (!session) {
    return null;
  }

  return session;
}

export async function getSessionViewer() {
  const session = await getSessionState();
  return session?.viewer ?? null;
}
