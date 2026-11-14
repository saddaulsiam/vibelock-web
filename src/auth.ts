import "server-only";
import NextAuth, { CredentialsSignin, type DefaultSession, type NextAuthConfig } from "next-auth";
import "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma/client";
import { env } from "@/lib/config/env";
import { Role } from "@prisma/client";
import { compare } from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { normalizeBdPhoneNumber } from "@/lib/validations/auth";
import { verifyOtp } from "@/lib/sms/client";
import { isCustomerSuspended } from "@/lib/auth/suspension";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/security/rate-limit";

export class RateLimitError extends CredentialsSignin {
  code = "rate_limit_exceeded";
}

// Cost-12 bcrypt dummy hash for constant-time comparison when user does not exist or has no password (V-06)
const DUMMY_BCRYPT_HASH = "$2b$12$6JBswt1UKeuozUJfRsQmPulGsk5iQwI2YjR7Gm.3zzs.quF7x0axK";

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
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      // The default behavior (allowDangerousEmailAccountLinking = false) prevents
      // Google logins from automatically hijacking an existing Credentials account.
      // If a user has a credentials account with the same email, they will be rejected with OAuthAccountNotLinked.
      if (account?.provider && account.provider !== "credentials") {
        const email = user?.email?.toLowerCase();
        let checkedUserId: string | null = null;

        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });
          if (dbUser) {
            checkedUserId = dbUser.id;
            if (await isCustomerSuspended(dbUser.id)) {
              return false;
            }
          }
        }

        if (user?.id && user.id !== checkedUserId && (await isCustomerSuspended(user.id))) {
          return false;
        }
      }

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
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        // Phone + OTP Authentication Flow
        if (credentials?.phone && credentials?.otp) {
          const phone = normalizeBdPhoneNumber(credentials.phone as string);
          const otp = credentials.otp as string;
          const isValid = await verifyOtp(phone, otp);

          if (!isValid) {
            return null;
          }

          let user = await prisma.user.findUnique({
            where: { phone },
          });

          if (!user) {
            const userName =
              typeof credentials.name === "string" && credentials.name.trim()
                ? credentials.name.trim()
                : `Member ${phone.slice(-4)}`;

            const phoneEmail = `${phone}@vibelock.bd`;

            user = await prisma.user.create({
              data: {
                phone,
                email: phoneEmail,
                name: userName,
                role: "CUSTOMER",
                phoneVerified: new Date(),
              },
            });
          } else {
            // Check if customer account is suspended
            if (await isCustomerSuspended(user.id)) {
              return null;
            }

            if (!user.phoneVerified) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { phoneVerified: new Date() },
              });
            }
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            emailVerified: user.emailVerified,
          };
        }

        // Email + Password Flow
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        // V-03 & V-05: Enforce rate limits before expensive DB & bcrypt operations
        try {
          await checkLoginRateLimit(email);
        } catch (error) {
          if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
            throw new RateLimitError();
          }
          console.error("Rate limit check error in authorize:", error);
          throw new RateLimitError();
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          // V-06: Mitigate account-enumeration and timing side-channel via constant-time dummy comparison
          await compare(password, DUMMY_BCRYPT_HASH);
          return null;
        }

        // Compare password safely
        const passwordsMatch = await compare(password, user.passwordHash);

        if (!passwordsMatch) {
          return null;
        }

        // Check if customer account is suspended
        if (await isCustomerSuspended(user.id)) {
          return null;
        }

        // SEC-4B-01: Reset compound rate-limit counter on successful login for this IP + account
        try {
          await clearLoginRateLimit(email);
        } catch (err) {
          console.warn("Failed to clear compound login rate limit on successful authentication:", err);
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
