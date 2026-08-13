import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreateProfile(user: AuthenticatedUser) {
    return this.prisma.userProfile.upsert({
      where: { identityId: user.sub },
      create: {
        identityId: user.sub,
        username: user.preferred_username ?? user.sub,
        email: user.email,
        displayName: user.name,
      },
      update: {
        username: user.preferred_username ?? user.sub,
        email: user.email,
        displayName: user.name,
      },
    });
  }
}

