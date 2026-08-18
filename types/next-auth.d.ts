import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "BORROWER" | "ADMIN";
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role: "BORROWER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "BORROWER" | "ADMIN";
  }
}
