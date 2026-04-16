import { status } from "@grpc/grpc-js";

type GrpcErrorShape = {
  code?: number;
  details?: string;
  message?: string;
};

export function hasGrpcStatus(error: unknown, expectedStatus: number): error is GrpcErrorShape {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as GrpcErrorShape).code === "number" &&
    (error as GrpcErrorShape).code === expectedStatus
  );
}

export function isGrpcUnauthenticated(error: unknown): error is GrpcErrorShape {
  return hasGrpcStatus(error, status.UNAUTHENTICATED);
}

export function isGrpcAlreadyExists(error: unknown): error is GrpcErrorShape {
  return hasGrpcStatus(error, status.ALREADY_EXISTS);
}

export function isGrpcFailedPrecondition(error: unknown): error is GrpcErrorShape {
  return hasGrpcStatus(error, status.FAILED_PRECONDITION);
}

export function isGrpcInvalidArgument(error: unknown): error is GrpcErrorShape {
  return hasGrpcStatus(error, status.INVALID_ARGUMENT);
}

export function getGrpcErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    if ("details" in error && typeof (error as GrpcErrorShape).details === "string") {
      return (error as GrpcErrorShape).details as string;
    }

    if ("message" in error && typeof (error as GrpcErrorShape).message === "string") {
      return (error as GrpcErrorShape).message as string;
    }
  }

  return fallback;
}
