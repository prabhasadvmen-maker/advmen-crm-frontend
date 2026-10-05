import { apiClient } from '@/lib/apiClient';
import { UserRole } from '@/types';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatarUrl?: string;
  organizationId: string;
  isActive: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  assignedLeadsCount?: number;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatarUrl?: string;
  organizationId?: string;
}

export interface UpdateUserDto {
  name?: string;
  role?: UserRole;
  department?: string;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
  password?: string;
}

export interface UserListResponse {
  items: UserDto[];
  page: number;
  totalPages: number;
  total: number;
}

export interface ImpersonateResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
  redirectUrl: string;
  impersonated: boolean;
  adminName: string;
}

export interface ForceLogoutResponse {
  success: boolean;
  message: string;
  record?: any;
}

export const usersApi = {
  getUsers: async (params?: { organizationId?: string; role?: string; search?: string }): Promise<UserDto[]> => {
    const searchParams = new URLSearchParams();
    if (params?.organizationId) searchParams.set('organizationId', params.organizationId);
    if (params?.role) searchParams.set('role', params.role);
    if (params?.search) searchParams.set('search', params.search);

    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';

    const res = await apiClient.get<any>(`/users${queryStr}`);

    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as any).users)) return (res as any).users;
    if (res && Array.isArray((res as any).items)) return (res as any).items;
    throw new Error('The server returned an invalid employee list.');
  },

  getUserById: async (id: string): Promise<UserDto> => {
    return await apiClient.get<UserDto>(`/users/${id}`);
  },

  createUser: async (dto: CreateUserDto): Promise<UserDto> => {
    return await apiClient.post<UserDto>('/users', dto);
  },

  updateUser: async (id: string, dto: UpdateUserDto): Promise<UserDto> => {
    return await apiClient.patch<UserDto>(`/users/${id}`, dto);
  },

  deleteUser: async (id: string): Promise<{ deleted: boolean }> => {
    return await apiClient.delete<{ deleted: boolean }>(`/users/${id}`);
  },

  impersonateUser: async (userId: string): Promise<ImpersonateResponse> => {
    return await apiClient.post<ImpersonateResponse>('/auth/impersonate', { userId });
  },

  forceLogoutUser: async (userId: string): Promise<ForceLogoutResponse> => {
    return await apiClient.post<ForceLogoutResponse>('/auth/force-logout-employee', { userId });
  },
};
