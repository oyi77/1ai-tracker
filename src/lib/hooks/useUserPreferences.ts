import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BaseCurrency = 'USD' | 'IDR' | 'EUR' | 'GBP' | 'JPY' | 'SGD'

export interface CurrencyRates {
  [currency: string]: number
}

interface PreferencesState {
  currency: BaseCurrency
  rates: CurrencyRates
  ratesUpdated: number
  setCurrency: (currency: BaseCurrency) => void
  fetchRates: () => Promise<void>
  convert: (valueInUsd: number) => number
  format: (valueInUsd: number, options?: { showCode?: boolean; maxDecimals?: number; compact?: boolean }) => string
}

// Fixed fallback rates (based on approx 2026 rates) in case API is down
const FALLBACK_RATES: CurrencyRates = {
  USD: 1.0,
  IDR: 16250.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 162.0,
  SGD: 1.34,
}

export const useUserPreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      rates: FALLBACK_RATES,
      ratesUpdated: 0,

      setCurrency: (currency) => {
        set({ currency })
      },

      fetchRates: async () => {
        const now = Date.now()
        // Cache rates for 1 hour
        if (now - get().ratesUpdated < 60 * 60 * 1000 && get().rates.USD === 1) {
          return
        }

        try {
          const res = await fetch('/api/v1/forex?base=USD')
          if (!res.ok) throw new Error('Failed to fetch rates')
          const d = await res.json()
          if (d.data?.rates) {
            set({
              rates: { ...FALLBACK_RATES, ...d.data.rates },
              ratesUpdated: now,
            })
          }
        } catch (e) {
          console.warn('[PREFERENCES] Error fetching exchange rates, using cache/fallbacks:', e)
        }
      },

      convert: (valueInUsd) => {
        const { currency, rates } = get()
        const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1.0
        return valueInUsd * rate
      },

      format: (valueInUsd, options) => {
        const { currency } = get()
        const converted = get().convert(valueInUsd)

        const showCode = options?.showCode ?? false
        const compact = options?.compact ?? false
        
        let maxDecimals = options?.maxDecimals
        if (maxDecimals === undefined) {
          maxDecimals = currency === 'IDR' ? (converted >= 1000 ? 0 : 2) : (converted >= 100 ? 0 : 2)
        }

        // Format prefixes/suffixes based on currency
        const symbols: Record<BaseCurrency, { prefix: string; suffix: string }> = {
          USD: { prefix: '$', suffix: '' },
          IDR: { prefix: 'Rp ', suffix: '' },
          EUR: { prefix: '€', suffix: '' },
          GBP: { prefix: '£', suffix: '' },
          JPY: { prefix: '¥', suffix: '' },
          SGD: { prefix: 'S$', suffix: '' },
        }

        const symbol = symbols[currency] || { prefix: '$', suffix: '' }

        let formatted = ''
        if (compact) {
          if (converted >= 1e12) {
            formatted = `${(converted / 1e12).toFixed(1)}T`
          } else if (converted >= 1e9) {
            formatted = `${(converted / 1e9).toFixed(1)}B`
          } else if (converted >= 1e6) {
            formatted = `${(converted / 1e6).toFixed(1)}M`
          } else if (converted >= 1e3) {
            formatted = `${(converted / 1e3).toFixed(0)}K`
          } else {
            formatted = converted.toFixed(maxDecimals)
          }
        } else {
          formatted = converted.toLocaleString('en-US', {
            maximumFractionDigits: maxDecimals,
            minimumFractionDigits: maxDecimals > 0 ? 2 : 0,
          })
        }

        const codeStr = showCode ? ` ${currency}` : ''
        return `${symbol.prefix}${formatted}${symbol.suffix}${codeStr}`
      },
    }),
    {
      name: 'nexus-user-preferences-v1',
      partialize: (state) => ({
        currency: state.currency,
        rates: state.rates,
        ratesUpdated: state.ratesUpdated,
      }),
    }
  )
)
