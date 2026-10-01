import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, CreateTaskPayload } from '../api/taskApi';
import { Task } from '@/types';
import { useUIStore } from '@/stores/uiStore';

export function useTasks() {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.getTasks(),
    staleTime: 1000 * 60,
    retry: 1,
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskApi.createTask(payload),
    onSuccess: (newTask) => {
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => [newTask, ...old]);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addToast({
        type: 'success',
        title: 'Task Created',
        message: newTask.title,
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => taskApi.deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) => old.filter((t) => t.id !== id));
      return { previousTasks };
    },
    onError: (_err, _id, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      taskApi.updateTask(id, { isCompleted, status: isCompleted ? 'COMPLETED' : 'PENDING' }),
    onMutate: async ({ id, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], (old = []) =>
        old.map((t) => (t.id === id ? { ...t, isCompleted } : t))
      );
      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    isError: tasksQuery.isError,
    createTask: createTaskMutation.mutateAsync,
    toggleTask: (id: string, isCompleted: boolean) =>
      toggleTaskMutation.mutateAsync({ id, isCompleted }),
    deleteTask: deleteTaskMutation.mutateAsync,
  };
}
