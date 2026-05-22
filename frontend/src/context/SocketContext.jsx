import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

// Generador de sonidos de notificación con Web Audio API
function playNotificationSound(type = 'order') {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);

    if (type === 'order') {
      // Tono ascendente para nuevo pedido
      oscillator.frequency.setValueAtTime(523, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(784, audioCtx.currentTime + 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'transfer') {
      // Tono doble para transferencia
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.2);
      gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc2.start(audioCtx.currentTime + 0.2);
      osc2.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'chat') {
      // Tono simple para mensaje de chat
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.2);
    }
  } catch {
    // Audio no disponible
  }
}

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : window.location.origin;

    const newSocket = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // Eventos de notificación
    newSocket.on('new_order', (order) => {
      playNotificationSound('order');
      toast.success(`🍓 Nuevo pedido: ${order.orderNumber}`, { duration: 5000 });
      // Notificar a los listeners registrados
      if (listenersRef.current.new_order) {
        listenersRef.current.new_order.forEach((cb) => cb(order));
      }
    });

    newSocket.on('transfer_pending', (data) => {
      playNotificationSound('transfer');
      toast(`💸 Transferencia pendiente de ${data.customerName}`, {
        duration: 8000,
        icon: '📸'
      });
      if (listenersRef.current.transfer_pending) {
        listenersRef.current.transfer_pending.forEach((cb) => cb(data));
      }
    });

    newSocket.on('transfer_confirmed', (data) => {
      if (listenersRef.current.transfer_confirmed) {
        listenersRef.current.transfer_confirmed.forEach((cb) => cb(data));
      }
    });

    newSocket.on('order_status_update', (order) => {
      if (listenersRef.current.order_status_update) {
        listenersRef.current.order_status_update.forEach((cb) => cb(order));
      }
    });

    newSocket.on('live_chat_message', (data) => {
      if (data.direction === 'inbound') {
        playNotificationSound('chat');
        toast(`💬 Mensaje de cliente`, { duration: 4000, icon: '💬' });
      }
      if (listenersRef.current.live_chat_message) {
        listenersRef.current.live_chat_message.forEach((cb) => cb(data));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = new Set();
    }
    listenersRef.current[event].add(callback);

    return () => {
      listenersRef.current[event]?.delete(callback);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
