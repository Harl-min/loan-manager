/** Server-only client for the remote authentication service. */
type Json = Record<string, unknown>;

export const AUTH_ENDPOINTS = {
  token: "/api/v1/auth/token",
  refresh: "/api/v1/auth/refresh",
  register: "/api/v1/auth/register",
  verifyOtp: "/api/v1/auth/verify-otp",
  adminVerifyOtp: "/api/v1/admin/verify-otp",
  login: "/api/v1/auth/login",
  adminLogin: "/api/v1/admin/login",
  verifyLoginOtp: "/api/v1/auth/verify-login-otp",
  adminVerifyLoginOtp: "/api/v1/admin/verify-login-otp",
  logout: "/api/v1/auth/logout",
  profile: "/api/v1/auth/profile",
  generateOtp: "/api/v1/otp/generate",
  verifyGenericOtp: "/api/v1/otp/verify",
  resendOtp: "/api/v1/otp/resend",
  validateOtp: "/api/v1/otp/validate",
  checkVerification: (email: string) =>
    `/api/v1/otp/check-verification/${encodeURIComponent(email)}`,
  invalidateOtp: (email: string) =>
    `/api/v1/otp/invalidate/${encodeURIComponent(email)}`,
} as const;

export class RemoteApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function endpointUrl(endpoint: string) {
  const configured = process.env.NEXT_DATA_AUTH_URL?.trim().replace(
    /^['"]|['"]$/g,
    "",
  );
  if (!configured)
    throw new RemoteApiError(503, "NEXT_DATA_AUTH_URL is not configured.");
  let base: URL;
  try {
    base = new URL(configured);
  } catch {
    throw new RemoteApiError(
      503,
      "NEXT_DATA_AUTH_URL must be a complete http(s) URL.",
    );
  }
  if (!/^https?:$/.test(base.protocol))
    throw new RemoteApiError(503, "NEXT_DATA_AUTH_URL must use http or https.");
  const basePath = base.pathname.replace(/\/$/, "");
  const suffix =
    basePath.endsWith("/api/v1") && endpoint.startsWith("/api/v1")
      ? endpoint.slice("/api/v1".length)
      : endpoint;
  base.pathname = `${basePath}${suffix}`.replace(/\/\/{2,}/g, "/");
  return base.toString();
}

function unwrap(value: unknown): Json {
  if (!value || typeof value !== "object") return {};
  const record = value as Json;
  return (
    record.data && typeof record.data === "object" ? record.data : record
  ) as Json;
}
function errorMessage(value: unknown, fallback: string) {
  const record = unwrap(value);

  if (typeof record.detail === "string" && record.detail) {
    return record.detail;
  }

  if (typeof record.message === "string" && record.message) {
    return record.message;
  }

  if (typeof record.error === "string" && record.error) {
    return record.error;
  }

  return fallback;
}

export async function remoteAuth<T = Json>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpointUrl(endpoint), {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new RemoteApiError(
      503,
      "Unable to reach the authentication service.",
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new RemoteApiError(
      response.status,
      errorMessage(body, `Authentication request failed (${response.status}).`),
    );
  return body as T;
}

export const authApi = {
  token: (body?: unknown) =>
    remoteAuth(AUTH_ENDPOINTS.token, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  refresh: (refreshToken: string) =>
    remoteAuth(AUTH_ENDPOINTS.refresh, {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
  register: (body: unknown) =>
    remoteAuth(AUTH_ENDPOINTS.register, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  verifyRegistrationOtp: (email: string, otp: string, purpose: string) =>
    remoteAuth(AUTH_ENDPOINTS.verifyOtp, {
      method: "POST",
      body: JSON.stringify({ email, otp_code: otp, purpose }),
    }),
      verifyAdminRegistrationOtp: (email: string, otp: string, purpose: string) =>
    remoteAuth(AUTH_ENDPOINTS.adminVerifyOtp, {
      method: "POST",
      body: JSON.stringify({ email, otp_code: otp, purpose }),
    }),
  login: (email: string, password: string) =>
    remoteAuth(AUTH_ENDPOINTS.login, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  adminLogin: (email: string, password: string) =>
    remoteAuth(AUTH_ENDPOINTS.adminLogin, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  verifyLoginOtp: (email: string, otp: string, purpose: string) =>
    remoteAuth(AUTH_ENDPOINTS.verifyLoginOtp, {
      method: "POST",
      body: JSON.stringify({ email, otp_code: otp, purpose }),
    }),
    adminVerifyLoginOtp: (email: string, otp: string) =>
    remoteAuth(AUTH_ENDPOINTS.adminVerifyLoginOtp, {
      method: "POST",
      body: JSON.stringify({ email, otp_code: otp, purpose: "login" }),
    }),
  logout: (accessToken: string, refreshToken?: string) =>
    remoteAuth(AUTH_ENDPOINTS.logout, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    }),
  profile: (accessToken: string) =>
    remoteAuth(AUTH_ENDPOINTS.profile, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  generateOtp: (body: unknown) =>
    remoteAuth(AUTH_ENDPOINTS.generateOtp, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  verifyOtp: (body: unknown) =>
    remoteAuth(AUTH_ENDPOINTS.verifyGenericOtp, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resendOtp: (email: string, purpose: string) =>
    remoteAuth(AUTH_ENDPOINTS.resendOtp, {
      method: "POST",
      body: JSON.stringify({ email, purpose }),
    }),
  validateOtp: (body: unknown) =>
    remoteAuth(AUTH_ENDPOINTS.validateOtp, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkVerification: (email: string) =>
    remoteAuth(AUTH_ENDPOINTS.checkVerification(email)),
  invalidateOtp: (email: string) =>
    remoteAuth(AUTH_ENDPOINTS.invalidateOtp(email), { method: "POST" }),
};

function text(source: Json, names: string[]) {
  for (const name of names) {
    if (typeof source[name] === "string" && source[name]) {
      return source[name] as string;
    }
  }

  return undefined;
}

export function toRemoteSession(response: unknown, fallbackEmail: string) {
  const data = unwrap(response);
  const tokens = unwrap(data.tokens ?? data.token ?? data);
  const user = unwrap(data.user ?? data.profile ?? data);

  const accessToken = text(tokens, [
    "access_token",
    "accessToken",
    "token",
  ]);

  if (!accessToken) {
    console.error("No access token found in auth response:", response);
    return null;
  }

  const email =
    text(user, ["email"]) ?? text(data, ["email"]) ?? fallbackEmail;

  const id =
    text(user, ["id", "user_id", "userId"]) ??
    text(data, ["id", "user_id", "userId"]) ??
    email;

  const fullName =
    text(user, ["full_name", "fullName", "name"]) ??
    text(data, ["full_name", "fullName", "name"]);

  const name =
    fullName && fullName !== email ? fullName : fullName ?? email;

  const rawRole = (
    text(user, ["role", "userRole"]) ??
    text(data, ["role", "userRole"]) ??
    ""
  ).toUpperCase();

  // admin | super_admin | ADMIN → session role "admin"
  const role: "admin" | "BORROWER" | undefined =
    rawRole === "ADMIN" ||
    rawRole === "SUPER_ADMIN" ||
    rawRole === "SUPERADMIN"
      ? "admin"
      : rawRole === "BORROWER"
        ? "BORROWER"
        : undefined;

  const expiresIn = Number(tokens.expires_in ?? tokens.expiresIn);

  return {
    id,
    name,
    email,
    role,
    accessToken,
    refreshToken: text(tokens, ["refresh_token", "refreshToken"]),
    accessTokenExpiresAt:
      Number.isFinite(expiresIn) && expiresIn > 0
        ? Date.now() + expiresIn * 1000
        : undefined,
  };
}