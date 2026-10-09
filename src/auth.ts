import "server-only";
import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma/client";
import { env } from "@/lib/config/env";
import { Role } from "@prisma/client";
import { compare } from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Augment the default session, user, and token types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    emailVerified?: Date | null;
  }
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn() {
      // The default behavior (allowDangerousEmailAccountLinking = false) prevents
      // Google logins from automatically hijacking an existing Credentials account.
      // If a user has a credentials account with the same email, they will be rejected with OAuthAccountNotLinked.
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        if (token) {
          session.user.id = (token.id as string) || (token.sub as string);
          session.user.role = (token.role as Role) || "CUSTOMER";
          session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
        } else if (user) {
          session.user.id = user.id;
          session.user.role = user.role;
          session.user.emailVerified = user.emailVerified;
        }
      }
      return session;
    },
  },
  providers: [
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                // Trust Google's verified status safely from server side
                emailVerified: profile.email_verified ? new Date() : null,
                // Explicitly assign CUSTOMER role for OAuth accounts
                role: "CUSTOMER",
              };
            },
            // Do not allow dangerous email account linking.
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase();
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null; // Do not leak that user doesn't exist
        }

        // Compare password safely
        const passwordsMatch = await compare(password, user.passwordHash);

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
