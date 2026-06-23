"use client"

import { useState, useEffect, useCallback } from 'react'
import { NexusLayout } from '@/components/layout/NexusLayout'
import { Panel } from '@/components/shell/Panel'
import { AlertPill } from '@/components/primitives/AlertPill'
import { LiveDot } from '@/components/primitives/LiveDot'
import { PriceTag } from '@/components/primitives/PriceTag'
import { TxHash } from '@/components/primitives/TxHash'

interface AlertRule {
  id: string
  name: string
  type: string
  condition: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  enabled: boolean
  lastTriggered: string
  fireCount: number
}

interface TriggeredAlert {
  id: string
  ruleId: string
  ruleName: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  value: number
  txHash?: string
  timestamp: string
}

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([])
  const [feedStatus, setFeedStatus] = useState<'live' | 'stale' | 'error'>('live')
  const [showCreate, setShowCreate] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/alerts')

      if (res.status === 401) {
        setRules([])
        setTriggered([])
        setFeedStatus('error')
        return
      }

      const data = await res.json() as { data?: { rules?: AlertRule[]; triggered?: TriggeredAlert[] } }

      setRules(data.data?.rules ?? [])
      setTriggered(data.data?.triggered ?? [])
      setFeedStatus('live')
    } catch {
      setFeedStatus('error')
    }
  }, [])

  useEffect(() => {
    const invoke = () => fetchAlerts()
    invoke()
    const interval = setInterval(fetchAlerts, 30_000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  return (
    <NexusLayout>
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-head font-bold text-text-primary">Alerts</h1>
            <p className="text-[11px] text-text-muted font-mono">Configurable on-chain alert engine</p>
          </div>
          <div className="flex items-center gap-2">
            <LiveDot status={feedStatus} label />
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3 py-1.5 rounded bg-teal-dim/30 text-teal-vivid text-[11px] font-mono hover:bg-teal-dim/50 transition-colors"
            >
              + New Alert
            </button>
          </div>
        </div>

        {/* Create Alert Form (toggle) */}
        {showCreate && (
          <Panel title="Create Alert" subtitle="Configure new alert rule">
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-text-muted font-mono block mb-1">ALERT NAME</label>
                  <input className="w-full bg-bg-raised border border-bg-border rounded px-2 py-1.5 text-[11px] font-mono text-text-primary" placeholder="My Alert" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted font-mono block mb-1">TYPE</label>
                  <select className="w-full bg-bg-raised border border-bg-border rounded px-2 py-1.5 text-[11px] font-mono text-text-primary">
                    <option>Wallet Movement</option>
                    <option>Price Threshold</option>
                    <option>Large Swap</option>
                    <option>Smart Money Signal</option>
                    <option>Liquidation</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-text-muted font-mono block mb-1">CONDITION</label>
                <input className="w-full bg-bg-raised border border-bg-border rounded px-2 py-1.5 text-[11px] font-mono text-text-primary" placeholder="e.g., transfers > $500K" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-[11px] font-mono text-text-muted hover:text-text-secondary">Cancel</button>
                <button className="px-3 py-1.5 rounded bg-teal-vivid text-bg-base text-[11px] font-mono font-bold">Create Alert</button>
              </div>
            </div>
          </Panel>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
          {/* Alert Rules */}
          <Panel
            title="Alert Rules"
            subtitle={`${rules.filter(r => r.enabled).length} active`}
            liveStatus={feedStatus}
            maxHeight={500}
          >
            <div className="space-y-0">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 px-3 py-2 border-b border-bg-border/50 hover:bg-bg-raised/50 transition-colors"
                >
                  <AlertPill severity={rule.severity} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-text-primary">{rule.name}</div>
                    <div className="text-[10px] text-text-muted font-mono">{rule.condition}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-text-muted">Last: {rule.lastTriggered}</div>
                    <div className="text-[10px] text-text-muted">Fires: {rule.fireCount}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-data-bull' : 'bg-text-muted'}`} />
                </div>
              ))}
            </div>
          </Panel>

          {/* Triggered Alerts */}
          <Panel
            title="Triggered Alerts"
            subtitle={`${triggered.length} recent`}
            liveStatus={feedStatus}
            maxHeight={500}
          >
            <div className="space-y-0">
              {triggered.map((alert) => (
                <div
                  key={alert.id}
                  className="px-3 py-2 border-b border-bg-border/50 hover:bg-bg-raised/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertPill severity={alert.severity} size="xs" />
                    <span className="text-[10px] text-text-muted font-mono">{alert.timestamp}</span>
                    <span className="text-[10px] text-text-secondary">{alert.ruleName}</span>
                  </div>
                  <div className="text-[11px] font-mono text-text-primary">{alert.message}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {alert.value && <PriceTag value={alert.value} size="xs" />}
                    {alert.txHash && <TxHash hash={alert.txHash} truncate={6} />}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </NexusLayout>
  )
}
