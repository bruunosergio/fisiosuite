export abstract class Failure {
  protected constructor(public readonly message: string) {}
}

export class NotFoundFailure extends Failure {
  constructor(entity: string, id: string) {
    super(`${entity} não encontrado(a): ${id}`);
  }
}

export class InvalidCredentialsFailure extends Failure {
  constructor(message = 'E-mail ou senha inválidos.') {
    super(message);
  }
}

export class UnauthorizedFailure extends Failure {
  constructor(message = 'Você não tem permissão para executar esta ação.') {
    super(message);
  }
}

export class ConflictFailure extends Failure {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationFailure extends Failure {
  constructor(message: string) {
    super(message);
  }
}

export class UnexpectedFailure extends Failure {
  constructor(originalError?: unknown) {
    super('Ocorreu um erro inesperado.');
    this.originalError = originalError;
  }
  readonly originalError?: unknown;
}
