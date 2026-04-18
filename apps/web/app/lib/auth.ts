import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { prisma as db} from "@repo/database";
import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { SessionStrategy } from "next-auth";

export const authOptions = {
  adapter: PrismaAdapter(db) as Adapter,

  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/auth",
  },

  session: {
    strategy: "jwt" as SessionStrategy,
  },

  callbacks: {
    async signIn() {
      return true;
    },

    async redirect({ url, baseUrl }: any) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },

    async jwt({ token, user, account, profile }: any) {
      // On initial sign-in
      if (account) {
        token.accessToken = account.access_token;
      }

      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image =
          user.image || profile?.picture || profile?.avatar_url;
      }

      return token;
    },

    async session({ session, token }: any) {
      if (session.user && token) {
        session.user.id = token.sub ?? token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.image;
        session.accessToken = token.accessToken;
      }

      return session;
    },
  },

  debug: true, // remove after everything works
};

// --------------------
// Rate limiter (unchanged)
// --------------------

interface RateLimiter {
  timestamps: Date[];
}

const userRateLimits = new Map<string, RateLimiter>();

export const rateLimit = (
  userId: string,
  rateLimitCount: number,
  rateLimitInterval: number
): boolean => {
  const now = new Date();
  const userLimiter = userRateLimits.get(userId) ?? { timestamps: [] };

  userLimiter.timestamps = userLimiter.timestamps.filter(
    (timestamp) =>
      now.getTime() - timestamp.getTime() < rateLimitInterval
  );

  if (userLimiter.timestamps.length >= rateLimitCount) {
    return false;
  }

  userLimiter.timestamps.push(now);
  userRateLimits.set(userId, userLimiter);
  return true;
};
