import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocketClient(): Socket {
  if (!socket) {
    const isBrowser = typeof window !== 'undefined';
    let backendUrl = '';

    if (isBrowser) {
      if (window.location.port === '3000' || window.location.port === '5173') {
        backendUrl = `${window.location.protocol}//${window.location.hostname}:5001`;
      } else {
        backendUrl = (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') || window.location.origin;
      }
    }

    socket = io(backendUrl || 'http://localhost:5001', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('⚡ [WebSocket] Connected to real-time event bus:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      // Gracefully log debug warning without spamming console
      console.debug('ℹ️ [WebSocket] Connecting/Polling event bus:', err.message);
    });
  }

  return socket;
}

export function connectSocket(organizationId?: string, userId?: string): Socket {
  const s = getSocketClient();
  if (!s.connected) {
    s.connect();
  }

  if (organizationId) {
    s.emit('join_tenant', organizationId);
  }

  if (userId) {
    s.emit('join_user', userId);
  }

  return s;
}

export function disconnectSocket(): void {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}
