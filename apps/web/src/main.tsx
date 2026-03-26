import { createRoot } from "react-dom/client";
import App from "./App";
import { configureApiClient } from "./lib/runtime-config";
import { registerSevenMinutesServiceWorker } from "./lib/pwa";
import "./index.css";

configureApiClient();
void registerSevenMinutesServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
