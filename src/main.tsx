import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./custom-styles.css";
import App from "./App.tsx";

// spa-github-pages redirect handler
// https://github.com/rafgraph/spa-github-pages
if (window.location.pathname.includes("/?/")) {
  const redirect = window.location.pathname.split("/?/")[1];
  const pathWithQuery = redirect.replace(/~and~/g, "&");
  window.history.replaceState(null, "", "/" + pathWithQuery);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
