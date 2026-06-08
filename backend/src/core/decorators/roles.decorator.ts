import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Key used to store role metadata on route handlers.
 * Used by RolesGuard to check if the authenticated user
 * has the required role(s) to access the endpoint.
 */
export const ROLES_KEY = 'roles';

/**
 * @Roles() decorator — attach to controller methods to restrict access.
 *
 * @example
 * @Roles(Role.CC_ADMIN)
 * @Post('provision/:id')
 * async provisionAccount(...) { }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
