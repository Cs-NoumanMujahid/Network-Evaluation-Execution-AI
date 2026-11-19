FROM kalilinux/kali-rolling

# Same real-attack tool set as iot_attacker, plus python3 for the flow injector.
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    hydra \
    slowhttptest \
    hping3 \
    curl \
    netcat-traditional \
    dsniff \
    dnsutils \
    iputils-ping \
    python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY run_cycle.sh /run_cycle.sh
RUN sed -i 's/\r$//' /run_cycle.sh && chmod +x /run_cycle.sh

# attack_simulation/ (scripts + testcases + banks_spread) and flows_iot are
# bind-mounted at runtime by docker-compose. Only runs a pass when AUTO_ATTACK=1;
# otherwise stays idle so the container can be inspected / exec'd into.
CMD ["sh", "-c", "if [ \"$AUTO_ATTACK\" = \"1\" ]; then /run_cycle.sh; else tail -f /dev/null; fi"]
