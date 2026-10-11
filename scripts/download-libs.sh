#!/usr/bin/env bash
# Скачивает A-Frame и MindAR в assets/lib (с версией в имени файла).
# Запуск из корня проекта:  bash scripts/download-libs.sh
set -euo pipefail

mkdir -p assets/lib

curl -fL "https://aframe.io/releases/1.4.2/aframe.min.js" \
  -o assets/lib/aframe-1.4.2.min.js

curl -fL "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js" \
  -o assets/lib/mindar-image-aframe-1.2.5.prod.js

echo "Готово:"
ls -lh assets/lib
