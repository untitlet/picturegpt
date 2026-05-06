import { FastifyRequest, FastifyReply } from 'fastify';

export type UserRole = 'admin' | 'manager' | 'viewer';

export interface UserContext {
  id: string;
  role: UserRole;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserContext;
  }
}

export const rbacMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply,
  requiredPermissions?: string[]
) => {
  const user = request.user;

  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  // Admin has all permissions
  if (user.role === 'admin') {
    return;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.every((perm) =>
      user.permissions.includes(perm)
    );

    if (!hasPermission) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
  }
};

// Role-based permission matrix
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'users:read',
    'users:write',
    'presets:read',
    'presets:write',
    'presets:delete',
    'generations:read',
    'generations:write',
    'settings:read',
    'settings:write',
    'bitrix:configure',
  ],
  manager: [
    'presets:read',
    'presets:write',
    'generations:read',
    'generations:write',
    'settings:read',
  ],
  viewer: ['presets:read', 'generations:read'],
};
