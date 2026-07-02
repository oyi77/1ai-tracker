// ─────────────────────────────────────────────────────────────
// NEXUS Promo Video — Main Composition
// Assembles all scenes via <Sequence>
// ─────────────────────────────────────────────────────────────

import React from 'react'
import { AbsoluteFill, Sequence } from 'remotion'
import { timing } from './design-tokens'
import { HookScene } from './components/HookScene'
import { WordmarkScene } from './components/WordmarkScene'
import { Feature1Scene, Feature2Scene, Feature3Scene } from './components/FeatureScene'
import { SocialProofScene } from './components/SocialProofScene'
import { CTAScene } from './components/CTAScene'

export const Video: React.FC = () => {
  let offset = 0

  const scenes = [
    { component: HookScene, duration: timing.hook, name: 'Hook' },
    { component: WordmarkScene, duration: timing.wordmark, name: 'Wordmark' },
    { component: Feature1Scene, duration: timing.feature1, name: 'Feature1' },
    { component: Feature2Scene, duration: timing.feature2, name: 'Feature2' },
    { component: Feature3Scene, duration: timing.feature3, name: 'Feature3' },
    { component: SocialProofScene, duration: timing.socialProof, name: 'SocialProof' },
    { component: CTAScene, duration: timing.cta, name: 'CTA' },
  ]

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0E17' }}>
      {scenes.map((scene) => {
        const from = offset
        offset += scene.duration

        return (
          <Sequence
            key={scene.name}
            from={from}
            durationInFrames={scene.duration}
            name={scene.name}
          >
            <scene.component />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
