import { NextAuthOptions } from 'next-auth'
import type { OAuthConfig } from 'next-auth/providers/oauth'
import { prisma } from './prisma'
import { Role } from '@prisma/client'

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

// LINE IDs that should always be managers (comma-separated in env)
const MANAGER_LINE_IDS = (process.env.MANAGER_LINE_IDS ?? '').split(',').filter(Boolean)

// LINE OAuth Provider (custom since it's not built-in)
const LineProvider: OAuthConfig<LineProfile> = {
  id: 'line',
  name: 'LINE',
  type: 'oauth',
  authorization: {
    url: 'https://access.line.me/oauth2/v2.1/authorize',
    params: { scope: 'profile', bot_prompt: 'normal' }
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
  },
  checks: ['state']
}

export const authOptions: NextAuthOptions = {
  providers: [LineProvider],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'line' && profile) {
        const lineId = (profile as any).userId
        const isConfiguredManager = MANAGER_LINE_IDS.includes(lineId)

        // Upsert user in database
        try {
          await prisma.user.upsert({
            where: { lineId },
            update: {
              displayName: (profile as any).displayName,
              pictureUrl: (profile as any).pictureUrl,
              // Auto-promote to manager and auto-approve if in configured list
              ...(isConfiguredManager && { role: Role.MANAGER, isApproved: true })
            },
            create: {
              lineId,
              displayName: (profile as any).displayName,
              pictureUrl: (profile as any).pictureUrl,
              role: isConfiguredManager ? Role.MANAGER : Role.EMPLOYEE,
              isApproved: isConfiguredManager // Managers are auto-approved
            }
          })
        } catch (error) {
          console.error('[AUTH] Failed to upsert user during sign-in:', error)
          // Allow sign-in to continue, user just won't be in DB yet
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        try {
          const user = await prisma.user.findUnique({
            where: { lineId: token.sub }
          })
          if (user) {
            session.user.id = user.id
            session.user.role = user.role
            session.user.isApproved = user.isApproved
          }
        } catch (error) {
          console.error('[AUTH] Failed to fetch user during session:', error)
          // Return session without user enrichment (graceful degradation)
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
