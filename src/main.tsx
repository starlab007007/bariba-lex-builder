import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SMTInitializer } from "./components/SMTInitializer";

createRoot(document.getElementById("root")!).render(
  <>
    <SMTInitializer />
    <App />
  </>
);
