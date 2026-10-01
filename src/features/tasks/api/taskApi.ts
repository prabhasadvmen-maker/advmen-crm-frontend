import { apiClient, withFallback } from '@/lib/apiClient';
import { Task } from '@/types';
import { SEED_TASKS } from '@/lib/mockData';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  notes?: string;
  /** ISO datetime string – sent as `dueAt` to backend */
  dueDate?: string;
  dueAt?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  ownerId?: string;
  assignedToName?: string;
  relatedEntityType?: 'LEAD' | 'DEAL' | 'ACCOUNT' | 'GENERAL';
  relatedEntityId?: string;
  relatedEntityName?: string;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  isCompleted?: boolean;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

/** Transforms the frontend-friendly payload into the shape the backend Zod schema expects */
function toBackendPayload(payload: CreateTaskPayload) {
  const {
    dueDate,
    dueAt,
    relatedEntityType,
    relatedEntityId,
    relatedEntityName,
    description,
    notes,
    ...rest
  } = payload;

  const result: any = {
    ...rest,
    notes: notes || description || '',
    dueAt: dueAt || dueDate || new Date(Date.now() + 86400000).toISOString(),
  };

  if (relatedEntityId && relatedEntityId.trim() !== '') {
    result.relatedTo = {
      type: relatedEntityType || 'LEAD',
      id: relatedEntityId,
      name: relatedEntityName || 'Related Lead',
    };
  }

  return result;
}

function normalizeTask(raw: any): Task {
  // Backend returns `dueAt`; frontend payload uses `dueDate`
  const dueDateRaw = raw.dueAt ?? raw.dueDate;
  const relatedTo = raw.relatedTo ?? {
    type: raw.relatedEntityType || 'GENERAL',
    id: raw.relatedEntityId || '',
    name: raw.relatedEntityName || '',
  };

  return {
    id: raw.id || raw.taskId || raw._id?.toString() || `task_${Date.now()}`,
    taskId: raw.taskId,
    organizationId: raw.organizationId || 'org_advmen_platform',
    title: raw.title || 'Follow up with client',
    dueDate: dueDateRaw
      ? new Date(dueDateRaw).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Today',
    isCompleted: raw.isCompleted ?? raw.status === 'COMPLETED',
    priority: raw.priority || 'HIGH',
    ownerId: raw.ownerId,
    assignedToName: raw.assignedToName || 'Unassigned',
    notes: raw.notes || raw.description || '',
    status: raw.status || (raw.isCompleted ? 'COMPLETED' : 'PENDING'),
    relatedTo: {
      type: relatedTo?.type || 'GENERAL',
      id: relatedTo?.id || '',
      name: relatedTo?.name || '',
    },
    slaBreachInMinutes: raw.slaBreachInMinutes,
    createdAt: raw.createdAt,
  };
}

export const taskApi = {
  getTasks: async (): Promise<Task[]> => {
    return await withFallback(
      (async () => {
        const response = await apiClient.get<any[]>('/tasks');
        const items = Array.isArray(response) ? response : [];
        return items.map(normalizeTask);
      })(),
      SEED_TASKS,
      'Tasks Subsystem'
    );
  },

  createTask: async (payload: CreateTaskPayload): Promise<Task> => {
    const backendPayload = toBackendPayload(payload);
    return await withFallback(
      (async () => {
        const created = await apiClient.post<any>('/tasks', backendPayload);
        return normalizeTask(created);
      })(),
      normalizeTask({
        ...payload,
        id: `task_${Date.now()}`,
      }),
      'Task Creation'
    );
  },

  updateTask: async (id: string, payload: UpdateTaskPayload): Promise<Task> => {
    return await withFallback(
      (async () => {
        const updated = await apiClient.patch<any>(`/tasks/${id}`, payload);
        return normalizeTask(updated);
      })(),
      normalizeTask({ id, ...payload }),
      'Task Update'
    );
  },

  deleteTask: async (id: string): Promise<boolean> => {
    return await withFallback(
      (async () => {
        await apiClient.delete(`/tasks/${id}`);
        return true;
      })(),
      true,
      'Task Deletion'
    );
  },
};
