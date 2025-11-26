import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const validUser = process.env.ADMIN_USER;
        const validPass = process.env.ADMIN_PASSWORD;

        if (credentials.username === validUser && credentials.password === validPass) {
          return { id: "1", name: "Admin", email: "admin@kinonest.ge" };
        }
        return null;
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token) session.user.id = token.id;
      return session;
    },
  },
};

export default NextAuth(authOptions);