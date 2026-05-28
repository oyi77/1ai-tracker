"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface SocketEvent {
  id: string;
  data: Record<string, unknown>;
  timestamp: string;
  namespace: string;
}

export function useSocket(namespace: string) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [events, setEvents] = useState<SocketEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

    setStatus("connecting");

    const socket = io(`${wsUrl}${namespace}`, {
      transports: ["websocket"],
      auth: {
        token: typeof window !== "undefined"
          ? localStorage.getItem("nexus_api_key") || ""
          : "",
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setStatus("connected");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setStatus("disconnected");
    });

    socket.on("reconnect_attempt", () => {
      setStatus("reconnecting");
    });

    socket.on("reconnect_failed", () => {
      setStatus("disconnected");
    });

    socket.on("event", (data: Record<string, unknown>) => {
      const event: SocketEvent = {
        id: crypto.randomUUID(),
        data,
        timestamp: new Date().toISOString(),
        namespace,
      };
      setEvents((prev) => [event, ...prev].slice(0, 200));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [namespace]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { connected, status, events, clearEvents };
}
