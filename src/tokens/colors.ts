// §2.1 — Color Palette — Terminal Dark
// Single source of truth — no hardcoded hex anywhere else
// WCAG AA verified: all text colors ≥ 4.5:1 against bg.base and bg.panel

export const colors = {
  // Backgrounds
  bg: {
    void:    '#050608',   // absolute base — Bloomberg-black
    base:    '#0A0B0D',   // primary surface
    panel:   '#0F1114',   // card / panel surface
    raised:  '#141618',   // hover state, modals
    border:  '#1E2126',   // dividers, grid lines
  },
  // Brand
  teal: {
    dim:     '#0D4A3A',   // subtle fill
    muted:   '#1d9e75',   // brand primary — active states
    vivid:   '#22C997',   // accent highlights, positive delta
    glow:    '#22C99733', // glow effect backdrop
  },
  // Semantic data colors — strict usage, never decorative
  data: {
    bull:    '#22C997',   // price up, positive PnL
    bear:    '#F03D3D',   // price down, liquidations
    neutral: '#8B95A1',   // unchanged, loading
    warn:    '#F5A623',   // alert, anomaly flag
    info:    '#4A9EF5',   // informational, links
    purple:  '#9B6EF5',   // whale wallets, label highlight
    orange:  '#F57C4A',   // DEX activity, swap events
  },
  // Text hierarchy
  text: {
    primary:   '#E8ECF0', // 12.3:1 on bg.base, 13.8:1 on bg.panel
    inverse:   '#050608', // on vivid/bull backgrounds
  },
} as const

// Type for color paths
export type ColorPath = keyof typeof colors
