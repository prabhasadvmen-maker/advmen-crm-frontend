import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGateProps {
  permission: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
