import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { PasswordHasherPort } from '../../domain/ports/output';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
