'use client';

import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from './events';

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ClientSocket | null = null;

export function getSocket(): ClientSocket {
  if (!socket) {
    socket = io({ path: '/socket.io', autoConnect: true });
  }
  return socket;
}
