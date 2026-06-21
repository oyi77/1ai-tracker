import { NextResponse } from 'next/server'
import { registerAllModules } from '@/lib/modules'

export async function GET() {
  const registry = registerAllModules()

  try {
    const result = await registry.fetchOne<any>(
      'sectors-app',
      { action: 'indeks' }
    )
    
    // Attempt to extract data or return raw
    return NextResponse.json({
      data: result.data || [],
      source: result.source,
      timestamp: result.timestamp
    })
  } catch (err) {
    console.error('[api/v1/sectors] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
