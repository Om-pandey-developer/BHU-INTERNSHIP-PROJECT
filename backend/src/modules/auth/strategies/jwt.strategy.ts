import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as fs from 'fs';
import * as path from 'path';

const publicKey = fs.existsSync(path.join(process.cwd(), 'keys', 'public.pem'))
  ? fs.readFileSync(path.join(process.cwd(), 'keys', 'public.pem'), 'utf8')
  : 'default-access-secret';

/**
 * JWT Passport Strategy.
 *
 * Extracts the JWT access token from the Authorization header
 * and validates it using the JWT_ACCESS_SECRET.
 *
 * The decoded payload is attached to `request.user` automatically
 * by Passport, making it available to guards and controllers.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  /**
   * Called after token verification succeeds.
   * The returned object is set as `request.user`.
   */
  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    departmentId: string | null;
  }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      departmentId: payload.departmentId,
    };
  }
}
