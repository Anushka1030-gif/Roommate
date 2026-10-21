import { io } from 'socket.io-client';

let socket = null;

/**
 * Get or initialize the singleton Socket.IO client instance.
 * Automatically transmits cookies for JWT session authentication.
 */
export function getSocket() {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
      : window.location.origin;

    socket = io(socketUrl, {
      withCredentials: true,
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }

  return socket;
}

/**
 * Connect the socket if disconnected.
 */
export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

/**
 * Disconnect socket and clean up instance.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
};
