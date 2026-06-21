// ─────────────────────────────────────────────────────────────
// Sentiment Scoring Engine
// Scores news articles using keyword-based NLP (no external API)
// Upgraded: funNLP-inspired sentiment lexicons, negations, modifiers
// ─────────────────────────────────────────────────────────────

export interface SentimentScore {
  score: number        // -1.0 (bearish) to +1.0 (bullish)
  label: 'bullish' | 'bearish' | 'neutral'
  confidence: number   // 0.0 to 1.0
  signals: string[]    // matched keywords
}

const BULLISH_KEYWORDS = [
  'surge', 'rally', 'breakout', 'bullish', 'all-time high', 'ath', 'pump', 'moon',
  'adoption', 'partnership', 'launch', 'approval', 'etf approved', 'institutional',
  'accumulation', 'buying', 'upgrade', 'milestone', 'record high', 'growth',
  'revenue increase', 'profit', 'outperform', 'beat expectations', 'positive',
  'recovery', 'rebound', 'uptrend', 'support holding', 'demand increasing',
  'supply squeeze', 'halving', 'deflationary', 'burning', 'staking increase',
  'innovation', 'lucrative', 'breakthrough', 'expansion', 'optimism', 'stellar',
  'promising', 'buy rating', 'overweight', 'target price raised', 'dividends'
]

const BEARISH_KEYWORDS = [
  'crash', 'dump', 'bearish', 'sell-off', 'selloff', 'decline', 'drop', 'plunge',
  'hack', 'exploit', 'rug pull', 'scam', 'fraud', 'sec lawsuit', 'regulation',
  'ban', 'crackdown', 'warning', 'risk', 'bubble', 'overvalued', 'downgrade',
  'bankruptcy', 'insolvency', 'liquidation', 'margin call', 'fear', 'panic',
  'capitulation', 'death cross', 'support broken', 'resistance rejection',
  'whale selling', 'exchange outflow', 'funding negative', 'contango',
  'lawsuit', 'subpoena', 'layoffs', 'recession', 'inflation', 'default',
  'missed expectations', 'loss', 'underperform', 'sell rating'
]

const NEGATIONS = ['not', "isn't", "aren't", "wasn't", "weren't", 'no', 'never', 'barely', 'hardly', 'lack of']
const MULTIPLIERS = ['very', 'highly', 'extremely', 'massive', 'huge', 'significant', 'historic', 'unprecedented']

const ASSET_KEYWORDS: Record<string, string[]> = {
  'BTC': ['bitcoin', 'btc', 'satoshi', 'halving', 'digital gold'],
  'ETH': ['ethereum', 'eth', 'vitalik', 'merge', 'staking', 'eip'],
  'SOL': ['solana', 'sol', 'phantom', 'raydium', 'jupiter'],
  'BNB': ['binance', 'bnb', 'cz', 'changpeng'],
  'XRP': ['ripple', 'xrp', 'garlinghouse'],
  'ADA': ['cardano', 'ada', 'hoskinson'],
  'DOGE': ['dogecoin', 'doge', 'elon', 'musk'],
  'LINK': ['chainlink', 'link', 'oracle'],
  'AVAX': ['avalanche', 'avax', 'subnet'],
  'DOT': ['polkadot', 'dot', 'parachain'],
  'UNI': ['uniswap', 'uni', 'dex'],
  'AAVE': ['aave', 'lending', 'defi lending'],
  'MATIC': ['polygon', 'matic', 'zk'],
  'ARB': ['arbitrum', 'arb', 'l2', 'layer 2'],
  'OP': ['optimism', 'op', 'superchain'],
}

export function scoreSentiment(text: string): SentimentScore {
  const lower = text.toLowerCase()
  const words = lower.split(/\W+/)
  const signals: string[] = []
  
  let rawScore = 0
  let matchedCount = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (!word) continue
    
    // Simple window check for n-grams (up to 3 words)
    const window2 = i < words.length - 1 ? `${word} ${words[i+1]}` : ''
    const window3 = i < words.length - 2 ? `${word} ${words[i+1]} ${words[i+2]}` : ''
    
    let match: string | null = null
    let polarity = 0
    
    if (window3 && BULLISH_KEYWORDS.includes(window3)) { match = window3; polarity = 1 }
    else if (window3 && BEARISH_KEYWORDS.includes(window3)) { match = window3; polarity = -1 }
    else if (window2 && BULLISH_KEYWORDS.includes(window2)) { match = window2; polarity = 1 }
    else if (window2 && BEARISH_KEYWORDS.includes(window2)) { match = window2; polarity = -1 }
    else if (BULLISH_KEYWORDS.includes(word)) { match = word; polarity = 1 }
    else if (BEARISH_KEYWORDS.includes(word)) { match = word; polarity = -1 }
    
    if (match) {
      let isNegated = false
      let hasMultiplier = false
      
      // Check previous 2 words for negation or multiplier
      for (let j = Math.max(0, i - 2); j < i; j++) {
        if (NEGATIONS.includes(words[j])) isNegated = !isNegated
        if (MULTIPLIERS.includes(words[j])) hasMultiplier = true
      }
      
      let weight = polarity
      if (isNegated) weight *= -0.5 // Negation dampens and flips
      if (hasMultiplier) weight *= 1.5
      
      rawScore += weight
      matchedCount++
      signals.push(`${weight > 0 ? '+' : '-'}${match}${isNegated ? '(negated)' : ''}`)
      
      // Skip matched n-grams
      if (match === window3) i += 2
      else if (match === window2) i += 1
    }
  }

  if (matchedCount === 0) return { score: 0, label: 'neutral', confidence: 0.1, signals: [] }

  const score = Math.max(-1, Math.min(1, rawScore / (matchedCount * 0.8)))
  const confidence = Math.min(1, matchedCount * 0.2) 

  return {
    score,
    label: score > 0.1 ? 'bullish' : score < -0.1 ? 'bearish' : 'neutral',
    confidence,
    signals: signals.slice(0, 10),
  }
}

export function detectAssets(text: string): string[] {
  const lower = text.toLowerCase()
  const detected: string[] = []

  for (const [symbol, keywords] of Object.entries(ASSET_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(symbol)
    }
  }

  return detected
}
