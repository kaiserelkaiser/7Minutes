import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

const apiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_URL);
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

createRoot(document.getElementById("root")!).render(<App />);

function resolveApiBaseUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const normalized = value.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;
}
