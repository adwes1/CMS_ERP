import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthenticatedUser } from './auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly issuer = this.requireUrl('OIDC_ISSUER');
  private readonly clientId = process.env.OIDC_CLIENT_ID ?? 'cms-erp-web';
  private readonly requiredRole = process.env.OIDC_REQUIRED_ROLE ?? 'cms-erp-user';
  private readonly jwks = createRemoteJWKSet(this.getJwksUrl());

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Bearer-Token fehlt');

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        algorithms: ['RS256'],
      });
      const audience = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
      if (payload.azp !== this.clientId && !audience.includes(this.clientId)) {
        throw new Error('Token ist nicht für diese Anwendung bestimmt');
      }

      const user = payload as AuthenticatedUser;
      if (!user.realm_access?.roles?.includes(this.requiredRole)) {
        throw new Error('Erforderliche Anwendungsrolle fehlt');
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Bearer-Token ist ungültig');
    }
  }

  private requireUrl(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`${name} muss konfiguriert sein`);
    return new URL(value).toString().replace(/\/$/, '');
  }

  private getJwksUrl(): URL {
    const configuredUrl = process.env.OIDC_JWKS_URI;
    return new URL(configuredUrl ?? `${this.issuer}/protocol/openid-connect/certs`);
  }
}
