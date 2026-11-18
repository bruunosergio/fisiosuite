import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { TokenPayload } from '../../domain/ports/output';

export type AuthenticatedRequest = Request & {
  user: TokenPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token ausente.');
    }
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(header.slice(7));
      if (payload.scope === 'platform' || payload.role === 'PLATFORM_ADMIN') {
        throw new UnauthorizedException('Token inválido para este recurso.');
      }
      if (!payload.clinicId || payload.clinicId === '*') {
        throw new UnauthorizedException('Token inválido ou expirado.');
      }
      req.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}
