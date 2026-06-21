// ─────────────────────────────────────────────────────────────
// Telegram Bot for NEXUS Alert Delivery
// Uses Telegram Bot API directly — no external packages
// ─────────────────────────────────────────────────────────────

const TELEGRAM_API = 'https://api.telegram.org/bot'
const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000

const registeredChats = new Set<string>()
let botToken = ''
let pollingOffset = 0
let isPolling = false

// ─── Core API ────────────────────────────────────────────────

async function callTelegram(method: string, body?: Record<string, unknown>): Promise<unknown> {
  const url = `${TELEGRAM_API}${botToken}/${method}`
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      })
      const data = await res.json() as { ok: boolean; result?: unknown; description?: string }
      if (data.ok) return data.result
      if (res.status === 429) {
        // Rate limited — wait and retry
        await sleep(RETRY_BASE_MS * Math.pow(2, attempt))
        continue
      }
      throw new Error(`Telegram API error: ${data.description}`)
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) throw err
      await sleep(RETRY_BASE_MS * Math.pow(2, attempt))
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Bot Commands ────────────────────────────────────────────

function handleMessage(text: string, chatId: string): string {
  const cmd = text.trim().toLowerCase()

  if (cmd === '/start') {
    registeredChats.add(chatId)
    return [
      '🔔 *NEXUS Alert Bot Connected*',
      '',
      'You will now receive alerts for:',
      '• Whale movements (>$100K)',
      '• Smart money signals',
      '• Price threshold alerts',
      '',
      'Commands:',
      '/stop — Unregister from alerts',
      '/status — Bot status',
      '/whale — Recent whale moves',
      '/smart — Smart money signals',
      '/pnl:ADDRESS — Wallet PnL lookup',
      '/edge — Daily edge report',
      '/price:SYMBOL — Price check',
      '/help — Show commands',
    ].join('\n')
  }

  if (cmd === '/stop') {
    registeredChats.delete(chatId)
    return '🔕 Unregistered from alerts. Use /start to re-enable.'
  }

  if (cmd === '/status') {
    return [
      '📊 *NEXUS Bot Status*',
      `Registered chats: ${registeredChats.size}`,
      `Polling: ${isPolling ? 'active' : 'inactive'}`,
      `Uptime: ${Math.floor(process.uptime() / 60)}m`,
    ].join('\n')
  }

  if (cmd === '/whale') {
    return '🐋 Fetching recent whale moves...\n\nUse /whale for latest whale activity from the tracker.'
  }

  if (cmd === '/smart') {
    return '🧠 Fetching smart money signals...\n\nUse /smart for latest smart money signals from the tracker.'
  }

  if (cmd.startsWith('/pnl:')) {
    const address = cmd.slice(5).trim()
    if (!address) return '❌ Usage: /pnl:ADDRESS'
    return `💰 Fetching PnL for ${address.slice(0, 8)}...\n\nUse /pnl:ADDRESS for wallet PnL lookup.`
  }

  if (cmd === '/edge') {
    return '📈 Fetching daily edge report...\n\nUse /edge for the latest edge report from the tracker.'
  }

  if (cmd.startsWith('/price:')) {
    const symbol = cmd.slice(7).trim().toUpperCase()
    if (!symbol) return '❌ Usage: /price:SYMBOL (e.g., /price:BTC)'
    return `💲 Fetching price for ${symbol}...\n\nUse /price:SYMBOL for price check.`
  }

  if (cmd === '/help') {
    return [
      '*NEXUS Alert Bot Commands*',
      '/start — Register for alerts',
      '/stop — Unregister',
      '/status — Bot status',
      '/whale — Recent whale moves',
      '/smart — Smart money signals',
      '/pnl:ADDRESS — Wallet PnL lookup',
      '/edge — Daily edge report',
      '/price:SYMBOL — Price check',
      '/help — This message',
    ].join('\n')
  }

  return 'Unknown command. Use /help for available commands.'
}

// ─── Long Polling ────────────────────────────────────────────

async function pollUpdates(): Promise<void> {
  if (!botToken || isPolling) return
  isPolling = true

  while (isPolling) {
    try {
      const updates = await callTelegram('getUpdates', {
        offset: pollingOffset,
        timeout: 30,
        allowed_updates: ['message'],
      }) as Array<{ update_id: number; message?: { text?: string; chat: { id: number } } }> | undefined

      if (updates && updates.length > 0) {
        for (const update of updates) {
          pollingOffset = update.update_id + 1
          if (update.message?.text) {
            const chatId = String(update.message.chat.id)
            const reply = handleMessage(update.message.text, chatId)
            await callTelegram('sendMessage', {
              chat_id: chatId,
              text: reply,
              parse_mode: 'Markdown',
            })
          }
        }
      }
    } catch {
      // Polling error — retry after delay
      await sleep(5000)
    }
  }
}

// ─── Public API ──────────────────────────────────────────────

export function initTelegramBot(token?: string): void {
  botToken = token || process.env.TELEGRAM_BOT_TOKEN || ''
  if (!botToken) {
    console.warn('[Telegram] No TELEGRAM_BOT_TOKEN set — bot disabled')
    return
  }
  console.log('[Telegram] Bot initialized, starting polling...')
  void pollUpdates()
}

export async function sendTelegramAlert(chatId: string, message: string): Promise<boolean> {
  if (!botToken) return false
  try {
    await callTelegram('sendMessage', {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    })
    return true
  } catch (err) {
    console.error(`[Telegram] Failed to send alert to ${chatId}:`, (err as Error).message)
    return false
  }
}

export async function broadcastAlert(message: string): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (const chatId of registeredChats) {
    const ok = await sendTelegramAlert(chatId, message)
    if (ok) sent++
    else failed++
  }
  return { sent, failed }
}

export function registerChat(chatId: string): void {
  registeredChats.add(chatId)
}

export function unregisterChat(chatId: string): void {
  registeredChats.delete(chatId)
}

export function getRegisteredChats(): string[] {
  return Array.from(registeredChats)
}

export function getBotStatus(): { enabled: boolean; chatCount: number; polling: boolean; uptime: number } {
  return {
    enabled: !!botToken,
    chatCount: registeredChats.size,
    polling: isPolling,
    uptime: process.uptime(),
  }
}

export function stopPolling(): void {
  isPolling = false
}
