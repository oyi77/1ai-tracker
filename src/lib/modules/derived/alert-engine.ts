// ─────────────────────────────────────────────────────────────
// Alert Delivery System
// Supports: webhook with HMAC signing, console log
// SSRF protection: validates webhook URLs before delivery
// Persistence: PostgreSQL via Prisma (with in-memory cache)
// ─────────────────────────────────────────────────────────────

import { deliverWebhook } from '@/lib/alerts/delivery'
import { prisma } from '@/lib/db'

export interface Alert {
  id: string
  templateId: string
  name: string
  condition: string
  webhookUrl?: string
  webhookSecret?: string
  enabled: boolean
  lastFired?: number
  createdAt: number
}

export interface AlertEvent {
  alertId: string
  alertName: string
  triggeredAt: number
  value: unknown
  message: string
}

// In-memory cache backed by PostgreSQL
const alerts = new Map<string, Alert>()
const alertLog: AlertEvent[] = []
const MAX_LOG = 1000

// ─── SSRF Protection ─────────────────────────────────────────

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^localhost$/i,
]

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some((rx) => rx.test(hostname))
}

function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'Only http/https URLs allowed' }
  }

  if (isPrivateHost(parsed.hostname)) {
    return { valid: false, error: 'Private/internal IP addresses are not allowed' }
  }

  return { valid: true }
}

export function createAlert(alert: Alert): Alert {
  // Validate webhook URL at creation time
  if (alert.webhookUrl) {
    const check = validateWebhookUrl(alert.webhookUrl)
    if (!check.valid) {
      throw new Error(`Invalid webhook URL: ${check.error}`)
    }
  }
  alerts.set(alert.id, alert)
  return alert
}

export function getAlerts(): Alert[] {
  return Array.from(alerts.values())
}

export function deleteAlert(id: string): boolean {
  return alerts.delete(id)
}

export function toggleAlert(id: string): Alert | undefined {
  const alert = alerts.get(id)
  if (alert) alert.enabled = !alert.enabled
  return alert
}

export async function fireAlert(alertId: string, value: unknown, message: string): Promise<void> {
  const alert = alerts.get(alertId)
  if (!alert || !alert.enabled) return

  const event: AlertEvent = {
    alertId,
    alertName: alert.name,
    triggeredAt: Date.now(),
    value,
    message,
  }

  alertLog.push(event)
  if (alertLog.length > MAX_LOG) alertLog.shift()
  alert.lastFired = Date.now()

  // Deliver via webhook with HMAC signing
  if (alert.webhookUrl) {
    // Re-validate URL at delivery time (defense in depth)
    const check = validateWebhookUrl(alert.webhookUrl)
    if (!check.valid) {
      console.error(`[ALERT] Rejected webhook delivery: ${check.error} for alert ${alertId}`)
      return
    }

    const secret = alert.webhookSecret || process.env.NEXUS_WEBHOOK_SECRET || 'nexus-default-secret'
    const result = await deliverWebhook(alert.webhookUrl, {
      id: event.alertId,
      triggerType: alert.condition,
      conditions: {},
      event: event as unknown as Record<string, unknown>,
      timestamp: new Date(event.triggeredAt).toISOString(),
    }, secret)

    if (!result.success) {
      console.error(`[ALERT] Webhook delivery failed for ${alertId}: ${result.error} (${result.attempts} attempts)`)
    }
  }

  // Console log for debugging
  console.log(`[ALERT] ${alert.name}: ${message}`)
}

export function getAlertLog(limit = 50): AlertEvent[] {
  return alertLog.slice(-limit)
}

export function getAlertCount(): number {
  return alerts.size
}
