import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 1. Initialize connection
    const _socket = io(SOCKET_URL);
    setSocket(_socket);

    // 2. Clean up on unmount
    return () => {
      _socket.disconnect();
    };
  }, []);

  return socket;
};