import NextAuth, { NextAuthOptions } from 'next-auth';
import AppleProvider from 'next-auth/providers/apple';
import CredentialsProvider from 'next-auth/providers/credentials';
import FacebookProvider from 'next-auth/providers/facebook';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || '',
      clientSecret: process.env.APPLE_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[NextAuth] Authorize called with credentials:', { email: credentials?.email });
        
        if (!credentials?.email || !credentials?.password) {
          console.log('[NextAuth] Missing credentials');
          return null;
        }

        try {
          const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/login`;
          console.log('[NextAuth] Making request to:', apiUrl);
          
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await res.json();
          console.log('[NextAuth] API response:', { status: res.status, data });

          if (res.ok && data.user) {
            console.log('[NextAuth] Login successful for user:', data.user.email);
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              accessToken: data.token,
            };
          }

          console.log('[NextAuth] Login failed:', { status: res.status, error: data.message });
          return null;
        } catch (error) {
          console.error('[NextAuth] Authorize error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.id = user.id;
      }
      if (account?.provider !== 'credentials' && account?.access_token) {
        // For social login, we might want to create/link user in our backend
        token.provider = account.provider;
        token.providerAccessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session as { accessToken?: string }).accessToken = token.accessToken as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For social login, create/update user in backend
      if (account?.provider !== 'credentials' && user.email) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/social`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              provider: account?.provider,
              providerId: account?.providerAccountId,
              avatar: user.image,
            }),
          });
        } catch {
          // Continue even if backend call fails
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/signup',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
