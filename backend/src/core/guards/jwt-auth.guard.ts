import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard extends Passport's AuthGuard('jwt').
 * It automatically validates the Bearer token from the
 * Authorization header using the JwtStrategy.
 *
 * Usage: Apply @UseGuards(JwtAuthGuard) on controllers or routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
