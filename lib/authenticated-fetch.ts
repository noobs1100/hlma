import { authClient } from "@/lib/auth-client";
import { Platform } from "react-native";

export function getAuthenticatedHeaders(
  headers: HeadersInit = {},
): HeadersInit {
  const requestInit = getAuthenticatedRequestInit({ headers });

  return requestInit.headers ?? headers;
}

export function getAuthenticatedRequestInit(
  init: RequestInit = {},
): RequestInit {
  const headers = new Headers(init.headers);
  const cookies = authClient.getCookie();

  if (cookies && Platform.OS !== "web") {
    headers.set("Cookie", cookies);
  }

  return {
    ...init,
    headers,
    credentials: Platform.OS === "web" ? "include" : init.credentials,
  };
}
