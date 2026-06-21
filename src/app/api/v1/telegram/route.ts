import { NextResponse } from 'next/server'
import { getBotStatus, getRegisteredChats } from '@/lib/telegram/bot'

export async function GET() {
  const status = getBotStatus()
  return NextResponse.json({
    data: {
      ...status,
      chats: status.enabled ? getRegisteredChats().length : 0,
    },
    meta: null,
    error: null,
  }, {
    headers: { 'Cache-Control': 'public, max-age=10' },
  })
}
