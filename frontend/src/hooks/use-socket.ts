import { useEffect, useRef } from 'react'
import { getSocket, connectSocket, disconnectSocket } from '@/api'
import type { Socket } from 'socket.io-client'

/**
 * Connect to Socket.IO on mount, disconnect on unmount.
 * Returns the socket instance for event binding.
 *
 * @example
 * ```tsx
 * const socket = useSocket()
 *
 * useEffect(() => {
 *   socket.on('poll:vote', (data) => { ... })
 *   return () => { socket.off('poll:vote') }
 * }, [socket])
 * ```
 */
export function useSocket(): Socket {
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    connectSocket()
    return () => {
      disconnectSocket()
    }
  }, [])

  return socketRef.current
}
