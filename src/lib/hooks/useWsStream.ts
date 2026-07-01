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

const WS_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'ws://localhost:4401'
  : 'wss://tracker-ws.aitradepulse.com'

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

  useEffect(() => {
    // Try WS first for crypto, fallback to REST
    let ws: WebSocket | null = null
    let restInterval: ReturnType<typeof setInterval> | null = null
    let wsFailed = false

    const fetchFromRest = async () => {
      try {
        const res = await fetch('/api/v1/market/prices')
        if (!res.ok) return
        const d = await res.json()
        const tickers = d.data?.tickers
        if (!Array.isArray(tickers)) return
        const ticker = tickers.find((t: { symbol: string }) => t.symbol === symbol)
        if (ticker) {
          // Parse price: could be "$108,123" or "108123" or "16,234.50"
          const priceStr = String(ticker.price ?? '').replace(/[$,]/g, '')
          const parsedPrice = parseFloat(priceStr)
          if (!isNaN(parsedPrice)) setPrice(parsedPrice)
          // Parse change: could be "+1.2%" or "1.2"
          const changeStr = String(ticker.change ?? '').replace(/[+%]/g, '')
          const parsedChange = parseFloat(changeStr)
          if (!isNaN(parsedChange)) setChange(parsedChange)
          setConnected(true)
        }
      } catch {}
    }

    const isCrypto = CRYPTO_SYMBOLS.has(symbol)

    if (isCrypto) {
      // Try WebSocket first
      try {
        ws = new WebSocket(`${WS_URL}/prices`)
        const wsTimeout = setTimeout(() => {
          if (!connected) {
            wsFailed = true
            ws?.close()
            fetchFromRest()
            restInterval = setInterval(fetchFromRest, 15_000)
          }
        }, 5_000)

        ws.onopen = () => {
          clearTimeout(wsTimeout)
          setConnected(true)
        }
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
        ws.onerror = () => {
          clearTimeout(wsTimeout)
          if (!wsFailed) {
            wsFailed = true
            fetchFromRest()
            restInterval = setInterval(fetchFromRest, 15_000)
          }
        }
        ws.onclose = () => {
          clearTimeout(wsTimeout)
          if (!wsFailed) {
            wsFailed = true
            fetchFromRest()
            restInterval = setInterval(fetchFromRest, 15_000)
          }
        }
      } catch {
        fetchFromRest()
        restInterval = setInterval(fetchFromRest, 15_000)
      }
    } else {
      // TradFi: REST only
      fetchFromRest()
      restInterval = setInterval(fetchFromRest, 30_000)
    }

    return () => {
      ws?.close()
      if (restInterval) clearInterval(restInterval)
    }
  }, [symbol])

  return { price, change, volume, high24h, low24h, connected }
}
