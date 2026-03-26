import { setBaseUrl } from "@workspace/api-client-react";

const DEFAULT_REMOTE_ORIGIN = "https://7minutes-production.up.railway.app";

export type RuntimeConfig = {
  apiBaseUrl: string | null;
  socketOrigin: string | null;
  publicApiOrigin: string | null;
  mode: "same-origin" | "split-host";
  source: "env" | "same-origin" | "fallback";
};

let cachedConfig: RuntimeConfig | null = null;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const explicitApiOrigin = normalizeOrigin(import.meta.env.VITE_API_URL);
  const explicitSocketOrigin = normalizeOrigin(import.meta.env.VITE_WS_URL);
  const locationOrigin = getBrowserOrigin();
  const shouldUseFallback =
    typeof window !== "undefined" &&
    window.location.hostname.endsWith(".vercel.app") &&
    !explicitApiOrigin;

  const publicApiOrigin =
    explicitApiOrigin ??
    (shouldUseFallback ? DEFAULT_REMOTE_ORIGIN : locationOrigin);

  const apiBaseUrl = explicitApiOrigin ?? null;
  const socketOrigin = explicitSocketOrigin ?? explicitApiOrigin ?? (shouldUseFallback ? DEFAULT_REMOTE_ORIGIN : null);

  cachedConfig = {
    apiBaseUrl,
    socketOrigin,
    publicApiOrigin,
    mode: apiBaseUrl || socketOrigin ? "split-host" : "same-origin",
    source: explicitApiOrigin ? "env" : shouldUseFallback ? "fallback" : "same-origin",
  };

  return cachedConfig;
}

export function configureApiClient() {
  const config = getRuntimeConfig();
  setBaseUrl(config.apiBaseUrl);
  return config;
}

function getBrowserOrigin(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeOrigin(window.location.origin);
}

function normalizeOrigin(raw: string | undefined | null): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const normalized = value.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}
