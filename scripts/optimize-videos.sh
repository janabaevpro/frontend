#!/usr/bin/env bash
# Сжимает видео для AR: короткая сторона до 720 px, H.264 + AAC, faststart.
# Использование:
#   bash scripts/optimize-videos.sh originals assets/videos
# где "originals" — папка с исходными mp4 (video-1.mp4 ... video-5.mp4).
set -euo pipefail

IN_DIR="${1:-originals}"
OUT_DIR="${2:-assets/videos}"

mkdir -p "$OUT_DIR"

for f in "$IN_DIR"/*.mp4; do
  name="$(basename "$f")"
  echo "→ $name"

  ffmpeg -y -i "$f" \
    -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p \
    -crf 26 -preset slow \
    -vf "scale='if(lt(iw,ih),min(720,iw),-2)':'if(lt(iw,ih),-2,min(720,ih))'" \
    -c:a aac -b:a 96k -ac 2 \
    -movflags +faststart \
    "$OUT_DIR/$name"
done

echo "Размеры после сжатия:"
ls -lh "$OUT_DIR"
