/** Error thrown when the Moonstride API returns a non-2xx response or an
 * `{ "Error": "..." }` payload. */
export class MoonstrideApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly body: unknown;

  constructor(args: {
    message: string;
    status: number;
    endpoint: string;
    body?: unknown;
  }) {
    super(args.message);
    this.name = "MoonstrideApiError";
    this.status = args.status;
    this.endpoint = args.endpoint;
    this.body = args.body;
  }

  /** True when the failure is an auth problem worth a single token refresh + retry. */
  get isAuthError(): boolean {
    if (this.status === 401 || this.status === 403) return true;
    const msg = this.message.toLowerCase();
    return (
      msg.includes("authorization token is missing") ||
      msg.includes("token is invalid") ||
      msg.includes("token expired")
    );
  }
}

/** Error thrown when token generation fails. */
export class MoonstrideAuthError extends MoonstrideApiError {
  constructor(args: { message: string; status: number; body?: unknown }) {
    super({ ...args, endpoint: "/authentication/generatetoken" });
    this.name = "MoonstrideAuthError";
  }
}
