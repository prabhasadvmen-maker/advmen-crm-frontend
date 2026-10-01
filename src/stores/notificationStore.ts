import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';

export interface AppNotification {
  id: string;
  type: 'deal' | 'invoice' | 'lead' | 'call' | 'task' | 'proposal' | 'sla' | 'system';
  title: string;
  message: string;
  link?: string;
  severity: 'urgent' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  isLoading: boolean;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  fetchInitialActivities: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  isLoading: false,

  addNotification: (notif) => {
    const newEntry: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    set((state) => ({
      notifications: [newEntry, ...state.notifications].slice(0, 50),
    }));
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  fetchInitialActivities: async () => {
    try {
      set({ isLoading: true });
      const rawActivities = await apiClient.get<any[]>('/activities?limit=15');
      if (Array.isArray(rawActivities) && rawActivities.length > 0) {
        const loaded: AppNotification[] = rawActivities.map((act) => {
          let type: AppNotification['type'] = 'system';
          let severity: AppNotification['severity'] = 'info';
          let link: string | undefined = undefined;

          if (act.type === 'STAGE_CHANGE' || act.type === 'DEAL_WON') {
            type = 'deal';
            severity = act.type === 'DEAL_WON' ? 'success' : 'info';
            link = '/deals';
          } else if (act.type === 'PAYMENT') {
            type = 'invoice';
            severity = 'success';
            link = '/invoices';
          } else if (act.type === 'LEAD_CREATED' || act.type === 'LEAD_SCORE') {
            type = 'lead';
            severity = 'info';
            link = '/leads';
          } else if (act.type === 'CALL') {
            type = 'call';
            severity = 'info';
            link = '/calls';
          } else if (act.type === 'TASK') {
            type = 'task';
            severity = 'warning';
            link = '/tasks';
          }

          return {
            id: act.id || act._id || act.activityId || `act_${Date.now()}_${Math.random()}`,
            type,
            title: act.title || 'System Update',
            message: act.description || '',
            link,
            severity,
            timestamp: act.timestamp || act.createdAt || new Date().toISOString(),
            read: false,
          };
        });

        // Merge with existing notifications without duplicating IDs
        set((state) => {
          const existingIds = new Set(state.notifications.map((n) => n.id));
          const fresh = loaded.filter((n) => !existingIds.has(n.id));
          return { notifications: [...state.notifications, ...fresh].slice(0, 50), isLoading: false };
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
