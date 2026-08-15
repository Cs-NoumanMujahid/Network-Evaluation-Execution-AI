import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ids_backend.settings')
django.setup()

from api.models import FlowRecord, Incident

def seed():
    print("Seeding dummy data...")
    
    # Clear existing
    FlowRecord.objects.all().delete()
    Incident.objects.all().delete()
    
    attack_types = ["PortScan", "SQL-Injection", "BruteForce-Web", "DoS-Slowloris", "XSS"]
    severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    
    now = timezone.now()
    
    for i in range(100):
        timestamp = now - timedelta(minutes=random.randint(0, 60))
        is_alert = random.random() > 0.8
        prediction = random.choice(attack_types) if is_alert else "Benign"
        severity = random.choice(severities) if is_alert else "NORMAL"
        
        flow = FlowRecord.objects.create(
            timestamp=timestamp,
            src_ip=f"192.168.1.{random.randint(10, 200)}",
            dst_ip="10.0.0.5",
            dst_port=80,
            protocol=6,
            prediction=prediction,
            severity=severity,
            confidence=random.uniform(0.7, 0.99),
            is_alert=is_alert,
            source_type="website"
        )
        
        if is_alert:
            Incident.objects.create(
                flow=flow,
                attack_type=prediction,
                severity=severity,
                src_ip=flow.src_ip,
                dst_ip=flow.dst_ip,
                status=random.choice(['open', 'acknowledged', 'resolved']),
                recommended_action="Block IP"
            )

    print(f"Done! Seeded {FlowRecord.objects.count()} flows.")

if __name__ == "__main__":
    seed()
