import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.provider = token.provider as string
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Send the Google OAuth code to our backend
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google/callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: account.access_token, // This will be the access token from Google
              state: null
            })
          })

          if (!response.ok) {
            console.error('Failed to authenticate with backend')
            return false
          }

          const authData = await response.json()
          
          // Store the JWT token from our backend
          if (authData.access_token) {
            // We'll need to handle this in the session callback
            user.backendToken = authData.access_token
            user.backendUser = authData.user
          }

          return true
        } catch (error) {
          console.error('Error during Google OAuth:', error)
          return false
        }
      }
      return true
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt'
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }