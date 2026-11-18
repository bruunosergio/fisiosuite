import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IdGeneratorPort } from '../../domain/ports/output';

@Injectable()
export class UuidIdGenerator implements IdGeneratorPort {
  generate(): string {
    return randomUUID();
  }
}
