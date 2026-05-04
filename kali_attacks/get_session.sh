#!/bin/sh
# Step 1 - Get initial cookies
curl -s -c /tmp/cookies.txt http://172.20.0.10/dvwa/login.php > /tmp/page.html
TOKEN=$(grep user_token /tmp/page.html | grep -o "value='[a-f0-9]*'" | cut -d"'" -f2)
echo "Got token: $TOKEN"

# Step 2 - Setup database first
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X POST http://172.20.0.10/dvwa/setup.php \
-d "create_db=Create+%2F+Reset+Database&user_token=$TOKEN" -L -o /tmp/setup.html
echo "Setup done"

# Step 3 - Get fresh token after setup
curl -s -c /tmp/cookies.txt http://172.20.0.10/dvwa/login.php > /tmp/page.html
TOKEN=$(grep user_token /tmp/page.html | grep -o "value='[a-f0-9]*'" | cut -d"'" -f2)
echo "Fresh token: $TOKEN"

# Step 4 - Login
curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt -X POST http://172.20.0.10/dvwa/login.php \
-d "username=admin&password=password&Login=Login&user_token=$TOKEN" \
-L -o /tmp/after_login.html
echo "Login check:"
grep -i "logout" /tmp/after_login.html | head -2
echo "Cookies:"
cat /tmp/cookies.txt