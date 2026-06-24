// ─────────────────────────────────────────────────────────────
// useWsStream — Generic WebSocket hook for real-time data
// Connects to nexus-ws Socket.IO server through CF tunnel
// Auto-reconnect, room subscribe/unsubscribe
// ─────────────────────────────────────────────────────────────

"use client"

import { useEffect, useRef, useState, useCallback } from 'react'

interface WsMessage {
  [key: string]: unknown
}

const WS_URL = 'wss://tracker-ws.aitradepulse.com'

/**
 * Connect to a WebSocket stream on the nexus-ws server.
 * Returns the latest message and connection status.
 *
 * @param namespace — Socket.IO namespace (e.g., "orderbook", "prices", "derivatives", "liquidations")
 * @param room — Optional room to join (e.g., "btcusdt")
 * @returns { data, connected, error }
 */
export function useWsStream<T extends WsMessage = WsMessage>(namespace: string, room?: string) {
  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let mounted = true

    const connect = () => {
      try {
        // Socket.IO WebSocket transport
        const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          if (!mounted) return
          setConnected(true)
          setError(null)

          // Socket.IO connect handshake
          // Send connect packet for the namespace
          ws.send(`42/${namespace},["subscribe","${room ?? ''}"]`)
        }

        ws.onmessage = (event) => {
          if (!mounted) return
          try {
            const raw = event.data as string
            // Socket.IO wraps: 42/namespace,[event,data]
            if (raw.startsWith(`42/${namespace},`)) {
              const payload = JSON.parse(raw.slice(`42/${namespace},`.length))
              if (Array.isArray(payload) && payload.length >= 2) {
                setData(payload[1] as T)
              }
            }
          } catch { /* silent */ }
        }

        ws.onerror = () => {
          if (!mounted) return
          setError('Connection error')
        }

        ws.onclose = () => {
          if (!mounted) return
          setConnected(false)
          // Reconnect after 3s
          reconnectTimeoutRef.current = setTimeout(connect, 3000)
        }
      } catch (e) {
        if (mounted) setError(String(e))
      }
    }

    connect()

    return () => {
      mounted = false
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [namespace, room])

  return { data, connected, error }
}

/**
 * Subscribe to Binance ticker updates for a symbol.
 * Returns real-time price, change, volume.
 */
export function useTicker(symbol: string) {
  const [price, setPrice] = useState<number>(0)
  const [change, setChange] = useState<number>(0)
  const [volume, setVolume] = useState<number>(0)
  const [high24h, setHigh24h] = useState<number>(0)
  const [low24h, setLow24h] = useState<number>(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}usdt@ticker`)

    ws.onopen = () => setConnected(true)
    ws.onmessage = (event) => {
      try {
        const d = JSON.parse(event.data as string)
        setPrice(parseFloat(d.c))
        setChange(parseFloat(d.P))
        setVolume(parseFloat(d.q))
        setHigh24h(parseFloat(d.h))
        setLow24h(parseFloat(d.l))
      } catch {}
    }
    ws.onerror = () => setConnected(false)
    ws.onclose = () => setConnected(false)

    return () => ws.close()
  }, [symbol])

  return { price, change, volume, high24h, low24h, connected }
}
