export type IdentityPasswordErrorCode =
  | "already_exists"
  | "failed_precondition"
  | "invalid_argument"
  | "unauthenticated";

export class IdentityPasswordError extends Error {
  constructor(
    readonly code: IdentityPasswordErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IdentityPasswordError";
  }
}
