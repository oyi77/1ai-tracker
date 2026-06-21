// §2.2 — Typography
// Three font roles, one type scale — no exceptions

export const fonts = {
  mono:    '"IBM Plex Mono", "JetBrains Mono", monospace',  // ALL numeric data
  ui:      '"Inter", system-ui, sans-serif',                 // labels, nav, buttons
  display: '"Syne", "Space Grotesk", sans-serif',            // section headers only
} as const

export const sizes = {
  'data-xs':  '10px',   // compact table cells, sub-labels (decorative — pair with tooltip)
  'data-sm':  '11px',   // standard table data
  'data-md':  '12px',   // prominent metrics
  'data-lg':  '14px',   // card titles, nav items
  'head-sm':  '16px',   // section headers
  'head-md':  '20px',   // panel titles
  'head-lg':  '28px',   // page-level KPI numbers (Syne)
  'hero':     '40px',   // landing / hero only
} as const

