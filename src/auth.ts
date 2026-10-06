import "server-only";
import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma/client";
import { env } from "@/lib/config/env";
import { Role } from "@prisma/client";

// Augment the default session and user types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: env.AUTH_SECRET,
  session: {
    strategy: "database", // Database sessions are preferred when using the Prisma Adapter
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },
  // We do not configure explicit providers here yet as per Phase 2A scope
  // They will be added in Phase 2B (e.g. Google, Credentials)
  providers: [],
});
