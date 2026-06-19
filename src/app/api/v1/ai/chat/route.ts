// ─────────────────────────────────────────────────────────────
// POST /api/v1/ai/chat — NEXUS AI Assistant
// Uses user-supplied Anthropic API key (stored in env or DB)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

const NEXUS_SYSTEM_PROMPT = `You are NEXUS Intelligence — the embedded AI analyst in the NEXUS terminal.
You have real-time data access across: on-chain analytics, market prices,
macro economics, news, derivatives, equities, forex, and sentiment.
Respond like a senior cross-asset analyst: data-first, concise, no fluff.
Use terminal-style brevity. Reference exact numbers. Flag uncertainty.`

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message: string }
    const { message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        response: 'AI Assistant is not configured. Add your Anthropic API key in Settings → Modules.',
      })
    }

    // Call Anthropic API
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: NEXUS_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Anthropic API error:', res.status, err)
      return NextResponse.json({
        response: `AI service error (${res.status}). Check your API key in Settings.`,
      })
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const response = data.content?.[0]?.text ?? 'No response from AI'

    return NextResponse.json({ response })
  } catch (err) {
    console.error('AI chat error:', err)
    return NextResponse.json({ response: 'AI service temporarily unavailable.' })
  }
}
