import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // When in dev server on 5173, point directly to backend 5000 if needed, or window.location.origin for ngrok
    const serverUrl = window.location.port === '5173'
      ? 'http://localhost:5000'
      : window.location.origin;

    const s = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      console.log('[Socket] Connected to server with ID:', s.id);
      setConnected(true);
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setConnected(false);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, connected };
}
