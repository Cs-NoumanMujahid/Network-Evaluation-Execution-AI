FROM alpine:3.19

# Shared image for the 3 simulated IoT victim devices (doorbell / router / lan).
# One image, three compose services; behaviour is chosen at runtime via the
# DEVICE_NAME + BENIGN_PROFILE env vars (see entrypoint.sh).
#
# Services (same as the existing iot_victim image) give attacks a real two-sided
# target: busybox httpd :80, telnetd :23, dropbear ssh :22, openssl s_server :443.
#   - bind-tools: `dig` for the DNS portion of the benign traffic
#   - tcpdump   : self-capture of this device's own eth0 into /pcaps_iot
RUN apk add --no-cache \
    busybox-extras \
    dropbear \
    tcpdump \
    curl \
    openssl \
    bind-tools \
    && mkdir -p /www /pcaps_iot

# Minimal landing page so HTTP-based attacks / benign polls get a response.
RUN printf '<html><body><h1>NEXA IoT Device</h1><p>status: ok</p></body></html>\n' > /www/index.html

COPY entrypoint.sh /entrypoint.sh
COPY benign_doorbell.sh /benign_doorbell.sh
COPY benign_router.sh   /benign_router.sh
COPY benign_lan.sh      /benign_lan.sh
RUN chmod +x /entrypoint.sh /benign_doorbell.sh /benign_router.sh /benign_lan.sh

# http, ssh, telnet, https
EXPOSE 80 22 23 443

ENTRYPOINT ["/entrypoint.sh"]
