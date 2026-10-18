import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateAdmin, SignInError } from "@/lib/platform/accounts";
import { appEnv, authConfiguration } from "@/lib/platform/env";
import { applicationSql } from "@/lib/platform/runtime";

class AdminSignIn extends CredentialsSignin {
  constructor(code: string) {
    super();
    this.code = code;
  }
}

type AuthKit = ReturnType<typeof NextAuth>;

let kit: AuthKit | null = null;

export function authKit(): AuthKit | null {
  const configuration = authConfiguration();

  if ("error" in configuration) {
    return null;
  }

  if (!kit) {
    kit = NextAuth({
      secret: configuration.secret,
      trustHost: true,
      useSecureCookies: appEnv() !== "local",
      session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
      pages: { signIn: "/admin/login" },
      providers: [
        Credentials({
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },
          authorize: async (credentials) => {
            const email = typeof credentials.email === "string" ? credentials.email : "";
            const password = typeof credentials.password === "string" ? credentials.password : "";

            try {
              const user = await authenticateAdmin(await applicationSql(), email, password, new Date());
              return { id: user.id, email: user.email, name: user.email, role: user.role };
            } catch (error) {
              if (error instanceof SignInError) {
                throw new AdminSignIn(error.code);
              }

              return null;
            }
          },
        }),
      ],
      callbacks: {
        jwt({ token, user }) {
          if (user && "role" in user && typeof user.role === "string") {
            token.role = user.role;
          }

          return token;
        },
        session({ session, token }) {
          if (session.user) {
            session.user.role = typeof token.role === "string" ? token.role : "";
          }

          return session;
        },
      },
    });
  }

  return kit;
}
