import type { Socket } from "socket.io";

const API_KEYS = (process.env.NEXUS_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

export function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const authHeader =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization;

  if (!authHeader) {
    return next(new Error("Authentication required"));
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (API_KEYS.length === 0) {
    console.warn("[Auth] No NEXUS_API_KEYS configured — allowing all connections");
    return next();
  }

  if (!API_KEYS.includes(token)) {
    return next(new Error("Invalid API key"));
  }

  next();
}
