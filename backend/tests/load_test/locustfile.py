from locust import HttpUser, task, between, events
import time
import random
import uuid
from datetime import datetime

class IngestUser(HttpUser):
    wait_time = between(0.01, 0.1)  # Aggressive wait time to generate high throughput

    def generate_random_event(self):
        """Generate a randomized security event matching the Sentinel schema."""
        event_types = ["Failed Login", "Port Scan", "Brute Force", "Data Exfiltration", "Malware Detected"]
        sources = ["192.168.1.100", "10.0.0.5", "172.16.0.4", "203.0.113.5", "198.51.100.10"]
        destinations = ["192.168.1.1", "10.0.0.1", "172.16.0.1"]
        severities = ["low", "medium", "high", "critical"]
        
        return {
            "source_type": random.choice(["syslog", "suricata", "zeek", "windows_event_log", "osquery"]),
            "event_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "message": f"{random.choice(event_types)} detected from {random.choice(sources)}.",
            "severity": random.choice(severities),
            "source_ip": random.choice(sources),
            "destination_ip": random.choice(destinations),
            "action": random.choice(["allowed", "blocked", "alerted"]),
            "username": random.choice(["admin", "root", "user1", "svc_account", None]),
            "raw_log": "Raw log data simulating a real SIEM event payload format."
        }

    @task(3)
    def ingest_single_event(self):
        """Task to send a single event."""
        payload = self.generate_random_event()
        with self.client.post("/api/v1/ingest", json=payload, catch_response=True) as response:
            if response.status_code == 200 or response.status_code == 202:
                response.success()
            else:
                response.failure(f"Failed with status {response.status_code}: {response.text}")

    @task(1)
    def ingest_batch_events(self):
        """Task to send a batch of events assuming that endpoint supports list of events or just loop."""
        for _ in range(10):
            self.ingest_single_event()

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("Starting load test on Sentinel Fabric V2 Ingest API...")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("Stopping load test...")
