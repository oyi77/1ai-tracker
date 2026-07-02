// ─────────────────────────────────────────────────────────────
// Root.tsx — Register compositions
// ─────────────────────────────────────────────────────────────

import { Composition } from 'remotion'
import { Video } from './Video'
import { totalFrames, timing } from './design-tokens'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 16:9 Landscape (1920x1080) */}
      <Composition
        id="NexusPromo"
        component={Video}
        durationInFrames={totalFrames}
        fps={timing.fps}
        width={1920}
        height={1080}
      />

      {/* 9:16 Vertical (1080x1920) for Reels/Shorts */}
      <Composition
        id="NexusPromo-Vertical"
        component={Video}
        durationInFrames={totalFrames}
        fps={timing.fps}
        width={1080}
        height={1920}
      />
    </>
  )
}
