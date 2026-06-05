import "server-only";
import { MoonstrideClient } from "@moonstride/api-client";

let singleton: MoonstrideClient | null = null;

/**
 * Server-only singleton Moonstride client. Credentials come from the
 * MOONSTRIDE_* env vars and never reach the browser.
 */
export function getClient(): MoonstrideClient {
  if (!singleton) singleton = new MoonstrideClient();
  return singleton;
}
