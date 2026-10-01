import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '@/lib/socketClient';
import { useSessionStore } from '@/stores/sessionStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotificationStore } from '@/stores/notificationStore';

export function useRealtimeEvents() {
  const queryClient = useQueryClient();
  const { user, organizationId, isAuthenticated } = useSessionStore();
  const { addToast } = useUIStore();
  const { addNotification, fetchInitialActivities } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    // Fetch persistent activity notifications on connect/org switch
    fetchInitialActivities();

    const socket = connectSocket(organizationId, user?.id);

    const handleDealStageChanged = (payload: { dealId: string; newStage: string; value: number }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      addToast({
        type: 'info',
        title: 'Deal Pipeline Updated',
        message: `Deal moved to ${payload.newStage} ($${payload.value?.toLocaleString() || ''})`,
      });
      addNotification({
        type: 'deal',
        title: 'Deal Moved in Pipeline',
        message: `Deal stage shifted to ${payload.newStage} ($${payload.value?.toLocaleString() || ''})`,
        link: '/deals',
        severity: 'info',
      });
    };

    const handleDealWon = (payload: { dealId: string; value: number }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      addToast({
        type: 'success',
        title: '🎉 Deal Closed Won!',
        message: `Revenue of $${payload.value?.toLocaleString() || '0'} added to workspace pipeline.`,
      });
      addNotification({
        type: 'deal',
        title: 'Deal Closed Won!',
        message: `Opportunity successfully won! $${payload.value?.toLocaleString() || '0'} added.`,
        link: '/deals',
        severity: 'success',
      });
    };

    const handleLeadUpdated = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      addNotification({
        type: 'lead',
        title: 'Lead Pipeline Update',
        message: payload?.name ? `Lead ${payload.name} updated` : 'New activity registered on lead',
        link: '/leads',
        severity: 'info',
      });
    };

    const handleCallCompleted = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      addNotification({
        type: 'call',
        title: 'Call Logged & Analyzed',
        message: payload?.duration ? `Call (${payload.duration}s) recorded and analyzed.` : 'Voice interaction logged.',
        link: '/calls',
        severity: 'info',
      });
    };

    const handleInvoicePaid = (payload: { invoiceId: string; amount: number }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      addToast({
        type: 'success',
        title: '💰 Payment Settled',
        message: `Invoice payment for $${payload.amount?.toLocaleString() || ''} recorded.`,
      });
      addNotification({
        type: 'invoice',
        title: 'Payment Received',
        message: `Payment of $${payload.amount?.toLocaleString() || ''} verified against invoice ${payload.invoiceId}.`,
        link: '/invoices',
        severity: 'success',
      });
    };

    const handleTaskCreated = (payload?: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      addNotification({
        type: 'task',
        title: 'New Task Assigned',
        message: payload?.title || 'A new task was created in your workspace.',
        link: '/tasks',
        severity: 'warning',
      });
    };

    socket.on('deal:stage_changed', handleDealStageChanged);
    socket.on('deal:won', handleDealWon);
    socket.on('lead:created', handleLeadUpdated);
    socket.on('lead:score_updated', handleLeadUpdated);
    socket.on('call:completed', handleCallCompleted);
    socket.on('payment:received', handleInvoicePaid);
    socket.on('task:created', handleTaskCreated);

    return () => {
      socket.off('deal:stage_changed', handleDealStageChanged);
      socket.off('deal:won', handleDealWon);
      socket.off('lead:created', handleLeadUpdated);
      socket.off('lead:score_updated', handleLeadUpdated);
      socket.off('call:completed', handleCallCompleted);
      socket.off('payment:received', handleInvoicePaid);
      socket.off('task:created', handleTaskCreated);
    };
  }, [isAuthenticated, organizationId, user?.id, queryClient, addToast, addNotification, fetchInitialActivities]);
}
