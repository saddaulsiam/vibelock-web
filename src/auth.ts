import "server-only";
import crypto from "node:crypto";
import NextAuth, { CredentialsSignin, type DefaultSession, type NextAuthConfig } from "next-auth";
import "next-auth/jwt";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma/client";
import { env } from "@/lib/config/env";
import { Role } from "@prisma/client";
import { compare } from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { normalizeBdPhoneNumber, isValidBdPhoneNumber } from "@/lib/validations/auth";
import { verifyOtp } from "@/lib/sms/client";
import { isCustomerSuspended } from "@/lib/auth/suspension";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  checkOtpRateLimit,
  clearOtpRateLimit,
} from "@/lib/security/rate-limit";
import { logSecurityAlert, hashSecurityIdentifier } from "@/lib/monitoring/security-logger";

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
    currentSessionId?: string;
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
    sessionToken?: string;
    currentSessionId?: string;
  }
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.sessionToken) {
        try {
          await prisma.session.deleteMany({
            where: { sessionToken: message.token.sessionToken as string },
          });
        } catch (err) {
          console.error("[auth:events] Failed to delete session on signOut event:", err);
        }
      }
    },
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
      // 1. Initial sign-in (Credentials or OAuth)
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified;

        // Create exactly one corresponding Prisma Session record for newly authenticated session
        if (!token.sessionToken) {
          const userId = user.id || (token.sub as string);
          if (userId) {
            try {
              const sessionId = crypto.randomUUID();
              const sessionToken = crypto.randomBytes(32).toString("hex");
              const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

              await prisma.session.create({
                data: {
                  id: sessionId,
                  sessionToken,
                  userId,
                  expires,
                },
              });

              token.sessionToken = sessionToken;
              token.currentSessionId = sessionId;
            } catch (createError) {
              console.error("[auth:jwt] Failed to create database session on sign-in (failing closed):", createError);
              return null;
            }
          } else {
            return null;
          }
        }

        return token;
      }

      // 2. Subsequent requests / token validation
      // If sessionToken is missing, this is a legacy JWT or unbacked token -> reject safely (fail closed)
      if (!token.sessionToken) {
        return null;
      }

      try {
        const dbSession = await prisma.session.findUnique({
          where: { sessionToken: token.sessionToken as string },
          select: {
            id: true,
            userId: true,
            expires: true,
            user: {
              select: {
                id: true,
                role: true,
                emailVerified: true,
              },
            },
          },
        });

        // 3. Reject if session record was deleted/revoked
        if (!dbSession) {
          return null;
        }

        // 4. Reject if session belongs to a different user
        const tokenUserId = (token.id as string) || (token.sub as string);
        if (dbSession.userId !== tokenUserId) {
          return null;
        }

        // 5. Reject if session has expired
        if (dbSession.expires < new Date()) {
          return null;
        }

        // 6. Enforce customer suspension
        if (dbSession.user.role === "CUSTOMER" && (await isCustomerSuspended(dbSession.userId))) {
          return null;
        }

        // Keep live role and emailVerified in sync with database
        token.role = dbSession.user.role;
        token.emailVerified = dbSession.user.emailVerified;

        return token;
      } catch (err) {
        // Fail closed on database lookup failure
        console.error("[auth:jwt] Session verification error (failing closed):", err);
        return null;
      }
    },
    async session({ session, token, user }) {
      if (session.user) {
        if (token) {
          session.user.id = (token.id as string) || (token.sub as string);
          session.user.role = (token.role as Role) || "CUSTOMER";
          session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
          session.currentSessionId = token.currentSessionId as string;
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

          // Rate limit OTP verification attempts (per-phone hash & IP ceiling)
          try {
            await checkOtpRateLimit(phone);
          } catch (error) {
            if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
              try {
                logSecurityAlert("AUTH_OTP_RATE_LIMIT_EXCEEDED", {
                  endpoint: "otpVerifyPhone",
                  reason: "rate_limit_exceeded",
                  phoneHash: hashSecurityIdentifier(phone),
                });
              } catch {
                // Fail-safe
              }
              throw new RateLimitError();
            }
            console.error("OTP rate limit check error in authorize:", error);
            throw new RateLimitError();
          }

          const isValid = await verifyOtp(phone, otp);

          if (!isValid) {
            return null;
          }

          // Reset OTP rate limit counter on successful verification
          try {
            await clearOtpRateLimit(phone);
          } catch (err) {
            console.warn("Failed to clear OTP rate limit on success:", err);
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
              try {
                logSecurityAlert("AUTH_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT", {
                  role: user.role,
                  reason: "account_suspended",
                  endpoint: "phone_otp",
                });
              } catch {
                // Fail-safe
              }
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

        // Email or Phone + Password Flow
        if (
          !credentials?.email ||
          !credentials?.password ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const rawIdentifier = credentials.email.trim();
        const password = credentials.password;

        const isPhone = isValidBdPhoneNumber(rawIdentifier);
        const normalizedPhone = isPhone ? normalizeBdPhoneNumber(rawIdentifier) : null;
        const normalizedIdentifier = isPhone ? normalizedPhone! : rawIdentifier.toLowerCase();

        // V-03 & V-05: Enforce rate limits before expensive DB & bcrypt operations
        try {
          await checkLoginRateLimit(normalizedIdentifier);
        } catch (error) {
          if (error instanceof Error && error.message === "RATE_LIMIT_EXCEEDED") {
            try {
              logSecurityAlert("AUTH_RATE_LIMIT_EXCEEDED", {
                endpoint: "loginCompound",
                reason: "rate_limit_exceeded",
                emailHash: hashSecurityIdentifier(normalizedIdentifier),
              });
            } catch {
              // Fail-safe
            }
            throw new RateLimitError();
          }
          console.error("Rate limit check error in authorize:", error);
          throw new RateLimitError();
        }

        let user;
        if (isPhone && normalizedPhone) {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: normalizedPhone },
                { email: normalizedPhone },
                { email: rawIdentifier.toLowerCase() },
              ],
            },
          });
        } else {
          user = await prisma.user.findUnique({
            where: { email: normalizedIdentifier },
          });
        }

        if (!user || !user.passwordHash) {
          // V-06: Mitigate account-enumeration and timing side-channel via constant-time dummy comparison
          await compare(password, DUMMY_BCRYPT_HASH);
          return null;
        }

        // Compare password safely
        const passwordsMatch = await compare(password, user.passwordHash);

        if (!passwordsMatch) {
          // SEC-12-01: Log security event only for administrative account credential failures
          if (user.role && user.role !== "CUSTOMER") {
            try {
              logSecurityAlert("AUTH_ADMIN_LOGIN_FAILED", {
                role: user.role,
                reason: "invalid_credentials",
                emailHash: hashSecurityIdentifier(normalizedIdentifier),
                endpoint: "credentials",
              });
            } catch {
              // Fail-safe
            }
          }
          return null;
        }

        // Check if customer account is suspended
        if (await isCustomerSuspended(user.id)) {
          try {
            logSecurityAlert("AUTH_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT", {
              role: user.role,
              reason: "account_suspended",
              endpoint: "credentials",
            });
          } catch {
            // Fail-safe
          }
          return null;
        }

        // SEC-4B-01: Reset compound rate-limit counter on successful login for this IP + account
        try {
          await clearLoginRateLimit(normalizedIdentifier);
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
