import { createRoot } from "react-dom/client";
import App from "./App";
import { configureApiClient } from "./lib/runtime-config";
import { registerSevenMinutesServiceWorker } from "./lib/pwa";
import "./index.css";

configureApiClient();

if (typeof window !== "undefined") {
  const registerWorker = () => {
    const start = () => {
      void registerSevenMinutesServiceWorker();
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(start, { timeout: 2000 });
      return;
    }

    globalThis.setTimeout(start, 1200);
  };

  if (document.readyState === "complete") {
    registerWorker();
  } else {
    window.addEventListener("load", registerWorker, { once: true });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
