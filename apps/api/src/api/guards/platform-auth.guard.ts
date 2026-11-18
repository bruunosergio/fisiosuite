import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import type { TokenPayload } from '../../domain/ports/output';

@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token ausente.');
    }
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(header.slice(7));
      if (payload.scope !== 'platform' || payload.role !== 'PLATFORM_ADMIN') {
        throw new UnauthorizedException('Acesso restrito ao admin da plataforma.');
      }
      req.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}
