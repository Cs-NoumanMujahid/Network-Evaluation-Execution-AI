FROM alpine:3.19

# The "internet / cloud / DNS" peer the IoT victim devices talk to for their
# benign traffic. Unregistered on purpose (its IP is never a RegisteredDevice),
# so every victim<->cloud flow is attributed to the VICTIM side by the backend.
#   - busybox-extras: httpd (serves benign files of varied sizes)
#   - openssl       : TLS endpoint on :443 for device heartbeats / clips
#   - dnsmasq       : answers every DNS name with itself (clean two-sided DNS)
RUN apk add --no-cache busybox-extras openssl dnsmasq && mkdir -p /www

# Benign content of varied sizes so device downloads look realistic.
#   status    : tiny monitor/keepalive poll target
#   index/... : small "web pages" for the LAN browsing mix
#   clip.bin  : ~256 KB doorbell clip / live-view chunk
#   fw.bin    : ~3 MB router firmware / throughput-sample blob
RUN printf 'ok\n' > /www/status \
 && printf '<html><body><h1>NEXA IoT Cloud</h1><p>status: ok</p></body></html>\n' > /www/index.html \
 && printf '<html><body><h1>about</h1></body></html>\n' > /www/about.html \
 && printf '<html><body><h1>news</h1></body></html>\n' > /www/news.html \
 && printf '<html><body><h1>mail</h1></body></html>\n' > /www/mail.html \
 && printf '<html><body><h1>portal</h1></body></html>\n' > /www/portal.html \
 && dd if=/dev/urandom of=/www/clip.bin bs=1024 count=256  2>/dev/null \
 && dd if=/dev/urandom of=/www/fw.bin   bs=1024 count=3072 2>/dev/null

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# http, dns, https
EXPOSE 80 53 443

ENTRYPOINT ["/entrypoint.sh"]
