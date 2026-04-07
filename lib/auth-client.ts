import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

const authBaseURL = new URL(
  "/api/auth",
  apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`,
)
  .toString()
  .replace(/\/$/, "");

export const authClient = createAuthClient({
  baseURL: authBaseURL,
  plugins: [
    expoClient({
      scheme: "hlmaexpo",
      storagePrefix: "hlmaexpo",
      cookiePrefix: "better-auth",
      storage: SecureStore,
    }),
  ],
});

export type AuthSession = typeof authClient.$Infer.Session;
