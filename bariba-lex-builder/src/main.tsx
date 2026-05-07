import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  const root = document.getElementById("root")!;
  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f0a1e;color:#fff;font-family:system-ui;text-align:center;padding:2rem">
      <div>
        <h1 style="font-size:1.5rem;margin-bottom:1rem">⚠️ Configuration manquante</h1>
        <p style="color:#aaa;max-width:400px">Les variables d'environnement Supabase ne sont pas configurées.<br/>
        Vérifiez que <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> sont définies.</p>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
