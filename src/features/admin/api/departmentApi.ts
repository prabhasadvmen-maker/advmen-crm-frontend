import { apiClient } from '@/lib/apiClient';

export const DEFAULT_DEPARTMENTS = [
  'Sales',
  'Intern',
  'IT Department',
  'SEO',
  'Marketing',
  'Operations',
  'Customer Support',
  'Finance & Accounts',
  'Human Resources',
];

export interface DepartmentListResponse {
  departments: string[];
}

export interface AddDepartmentResponse {
  department: string;
  departments: string[];
}

export const departmentApi = {
  getDepartments: async (): Promise<string[]> => {
    try {
      const res = await apiClient.get<DepartmentListResponse | string[]>('/departments');
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as any).departments)) return (res as any).departments;
      return DEFAULT_DEPARTMENTS;
    } catch (err) {
      console.warn('Failed to load departments from API, using defaults:', err);
      return DEFAULT_DEPARTMENTS;
    }
  },

  createDepartment: async (name: string): Promise<string[]> => {
    try {
      const res = await apiClient.post<AddDepartmentResponse>('/departments', { name });
      if (res && Array.isArray(res.departments)) {
        return res.departments;
      }
      return DEFAULT_DEPARTMENTS;
    } catch (err) {
      console.error('Failed to create department on server:', err);
      throw err;
    }
  },
};
