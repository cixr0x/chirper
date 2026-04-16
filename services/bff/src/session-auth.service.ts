import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { IdentityClientService } from "./clients/identity.client";

@Injectable()
export class SessionAuthService {
  constructor(@Inject(IdentityClientService) private readonly identityClient: IdentityClientService) {}

  async requireSession(sessionToken?: string) {
    const normalizedToken = sessionToken?.trim();
    if (!normalizedToken) {
      throw new UnauthorizedException("Session required.");
    }

    try {
      return await this.identityClient.getSession(normalizedToken);
    } catch {
      throw new UnauthorizedException("Valid session required.");
    }
  }

  async optionalSession(sessionToken?: string) {
    const normalizedToken = sessionToken?.trim();
    if (!normalizedToken) {
      return null;
    }

    return this.requireSession(normalizedToken);
  }
}
