import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'

let socket: Socket | null = null

/**
 * Get or create the shared Socket.IO connection.
 * Call this lazily — the socket connects on first use.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

/** Connect the socket (idempotent). */
export function connectSocket(): void {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
}

/** Disconnect and tear down the socket. */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
