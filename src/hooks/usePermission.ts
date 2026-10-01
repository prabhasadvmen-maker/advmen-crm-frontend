import { useSessionStore } from '@/stores/sessionStore';

export function usePermission(permission: string | string[]): boolean {
  const permissions = useSessionStore((s) => s.permissions);

  if (Array.isArray(permission)) {
    return permission.every((p) => permissions.includes(p));
  }

  return permissions.includes(permission);
}

export function useAnyPermission(permissionsList: string[]): boolean {
  const permissions = useSessionStore((s) => s.permissions);
  return permissionsList.some((p) => permissions.includes(p));
}
