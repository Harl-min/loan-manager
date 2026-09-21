import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authApi, remoteAuth, toRemoteSession } from "@/lib/auth-api";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
   CredentialsProvider({
  name: "Credentials",

  credentials: {
    email: { label: "Email", type: "email" },
    otp: { label: "OTP", type: "text" },
    purpose: { label: "Purpose", type: "text" },
    password: { label: "Password", type: "password" },
    loginType: { label: "Login Type", type: "text" }, // "admin" | undefined
  },

  async authorize(credentials) {
    if (!credentials?.email) {
      throw new Error("Email is required.");
    }

    const email = credentials.email.trim().toLowerCase();

    // ==========================================================
    // ADMIN LOGIN
    // ==========================================================
    if (credentials.loginType === "admin") {
      if (!credentials.password) {
        throw new Error("Password is required for admin login.");
      }

      try {
        const response = await authApi.adminLogin(
          email,
          credentials.password,
        );

        console.log("Admin login response:", response);

        const remote = toRemoteSession(response, email);

        if (!remote) {
          throw new Error("Unable to create admin session.");
        }

        return {
          id: remote.id,
          name: remote.name,
          email: remote.email,
          role: "admin" as const, // force admin
          accessToken: remote.accessToken,
          refreshToken: remote.refreshToken,
          accessTokenExpiresAt: remote.accessTokenExpiresAt,
        };
      } catch (error) {
        console.error("Admin login failed:", error);
        if (error instanceof Error) throw error;
        throw new Error("Invalid admin credentials.");
      }
    }

    // ==========================================================
    // CUSTOMER LOGIN (OTP)
    // ==========================================================
    if (!credentials.otp || !credentials.purpose) {
      throw new Error("Email, OTP and purpose are required.");
    }

    try {
      const response = await authApi.verifyLoginOtp(
        email,
        credentials.otp,
        credentials.purpose,
      );

      console.log("OTP verification response:", response);

      const remote = toRemoteSession(response, email);

      if (!remote) {
        throw new Error(
          "Unable to create your login session. Please try again.",
        );
      }

      return {
        id: remote.id,
        name: remote.name,
        email: remote.email,
        ...(remote.role ? { role: remote.role } : {}),
        accessToken: remote.accessToken,
        refreshToken: remote.refreshToken,
        accessTokenExpiresAt: remote.accessTokenExpiresAt,
      };
    } catch (error) {
      console.error("OTP verification failed:", error);
      if (error instanceof Error) throw error;
      throw new Error("Unable to verify OTP. Please try again.");
    }
  },
}),
  ],

  callbacks: {
 async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.email = user.email;
    token.name = user.name ?? token.name;

    if (user.role) {
      token.role = user.role;
    }

    token.accessToken = user.accessToken;
    token.refreshToken = user.refreshToken;
    token.accessTokenExpiresAt = user.accessTokenExpiresAt;
  }

  const expiresAt = token.accessTokenExpiresAt;

  if (
    !token.refreshToken ||
    !expiresAt ||
    Date.now() < expiresAt - 30_000
  ) {
    return token;
  }

  try {
    const refreshed = toRemoteSession(
      await authApi.refresh(
        token.refreshToken,
      ),
      token.email ?? "",
    );

    if (!refreshed) {
      return {
        ...token,
        refreshError: true,
      };
    }

    token.accessToken = refreshed.accessToken;

    if (refreshed.refreshToken) {
      token.refreshToken = refreshed.refreshToken;
    }

    token.accessTokenExpiresAt =
      refreshed.accessTokenExpiresAt;

    if (refreshed.role) {
      token.role =
      refreshed.role === "admin"
          ? "admin"
          : refreshed.role;
    }

    return token;
  } catch (error) {
    console.error(
      "Token refresh failed:",
      error,
    );

    return {
      ...token,
      refreshError: true,
    };
  }
},
    async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;

    session.user.email =
      token.email ?? session.user.email;

    session.user.name =
      (token.name as string) && (token.name as string) !== token.email
        ? (token.name as string)
        : (token.name as string) ?? session.user.name;

    if (
      token.role === "admin" ||
      token.role === "BORROWER"
    ) {
      session.user.role = token.role;
    } else {
      delete session.user.role;
    }
  }

  (session as any).accessToken = token.accessToken;
  (session as any).refreshToken = token.refreshToken;
  (session as any).accessTokenExpiresAt = token.accessTokenExpiresAt;

  return session;
}
  },
events: {
  async signOut({ token }) {
    if (token?.accessToken) {
      await authApi
        .logout(
          token.accessToken as string,
          token.refreshToken as string | undefined,
        )
        .catch(() => undefined);
    }
  },
},

  secret: process.env.NEXTAUTH_SECRET,
};