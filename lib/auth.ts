import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { authApi, toRemoteSession } from "@/lib/auth-api";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
        purpose: { label: "Purpose", type: "text" },
        loginType: { label: "Login Type", type: "text" }, // "admin" | customer
      },

      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Email is required.");
        }
        if (!credentials?.otp) {
          throw new Error("OTP is required.");
        }

        const email = credentials.email.trim().toLowerCase();
        const otp = credentials.otp.trim();
        const isAdmin = credentials.loginType === "admin";

        try {
          // --------------------------------------------------
          // ADMIN → POST /api/v1/admin/verify-login-otp
          // --------------------------------------------------
          if (isAdmin) {
            
            const response = await authApi.adminVerifyLoginOtp(email, otp);
            console.log("Admin verify-login-otp response:", response);

            const remote = toRemoteSession(response, email);
            if (!remote?.accessToken) {
              throw new Error("Unable to create admin session.");
            }

            return {
              id: remote.id,
              name: remote.name,
              email: remote.email,
              role: "admin" as const,
              accessToken: remote.accessToken,
              refreshToken: remote.refreshToken,
              accessTokenExpiresAt: remote.accessTokenExpiresAt,
            };
          }

          // --------------------------------------------------
          // CUSTOMER → POST /api/v1/auth/verify-login-otp
          // --------------------------------------------------
          const purpose = credentials.purpose || "login";
          const response = await authApi.verifyLoginOtp(email, otp, purpose);
          console.log("Customer verify-login-otp response:", response);

          const remote = toRemoteSession(response, email);
          if (!remote?.accessToken) {
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
        if (user.role) token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpiresAt = user.accessTokenExpiresAt;
      }

      const expiresAt = token.accessTokenExpiresAt as number | undefined;
      if (
        !token.refreshToken ||
        !expiresAt ||
        Date.now() < expiresAt - 30_000
      ) {
        return token;
      }

      try {
        const refreshed = toRemoteSession(
          await authApi.refresh(token.refreshToken as string),
          (token.email as string) ?? "",
        );
        if (!refreshed) {
          return { ...token, refreshError: true };
        }

        token.accessToken = refreshed.accessToken;
        if (refreshed.refreshToken) token.refreshToken = refreshed.refreshToken;
        token.accessTokenExpiresAt = refreshed.accessTokenExpiresAt;
        if (refreshed.role) token.role = refreshed.role;
        return token;
      } catch (error) {
        console.error("Token refresh failed:", error);
        return { ...token, refreshError: true };
      }
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email ?? session.user.email;
        session.user.name =
          (token.name as string) || session.user.name;

        if (token.role === "admin" || token.role === "BORROWER") {
          session.user.role = token.role;
        } else {
          delete (session.user as any).role;
        }
      }

      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      (session as any).accessTokenExpiresAt = token.accessTokenExpiresAt;
      return session;
    },
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