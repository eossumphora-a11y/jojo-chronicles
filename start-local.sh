#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ -x .venv/bin/python ]; then
  .venv/bin/python local_server.py
else
  python3 local_server.py
fi
