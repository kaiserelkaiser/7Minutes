export const serverConfig = {
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  port: parsePort(process.env["PORT"] ?? "3001"),
  corsOrigins: parseAllowedOrigins(process.env["CORS_ORIGINS"]),
  vercelProjectPrefix: process.env["CORS_VERCEL_PROJECT_PREFIX"]?.trim() || "7minutes-",
};

export function isAllowedOrigin(origin: string): boolean {
  if (serverConfig.corsOrigins.length === 0) return true;
  if (serverConfig.corsOrigins.includes(origin)) return true;

  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".vercel.app") &&
      url.hostname.startsWith(serverConfig.vercelProjectPrefix)
    );
  } catch {
    return false;
  }
}

function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parsePort(rawPort: string): number {
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return port;
}
