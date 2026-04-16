"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSession, getSessionToken, setSessionToken } from "../lib/session";

const bffBaseUrl = process.env.NEXT_PUBLIC_BFF_URL ?? "http://127.0.0.1:4000";

function sessionHeaders(sessionToken: string): HeadersInit {
  return {
    "content-type": "application/json",
    "x-chirper-session-token": sessionToken,
  };
}

function withSearchParams(targetPath: string, updates: Record<string, string | undefined>) {
  const [pathname = "/", search = ""] = targetPath.split("?");
  const params = new URLSearchParams(search);

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function signInAction(formData: FormData) {
  const handle = String(formData.get("handle") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/").trim() || "/";

  if (!handle || !password) {
    redirect(withSearchParams(redirectTo, { auth: "invalid-login" }));
  }

  const response = await fetch(`${bffBaseUrl}/api/session/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ handle, password }),
    cache: "no-store",
  });

  if (!response.ok) {
    redirect(withSearchParams(redirectTo, { auth: "invalid-login" }));
  }

  const payload = (await response.json()) as {
    sessionToken: string;
    expiresAt: string;
  };
  await setSessionToken(payload.sessionToken, payload.expiresAt);
  redirect(withSearchParams(redirectTo, { auth: undefined, account: undefined }));
}

export async function registerAction(formData: FormData) {
  const handle = String(formData.get("handle") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/").trim() || "/";

  if (!handle || !displayName || !password) {
    redirect(withSearchParams(redirectTo, { auth: "invalid-register" }));
  }

  const response = await fetch(`${bffBaseUrl}/api/session/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ handle, displayName, password }),
    cache: "no-store",
  });

  if (response.status === 409) {
    redirect(withSearchParams(redirectTo, { auth: "handle-taken" }));
  }

  if (!response.ok) {
    redirect(withSearchParams(redirectTo, { auth: "invalid-register" }));
  }

  const payload = (await response.json()) as {
    sessionToken: string;
    expiresAt: string;
  };
  await setSessionToken(payload.sessionToken, payload.expiresAt);
  redirect(withSearchParams("/onboarding", { account: "registered" }));
}

export async function signOutAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/").trim() || "/";
  const sessionToken = await getSessionToken();

  if (sessionToken) {
    await fetch(`${bffBaseUrl}/api/session/revoke`, {
      method: "POST",
      headers: sessionHeaders(sessionToken),
      cache: "no-store",
    }).catch(() => undefined);
  }

  await clearSession();
  redirect(redirectTo);
}

export async function changePasswordAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/").trim() || "/";
  const currentPassword = String(formData.get("currentPassword") ?? "").trim();
  const nextPassword = String(formData.get("nextPassword") ?? "").trim();
  const sessionToken = await getSessionToken();

  if (!sessionToken || !currentPassword || !nextPassword) {
    redirect(withSearchParams(redirectTo, { account: "password-error" }));
  }

  const response = await fetch(`${bffBaseUrl}/api/account/password/change`, {
    method: "POST",
    headers: sessionHeaders(sessionToken),
    body: JSON.stringify({
      currentPassword,
      nextPassword,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    redirect(withSearchParams(redirectTo, { account: "password-error" }));
  }

  redirect(withSearchParams(redirectTo, { account: "password-changed" }));
}

export async function requestPasswordResetAction(formData: FormData) {
  const handle = String(formData.get("handle") ?? "").trim();

  if (!handle) {
    redirect(withSearchParams("/reset", { status: "invalid-request" }));
  }

  const response = await fetch(`${bffBaseUrl}/api/account/password/reset/request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ handle }),
    cache: "no-store",
  });

  if (!response.ok) {
    redirect(withSearchParams("/reset", { status: "invalid-request", handle }));
  }

  const payload = (await response.json()) as {
    accepted: boolean;
    previewToken?: string;
    expiresAt?: string;
  };

  redirect(
    withSearchParams("/reset", {
      status: "requested",
      handle,
      token: payload.previewToken,
      expiresAt: payload.expiresAt,
    }),
  );
}

export async function resetPasswordAction(formData: FormData) {
  const resetToken = String(formData.get("resetToken") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();

  if (!resetToken || !newPassword) {
    redirect(withSearchParams("/reset", { status: "invalid-token", token: resetToken || undefined }));
  }

  const response = await fetch(`${bffBaseUrl}/api/account/password/reset/confirm`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      resetToken,
      newPassword,
    }),
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect(withSearchParams("/reset", { status: "invalid-token", token: resetToken }));
  }

  if (!response.ok) {
    redirect(withSearchParams("/reset", { status: "invalid-password", token: resetToken }));
  }

  const payload = (await response.json()) as {
    sessionToken: string;
    expiresAt: string;
  };
  await setSessionToken(payload.sessionToken, payload.expiresAt);
  redirect(withSearchParams("/", { account: "password-reset", auth: undefined }));
}

export async function saveProfileAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/").trim() || "/";
  const successState = String(formData.get("successState") ?? "profile-saved").trim() || "profile-saved";
  const bio = String(formData.get("bio") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const avatarSourceUrl = String(formData.get("avatarSourceUrl") ?? "").trim();
  const bannerSourceUrl = String(formData.get("bannerSourceUrl") ?? "").trim();
  const clearAvatar = formData.get("clearAvatar") === "1";
  const clearBanner = formData.get("clearBanner") === "1";
  const links = collectLinks(formData);
  const sessionToken = await getSessionToken();

  if (!sessionToken) {
    redirect("/");
  }

  const response = await fetch(`${bffBaseUrl}/api/profile`, {
    method: "POST",
    headers: sessionHeaders(sessionToken),
    body: JSON.stringify({
      bio,
      location,
      avatarSourceUrl,
      bannerSourceUrl,
      clearAvatar,
      clearBanner,
      links,
    }),
    cache: "no-store",
  });

  const redirectPath = redirectTo.split("?")[0] || "/";

  if (!response.ok) {
    redirect(withSearchParams(redirectTo, { account: "profile-error" }));
  }

  revalidatePath("/");
  revalidatePath("/onboarding");
  revalidatePath(redirectPath);

  redirect(withSearchParams(redirectTo, { account: successState, auth: undefined }));
}

function collectLinks(formData: FormData) {
  const labels = formData
    .getAll("linkLabel")
    .map((value) => String(value ?? "").trim());
  const urls = formData
    .getAll("linkUrl")
    .map((value) => String(value ?? "").trim());
  const count = Math.max(labels.length, urls.length);
  const links: { label: string; url: string }[] = [];

  for (let index = 0; index < count; index += 1) {
    const label = labels[index] ?? "";
    const url = urls[index] ?? "";
    if (!label && !url) {
      continue;
    }

    links.push({ label, url });
  }

  return links;
}

export async function createPostAction(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  const targetProfileHandle = String(formData.get("targetProfileHandle") ?? "").trim();
  const sessionToken = await getSessionToken();

  if (!sessionToken || !body) {
    redirect("/");
  }

  await fetch(`${bffBaseUrl}/api/posts`, {
    method: "POST",
    headers: sessionHeaders(sessionToken),
    body: JSON.stringify({
      body,
    }),
    cache: "no-store",
  });

  revalidatePath("/");
  if (targetProfileHandle) {
    revalidatePath(`/u/${targetProfileHandle}`);
  }
}

export async function markNotificationsReadAction(formData: FormData) {
  const targetPath = String(formData.get("targetPath") ?? "/").trim() || "/";
  const sessionToken = await getSessionToken();

  if (!sessionToken) {
    redirect("/");
  }

  await fetch(`${bffBaseUrl}/api/notifications/read-all`, {
    method: "POST",
    headers: sessionHeaders(sessionToken),
    cache: "no-store",
  });

  revalidatePath("/");
  if (targetPath !== "/") {
    revalidatePath(targetPath);
  }
}

export async function followUserAction(formData: FormData) {
  const followeeUserId = String(formData.get("followeeUserId") ?? "").trim();
  const targetProfileHandle = String(formData.get("targetProfileHandle") ?? "").trim();
  const sessionToken = await getSessionToken();

  if (!sessionToken || !followeeUserId) {
    redirect("/");
  }

  await fetch(`${bffBaseUrl}/api/follows`, {
    method: "POST",
    headers: sessionHeaders(sessionToken),
    body: JSON.stringify({
      followeeUserId,
    }),
    cache: "no-store",
  });

  revalidatePath("/");
  if (targetProfileHandle) {
    revalidatePath(`/u/${targetProfileHandle}`);
  }
}

export async function unfollowUserAction(formData: FormData) {
  const followeeUserId = String(formData.get("followeeUserId") ?? "").trim();
  const targetProfileHandle = String(formData.get("targetProfileHandle") ?? "").trim();
  const sessionToken = await getSessionToken();

  if (!sessionToken || !followeeUserId) {
    redirect("/");
  }

  await fetch(`${bffBaseUrl}/api/follows/remove`, {
    method: "POST",
    headers: sessionHeaders(sessionToken),
    body: JSON.stringify({
      followeeUserId,
    }),
    cache: "no-store",
  });

  revalidatePath("/");
  if (targetProfileHandle) {
    revalidatePath(`/u/${targetProfileHandle}`);
  }
}
