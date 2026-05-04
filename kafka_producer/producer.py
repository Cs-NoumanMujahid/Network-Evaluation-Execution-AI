import os
import time
import csv
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

# Configuration
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
TOPIC = os.getenv("KAFKA_TOPIC", "flows")
FLOWS_DIR = os.getenv("FLOWS_DIR", "/flows")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "20"))
SCAN_INTERVAL = int(os.getenv("SCAN_INTERVAL", "5"))

# Kafka settings
MAX_RETRIES = 10
RETRY_DELAY = 5

producer = None
for attempt in range(1, MAX_RETRIES + 1):
    try:
        print(f"Attempting to connect to Kafka (attempt {attempt}/{MAX_RETRIES})...")
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BROKER,
            value_serializer=lambda v: v.encode("utf-8"),
            retries=5,
            max_block_ms=10000
        )
        print(f"Successfully connected to Kafka broker at {KAFKA_BROKER}")
        break
    except NoBrokersAvailable:
        if attempt < MAX_RETRIES:
            print(f"Kafka not available yet. Retrying in {RETRY_DELAY} seconds...")
            time.sleep(RETRY_DELAY)
        else:
            print(f"Failed to connect to Kafka after {MAX_RETRIES} attempts. Exiting.")
            exit(1)

buffer = []
processed_files = set()

def send_batch(rows):
    payload = "\n".join(rows)
    producer.send(TOPIC, payload)
    producer.flush()
    print(f"Sent batch of {len(rows)} rows to Kafka topic '{TOPIC}'")

print("Kafka CSV Producer started")
print(f"Watching directory: {FLOWS_DIR}")
print(f"Kafka broker: {KAFKA_BROKER}")
print(f"Topic: {TOPIC}")
print(f"Batch size: {BATCH_SIZE}")

while True:
    try:
        # Get list of CSV files in the directory
        files = sorted(f for f in os.listdir(FLOWS_DIR) if f.endswith(".csv"))

        for filename in files:
            filepath = os.path.join(FLOWS_DIR, filename)

            # Skip files that have already been processed
            if filepath in processed_files:
                continue

            print(f"Processing file: {filename}")
            
            with open(filepath, "r", newline="", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, None) # Skip header

                for row in reader:
                    buffer.append(",".join(row))

                    if len(buffer) == BATCH_SIZE:
                        send_batch(buffer)
                        buffer.clear()
            
            if buffer:
                send_batch(buffer)
                buffer.clear()

            processed_files.add(filepath)
            print(f"Finished processing: {filename}")

        time.sleep(SCAN_INTERVAL)

    except KeyboardInterrupt:
        print("\nShutdown signal received")
        break

    except Exception as e:
        print(f"Error: {e}")
        time.sleep(3)

if buffer:
    print(f"Flushing {len(buffer)} remaining rows...")
    send_batch(buffer)

producer.close()
print("Producer stopped cleanly")