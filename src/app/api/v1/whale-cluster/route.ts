import { NextResponse } from 'next/server'
import { detectClusters } from '@/lib/modules/derived/whale-clustering'

export async function GET() {
  try {
    const payload = await detectClusters()
    return NextResponse.json({ data: payload, error: null }, {
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch (err) {
    return NextResponse.json({ data: null, error: (err as Error).message }, { status: 502 })
  }
}
