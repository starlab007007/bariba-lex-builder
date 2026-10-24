// Copie le runtime WASM d'onnxruntime-web (depuis node_modules) vers
// public/ort/, pour qu'il soit servi en same-origin par l'app web (évite
// les soucis CORS et permet au service worker de le mettre en cache pour la
// traduction ByT5 hors ligne — voir src/lib/translation/offlineByt5.ts).
// Jamais committé : regénéré ici à chaque install/build, comme les locales
// (voir le script "prebuild").
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules", "onnxruntime-web", "dist");
const destDir = join(root, "public", "ort");
const files = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

mkdirSync(destDir, { recursive: true });
for (const file of files) {
  const src = join(srcDir, file);
  if (!existsSync(src)) {
    console.warn(`[copy-onnxruntime-wasm] Fichier introuvable, ignoré : ${src}`);
    continue;
  }
  copyFileSync(src, join(destDir, file));
}
