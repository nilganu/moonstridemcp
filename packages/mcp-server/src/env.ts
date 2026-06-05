import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Best-effort .env loader using Node's built-in loader (Node ≥20.6).
 * Searches the current working directory and up to two parent directories so
 * it works whether launched from the package or the repo root.
 */
export function loadEnv(): void {
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void })
    .loadEnvFile;
  if (typeof loader !== "function") return;
  const candidates = [".env", "../.env", "../../.env"];
  for (const rel of candidates) {
    const path = resolve(process.cwd(), rel);
    if (existsSync(path)) {
      try {
        loader(path);
      } catch {
        /* ignore malformed env file */
      }
    }
  }
}
