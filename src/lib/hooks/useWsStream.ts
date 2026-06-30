// ─────────────────────────────────────────────────────────────
// useWsStream — Generic WebSocket hook for real-time data
// Connects to nexus-ws Socket.IO server through CF tunnel
// Auto-reconnect, room subscribe/unsubscribe
// ─────────────────────────────────────────────────────────────

"use client"

import { useEffect, useRef, useState } from 'react'


interface WsMessage {
  [key: string]: unknown
}

const WS_URL = 'wss://tracker-ws.aitradepulse.com'

// Crypto symbols that come from the WS server /prices namespace
const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'AVAX', 'LINK', 'ARB', 'OP'])

/**
 * Connect to a WebSocket stream on the nexus-ws server.
 */
export function useWsStream<T extends WsMessage = WsMessage>(namespace: string, room?: string) {
  const [data, setData] = useState<T | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let mounted = true
    const url = room ? `${WS_URL}/${namespace}?room=${room}` : `${WS_URL}/${namespace}`

    function connect() {
      if (!mounted) return
      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => { if (mounted) setConnected(true) }
        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data as string) as T
            if (mounted) setData(parsed)
          } catch {}
        }
        ws.onerror = () => { if (mounted) setError('Connection error') }
        ws.onclose = () => {
          if (mounted) {
            setConnected(false)
            reconnectTimeoutRef.current = setTimeout(connect, 5000)
          }
        }
      } catch (err) {
        if (mounted) setError((err as Error).message)
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
 * Subscribe to price updates for a symbol.
 * Routes through WS server /prices namespace (crypto) or REST fallback (TradFi).
 */
export function useTicker(symbol: string) {
  const [price, setPrice] = useState<number>(0)
  const [change, setChange] = useState<number>(0)
  const [volume, setVolume] = useState<number>(0)
  const [high24h, setHigh24h] = useState<number>(0)
  const [low24h, setLow24h] = useState<number>(0)
  const [connected, setConnected] = useState(false)

  const isCrypto = CRYPTO_SYMBOLS.has(symbol)

  useEffect(() => {
    if (isCrypto) {
      // Route through WS server /prices namespace
      const ws = new WebSocket(`${WS_URL}/prices`)

      ws.onopen = () => setConnected(true)
      ws.onmessage = (event) => {
        try {
          const d = JSON.parse(event.data as string)
          if (d.symbol === symbol.toLowerCase()) {
            setPrice(d.price ?? 0)
            setChange(d.change24h ?? 0)
            setVolume(d.volume24h ?? 0)
            setHigh24h(d.high24h ?? 0)
            setLow24h(d.low24h ?? 0)
          }
        } catch {}
      }
      ws.onerror = () => setConnected(false)
      ws.onclose = () => setConnected(false)

      return () => ws.close()
    } else {
      // TradFi symbols: REST fallback via our API
      const fetchPrice = async () => {
        try {
          const res = await fetch(`/api/v1/market/prices?symbols=${symbol}`)
          if (res.ok) {
            const d = await res.json()
            const ticker = d.data?.[0]
            if (ticker) {
              setPrice(ticker.price ?? 0)
              setChange(ticker.change24h ?? 0)
              setConnected(true)
            }
          }
        } catch {}
      }
      fetchPrice()
      const interval = setInterval(fetchPrice, 30_000)
      return () => clearInterval(interval)
    }
  }, [symbol, isCrypto])

  return { price, change, volume, high24h, low24h, connected }
}
