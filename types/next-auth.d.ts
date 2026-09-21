import "next-auth";
import "next-auth/jwt";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    role?: "admin" | "BORROWER";
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
  }

  interface Session {
    user: {
      id: string;
      role?: "admin" | "BORROWER";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "BORROWER";
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    refreshError?: boolean;
  }
}