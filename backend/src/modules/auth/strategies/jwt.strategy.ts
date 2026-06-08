import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

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
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
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
  }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };
  }
}
