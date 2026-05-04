FROM kalilinux/kali-rolling

# Update and install security tools
RUN apt-get update && apt-get install -y \
    nmap \
    sqlmap \
    hydra \
    slowhttptest \
    curl \
    medusa \
    hping3 \
    nikto \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /attacks

# Keep container running
CMD ["tail", "-f", "/dev/null"]
