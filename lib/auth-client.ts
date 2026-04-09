import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { getApiBaseUrl } from "@/lib/api-url";

const apiUrl = getApiBaseUrl();

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
