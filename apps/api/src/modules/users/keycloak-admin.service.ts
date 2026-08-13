import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

type KeycloakUser = {
  id: string;
  username: string;
  email?: string;
  enabled?: boolean;
  createdTimestamp?: number;
  serviceAccountClientId?: string;
};

type KeycloakRole = { id: string; name: string };

export type ManagedUser = {
  id: string;
  username: string;
  email: string | null;
  enabled: boolean;
  isAdmin: boolean;
  createdAt: string | null;
};

@Injectable()
export class KeycloakAdminService {
  private readonly baseUrl = process.env.KEYCLOAK_BASE_URL ?? 'http://keycloak:8080/auth';
  private readonly realm = process.env.KEYCLOAK_REALM ?? 'cms-erp';
  private readonly clientId = process.env.KEYCLOAK_API_CLIENT_ID ?? 'cms-erp-api';
  private readonly clientSecret = process.env.KEYCLOAK_API_CLIENT_SECRET ?? '';
  private accessToken = '';
  private tokenExpiresAt = 0;

  async listUsers(): Promise<ManagedUser[]> {
    await this.getAccessToken();
    const [usersResponse, adminsResponse] = await Promise.all([
      this.adminFetch('/users?briefRepresentation=true&max=500'),
      this.adminFetch('/roles/cms-erp-admin/users?briefRepresentation=true&max=500'),
    ]);
    const users = (await usersResponse.json()) as KeycloakUser[];
    const adminIds = new Set(((await adminsResponse.json()) as KeycloakUser[]).map((user) => user.id));

    return users
      .filter((user) => !user.serviceAccountClientId && !user.username.startsWith('service-account-'))
      .map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email || null,
        enabled: user.enabled ?? false,
        isAdmin: adminIds.has(user.id),
        createdAt: user.createdTimestamp ? new Date(user.createdTimestamp).toISOString() : null,
      }));
  }

  async createUser(input: CreateUserDto): Promise<void> {
    const response = await this.adminFetch('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: input.username.trim(),
        email: input.email?.trim() || undefined,
        enabled: true,
        credentials: [{ type: 'password', value: input.password, temporary: false }],
      }),
    });
    const location = response.headers.get('location');
    const userId = location?.split('/').pop();
    if (!userId) throw new BadGatewayException('Keycloak hat keine Benutzer-ID zurückgegeben');

    try {
      await this.setRealmRole(userId, 'cms-erp-user', true);
      await this.setRealmRole(userId, 'cms-erp-admin', input.isAdmin ?? false);
    } catch (error) {
      await this.adminFetch(`/users/${userId}`, { method: 'DELETE' }).catch(() => undefined);
      throw error;
    }
  }

  async updateUser(id: string, input: UpdateUserDto, actorId: string): Promise<void> {
    if (id === actorId && (!input.enabled || !input.isAdmin)) {
      throw new ConflictException('Das eigene Administratorkonto kann nicht deaktiviert oder herabgestuft werden');
    }

    await this.adminFetch(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        username: input.username.trim(),
        email: input.email?.trim() || null,
        enabled: input.enabled,
      }),
    });
    await this.setRealmRole(id, 'cms-erp-user', true);
    await this.setRealmRole(id, 'cms-erp-admin', input.isAdmin);
  }

  async resetPassword(id: string, password: string): Promise<void> {
    await this.adminFetch(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ type: 'password', value: password, temporary: false }),
    });
  }

  private async setRealmRole(userId: string, roleName: string, assigned: boolean): Promise<void> {
    const roleResponse = await this.adminFetch(`/roles/${encodeURIComponent(roleName)}`);
    const role = (await roleResponse.json()) as KeycloakRole;
    await this.adminFetch(`/users/${userId}/role-mappings/realm`, {
      method: assigned ? 'POST' : 'DELETE',
      body: JSON.stringify([role]),
    });
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new BadGatewayException('Keycloak ist nicht erreichbar');
    }
    if (!response.ok) throw new BadGatewayException('Keycloak-Servicekonto konnte nicht angemeldet werden');

    const token = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = token.access_token;
    this.tokenExpiresAt = Date.now() + Math.max(token.expires_in - 15, 1) * 1000;
    return this.accessToken;
  }

  private async adminFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const token = await this.getAccessToken();
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/admin/realms/${encodeURIComponent(this.realm)}${path}`, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(10_000),
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          ...init.headers,
        },
      });
    } catch {
      throw new BadGatewayException('Keycloak ist nicht erreichbar');
    }

    if (response.status === 401 && retry) {
      await this.getAccessToken(true);
      return this.adminFetch(path, init, false);
    }
    if (response.ok) return response;
    if (response.status === 404) throw new NotFoundException('Benutzer oder Rolle wurde nicht gefunden');
    if (response.status === 409) throw new ConflictException('Der Benutzername oder die E-Mail-Adresse ist bereits vergeben');
    throw new BadGatewayException(`Keycloak-Anfrage ist fehlgeschlagen (${response.status})`);
  }
}
