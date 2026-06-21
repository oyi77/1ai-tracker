import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerChat,
  unregisterChat,
  getRegisteredChats,
  getBotStatus,
  stopPolling,
} from '../bot'

describe('Telegram Bot', () => {
  beforeEach(() => {
    // Clear registered chats between tests
    for (const chat of getRegisteredChats()) {
      unregisterChat(chat)
    }
    stopPolling()
  })

  it('registers and unregisters chats', () => {
    registerChat('12345')
    expect(getRegisteredChats()).toContain('12345')

    unregisterChat('12345')
    expect(getRegisteredChats()).not.toContain('12345')
  })

  it('tracks multiple chats', () => {
    registerChat('111')
    registerChat('222')
    registerChat('333')
    expect(getRegisteredChats()).toHaveLength(3)
  })

  it('does not duplicate chats', () => {
    registerChat('12345')
    registerChat('12345')
    expect(getRegisteredChats()).toHaveLength(1)
  })

  it('returns correct bot status', () => {
    registerChat('111')
    registerChat('222')
    const status = getBotStatus()
    expect(status.chatCount).toBe(2)
    expect(typeof status.uptime).toBe('number')
    expect(typeof status.enabled).toBe('boolean')
  })

  it('handles unregister of non-existent chat gracefully', () => {
    unregisterChat('nonexistent')
    expect(getRegisteredChats()).toHaveLength(0)
  })
})
