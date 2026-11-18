import { HttpStatus } from '@nestjs/common';
import {
  ConflictFailure,
  Failure,
  InvalidCredentialsFailure,
  NotFoundFailure,
  UnauthorizedFailure,
  ValidationFailure,
} from '../../domain/failures';

export function httpStatusFor(failure: Failure): number {
  if (failure instanceof NotFoundFailure) return HttpStatus.NOT_FOUND;
  if (failure instanceof InvalidCredentialsFailure) return HttpStatus.UNAUTHORIZED;
  if (failure instanceof UnauthorizedFailure) return HttpStatus.FORBIDDEN;
  if (failure instanceof ConflictFailure) return HttpStatus.CONFLICT;
  if (failure instanceof ValidationFailure) return HttpStatus.BAD_REQUEST;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
