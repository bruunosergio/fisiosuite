export interface PasswordHasherPort {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export type TokenPayload = {
  sub: string;
  clinicId: string;
  role: string;
  email: string;
  name: string;
  /** clinic = tenant; platform = admin da plataforma */
  scope?: 'clinic' | 'platform';
};

export interface TokenPort {
  sign(payload: TokenPayload, expiresIn?: string): Promise<string>;
  verify(token: string): Promise<TokenPayload>;
}

export interface IdGeneratorPort {
  generate(): string;
}
