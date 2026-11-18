import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenPayload, TokenPort } from '../../domain/ports/output';

@Injectable()
export class JwtTokenProvider implements TokenPort {
  constructor(private readonly jwt: JwtService) {}

  async sign(payload: TokenPayload, expiresIn?: string): Promise<string> {
    return this.jwt.signAsync(payload, expiresIn ? { expiresIn } : undefined);
  }

  async verify(token: string): Promise<TokenPayload> {
    return this.jwt.verifyAsync<TokenPayload>(token);
  }
}
