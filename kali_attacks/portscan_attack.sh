#!/bin/sh
echo "[PORTSCAN] Starting..."
TARGET="172.20.0.10"
END=$(($(date +%s) + 600))

while [ $(date +%s) -lt $END ]; do
    nmap -sS -p 1-1000 $TARGET -T4 2>/dev/null
    nmap -sV -p 80,443,22,21,3306 $TARGET 2>/dev/null
    nmap -sS -p 1-65535 $TARGET -T3 2>/dev/null
    sleep $((RANDOM % 4 + 2))
done
echo "[PORTSCAN] Done."