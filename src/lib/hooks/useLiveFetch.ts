"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

type FetchStatus = 'live' | 'stale' | 'error'

interface UseLiveFetchOptions<T> {
  url: string
  interval?: number
  transform?: (data: unknown) => T
  initialData?: T
}

interface UseLiveFetchResult<T> {
  data: T
  status: FetchStatus
  refresh: () => Promise<void>
}

export function useLiveFetch<T>({
  url,
  interval = 30_000,
  transform,
  initialData,
}: UseLiveFetchOptions<T>): UseLiveFetchResult<T> {
  const [data, setData] = useState<T>(initialData as T)
  const [status, setStatus] = useState<FetchStatus>('live')
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url)
      const json = await res.json()
      if (mountedRef.current) {
        setData((transform ? transform(json) : json) as T)
        setStatus('live')
      }
    } catch {
      if (mountedRef.current) setStatus('error')
    }
  }, [url, transform])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    const id = setInterval(fetchData, interval)
    return () => { mountedRef.current = false; clearInterval(id) }
  }, [fetchData, interval])

  return { data, status, refresh: fetchData }
}
