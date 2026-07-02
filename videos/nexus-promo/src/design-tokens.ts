// ─────────────────────────────────────────────────────────────
// NEXUS Promo Video — Design Tokens
// ─────────────────────────────────────────────────────────────

export const colors = {
  // Base
  bgBase: '#0A0E17',
  bgSurface: '#111827',
  bgCard: '#1A1F2E',
  
  // Accent
  cyan: '#00E5FF',
  violet: '#8B5CF6',
  green: '#00FF9D',
  red: '#FF4444',
  
  // Text
  textPrimary: '#F1F1F1',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  
  // Glow
  cyanGlow: 'rgba(0, 229, 255, 0.3)',
  violetGlow: 'rgba(139, 92, 246, 0.3)',
  greenGlow: 'rgba(0, 255, 157, 0.3)',
}

export const fonts = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
}

export const timing = {
  fps: 30,
  // Scene durations in frames
  hook: 4 * 30,        // 4 seconds
  wordmark: 4 * 30,    // 4 seconds
  feature1: 5 * 30,    // 5 seconds
  feature2: 5 * 30,    // 5 seconds
  feature3: 5 * 30,    // 5 seconds
  socialProof: 4 * 30, // 4 seconds
  cta: 6 * 30,         // 6 seconds
  // Total: 34 seconds
}

export const totalFrames = 
  timing.hook + 
  timing.wordmark + 
  timing.feature1 + 
  timing.feature2 + 
  timing.feature3 + 
  timing.socialProof + 
  timing.cta
