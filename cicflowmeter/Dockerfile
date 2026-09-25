FROM eclipse-temurin:8-jre

WORKDIR /app

# Install libpcap and create necessary symlinks
RUN apt-get update && \
    apt-get install -y libpcap0.8 libpcap-dev && \
    ln -sf /usr/lib/x86_64-linux-gnu/libpcap.so.0.8 /usr/lib/x86_64-linux-gnu/libpcap.so || \
    ln -sf /usr/lib/x86_64-linux-gnu/libpcap.so.1 /usr/lib/x86_64-linux-gnu/libpcap.so && \
    rm -rf /var/lib/apt/lists/*

# Copy the pre-built JAR and libraries
COPY CicFlowMeterMaster/build/libs/CICFlowMeter-4.0.jar /app/
COPY CicFlowMeterMaster/libs/*.jar /app/libs/

# Copy jnetpcap native libraries
COPY CicFlowMeterMaster/jnetpcap/linux/jnetpcap-1.4.r1425/*.so /app/lib/native/
COPY CicFlowMeterMaster/jnetpcap/linux/jnetpcap-1.4.r1425/jnetpcap.jar /app/lib/native/

# Set library path for jnetpcap
ENV LD_LIBRARY_PATH=/app/lib/native:/usr/lib/x86_64-linux-gnu

# Verify the setup
RUN echo "=== Verifying libpcap symlink ===" && \
    ls -la /usr/lib/x86_64-linux-gnu/libpcap* && \
    echo "=== Testing library dependencies ===" && \
    ldd /app/lib/native/libjnetpcap.so

CMD ["/bin/sh"]