#!/bin/bash
# Backup original
cp server.cjs server.cjs.backup

# Find and show the problematic lines
echo "=== Looking for route issues ==="
grep -n "app.get\|app.use\|app.post" server.cjs | tail -20
