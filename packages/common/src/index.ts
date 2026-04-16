export type ServiceBoundary = {
  service: string;
  prefix: string | null;
  public: boolean;
};

export type HealthPayload = {
  service: string;
  status: "ok" | "degraded";
  prefix?: string;
  tables: string[];
  transports?: string[];
};

export const PUBLIC_SURFACE = ["web", "bff"] as const;

