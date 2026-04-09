import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_PORT = 3000;

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

function getHostFromExpoConfig() {
  const hostUri = Constants.expoConfig?.hostUri;

  if (!hostUri) {
    return null;
  }

  const match = hostUri.match(/^(?:https?:\/\/)?([^:/]+)(?::\d+)?/i);

  return match?.[1] ?? null;
}

export function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  if (Platform.OS === "web") {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }

  if (Platform.OS === "android") {
    const host = getHostFromExpoConfig();

    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:${DEFAULT_API_PORT}`;
    }

    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  const host = getHostFromExpoConfig();

  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}
