import { createRoot } from "react-dom/client";
import App from "./App";
import { configureApiClient } from "./lib/runtime-config";
import "./index.css";

configureApiClient();

createRoot(document.getElementById("root")!).render(<App />);
