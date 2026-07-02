#!/bin/bash
# Generate promotional video for NEXUS Alpha Engine
# Uses FFmpeg to create a professional-looking video

set -e

OUTPUT_DIR="/home/openclaw/projects/1ai-tracker/public"
OUTPUT_FILE="$OUTPUT_DIR/promo.mp4"
TEMP_DIR="/tmp/nexus-promo"

mkdir -p "$TEMP_DIR"
mkdir -p "$OUTPUT_DIR"

# Video settings
WIDTH=1920
HEIGHT=1080
FPS=30
DURATION=30 # seconds

# Colors
BG_COLOR="#0a0a0a"
TEAL="#00d4aa"
TEXT_COLOR="#ffffff"
MUTED="#888888"

echo "Creating promotional video frames..."

# Frame 1: Logo and title (0-5s)
ffmpeg -y -f lavfi -i "color=c=$BG_COLOR:s=${WIDTH}x${HEIGHT}:d=5:r=$FPS" \
  -vf "drawtext=text='◈':fontcolor=$TEAL:fontsize=120:x=(w-tw)/2:y=h/2-150:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='NEXUS':fontcolor=$TEXT_COLOR:fontsize=80:x=(w-tw)/2:y=h/2-50:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='Alpha Engine':fontcolor=$TEAL:fontsize=48:x=(w-tw)/2:y=h/2+50:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='AI-Powered Crypto Trading Signals':fontcolor=$MUTED:fontsize=28:x=(w-tw)/2:y=h/2+120:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" \
  -c:v libx264 -pix_fmt yuv420p "$TEMP_DIR/frame1.mp4"

# Frame 2: Features (5-15s)
ffmpeg -y -f lavfi -i "color=c=$BG_COLOR:s=${WIDTH}x${HEIGHT}:d=10:r=$FPS" \
  -vf "drawtext=text='🧠  AI-Powered Signals':fontcolor=$TEXT_COLOR:fontsize=40:x=(w-tw)/2:y=200:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='Cross-correlated from trade flow, whale alerts,':fontcolor=$MUTED:fontsize=28:x=(w-tw)/2:y=280:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='funding rates, and sentiment analysis':fontcolor=$MUTED:fontsize=28:x=(w-tw)/2:y=320:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='📊  Trading Levels':fontcolor=$TEXT_COLOR:fontsize=40:x=(w-tw)/2:y=420:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='Entry, TP1, TP2, TP3, Stop Loss':fontcolor=$MUTED:fontsize=28:x=(w-tw)/2:y=500:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='⏱️  Valid Periods':fontcolor=$TEXT_COLOR:fontsize=40:x=(w-tw)/2:y=600:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='4h / 24h / 7d based on signal strength':fontcolor=$MUTED:fontsize=28:x=(w-tw)/2:y=680:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='📈  Backtested':fontcolor=$TEXT_COLOR:fontsize=40:x=(w-tw)/2:y=780:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='Historical accuracy tracked and verified':fontcolor=$MUTED:fontsize=28:x=(w-tw)/2:y=860:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" \
  -c:v libx264 -pix_fmt yuv420p "$TEMP_DIR/frame2.mp4"

# Frame 3: Live Signal Example (15-25s)
ffmpeg -y -f lavfi -i "color=c=$BG_COLOR:s=${WIDTH}x${HEIGHT}:d=10:r=$FPS" \
  -vf "drawtext=text='Live Signal Example':fontcolor=$TEAL:fontsize=36:x=(w-tw)/2:y=100:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='🟢 BTC LONG':fontcolor=$TEAL:fontsize=48:x=(w-tw)/2:y=200:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='ENTRY  $61,248':fontcolor=$TEXT_COLOR:fontsize=36:x=w/4:y=320:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='TP1  $62,803':fontcolor=$TEAL:fontsize=36:x=w/4*2:y=320:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='TP2  $64,359':fontcolor=$TEAL:fontsize=36:x=w/4*3:y=320:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='TP3  $65,915':fontcolor=$TEAL:fontsize=36:x=w/2:y=400:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='SL  $58,914':fontcolor=#ff4444:fontsize=36:x=w/2:y=480:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='Strength: 85  |  Confidence: 70%  |  R:R 2.1:1':fontcolor=$MUTED:fontsize=24:x=(w-tw)/2:y=580:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='Valid: 7 days  |  Source: whale-alert, funding-rate':fontcolor=$MUTED:fontsize=24:x=(w-tw)/2:y=630:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" \
  -c:v libx264 -pix_fmt yuv420p "$TEMP_DIR/frame3.mp4"

# Frame 4: CTA (25-30s)
ffmpeg -y -f lavfi -i "color=c=$BG_COLOR:s=${WIDTH}x${HEIGHT}:d=5:r=$FPS" \
  -vf "drawtext=text='Start Trading Smarter':fontcolor=$TEXT_COLOR:fontsize=56:x=(w-tw)/2:y=h/2-100:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='Free tier available  |  No credit card required':fontcolor=$MUTED:fontsize=28:x=(w-tw)/2:y=h/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf, \
       drawtext=text='tracker.aitradepulse.com':fontcolor=$TEAL:fontsize=36:x=(w-tw)/2:y=h/2+80:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf, \
       drawtext=text='Not financial advice. Trading involves risk.':fontcolor=$MUTED:fontsize=18:x=(w-tw)/2:y=h-80:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf" \
  -c:v libx264 -pix_fmt yuv420p "$TEMP_DIR/frame4.mp4"

# Concatenate all frames
echo "Concatenating frames..."
cat > "$TEMP_DIR/concat.txt" << EOF
file 'frame1.mp4'
file 'frame2.mp4'
file 'frame3.mp4'
file 'frame4.mp4'
EOF

ffmpeg -y -f concat -safe 0 -i "$TEMP_DIR/concat.txt" \
  -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
  "$OUTPUT_FILE"

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Promo video created: $OUTPUT_FILE"
echo "Duration: ${DURATION}s"
echo "Resolution: ${WIDTH}x${HEIGHT}"
ls -lh "$OUTPUT_FILE"
