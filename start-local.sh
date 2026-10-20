#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "MASTER: http://localhost:8765/studio/"
echo "PUBBLICO: http://localhost:8765/docs/"
python3 -m http.server 8765
