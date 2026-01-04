import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { OAuthConfig } from 'next-auth/providers/oauth'
import { prisma } from './prisma'

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

// LINE OAuth Provider (custom since it's not built-in)
const LineProvider: OAuthConfig<LineProfile> = {
  id: 'line',
  name: 'LINE',
  type: 'oauth',
  authorization: {
    url: 'https://access.line.me/oauth2/v2.1/authorize',
    params: { scope: 'profile openid', bot_prompt: 'normal' }
  },
  token: 'https://api.line.me/oauth2/v2.1/token',
  userinfo: 'https://api.line.me/v2/profile',
  clientId: process.env.LINE_CLIENT_ID ?? '',
  clientSecret: process.env.LINE_CLIENT_SECRET ?? '',
  profile(profile: LineProfile) {
    return {
      id: profile.userId,
      name: profile.displayName,
      image: profile.pictureUrl ?? null
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [LineProvider],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'line' && profile) {
        // Upsert user in database
        await prisma.user.upsert({
          where: { lineId: (profile as any).userId },
          update: {
            displayName: (profile as any).displayName,
            pictureUrl: (profile as any).pictureUrl
          },
          create: {
            lineId: (profile as any).userId,
            displayName: (profile as any).displayName,
            pictureUrl: (profile as any).pictureUrl
          }
        })
      }
      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const user = await prisma.user.findUnique({
          where: { lineId: token.sub }
        })
        if (user) {
          session.user.id = user.id
          session.user.role = user.role
        }
      }
      return session
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = (profile as any).userId
      }
      return token
    }
  },
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  }
}
