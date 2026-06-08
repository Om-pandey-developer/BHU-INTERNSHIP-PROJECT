import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard enforces Role-Based Access Control (RBAC).
 *
 * It reads the @Roles() metadata from the route handler and compares
 * it against the authenticated user's role (set by JwtStrategy).
 *
 * If the user's role is not in the allowed list, a 403 Forbidden is thrown.
 *
 * @example
 * // On a controller method:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(Role.CC_ADMIN)
 * @Post('provision/:id')
 * async provision() { }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() decorator is present, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
