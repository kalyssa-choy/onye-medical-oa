import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

//rendering the app
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
