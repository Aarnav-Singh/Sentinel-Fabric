"""ScyllaDB Repository for high-volume incident data (cases/alerts)."""
from __future__ import annotations

import logging
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from cassandra.query import dict_factory

logger = logging.getLogger(__name__)

class ScyllaRepository:
    def __init__(self, contact_points: List[str] = ["localhost"], port: int = 9042):
        self.contact_points = contact_points
        self.port = port
        self.cluster = None
        self.session = None

    def connect(self):
        """Connect to ScyllaDB cluster and ensure keyspace/tables exist."""
        try:
            self.cluster = Cluster(contact_points=self.contact_points, port=self.port)
            self.session = self.cluster.connect()
            self.session.row_factory = dict_factory

            # Create keyspace
            self.session.execute("""
                CREATE KEYSPACE IF NOT EXISTS sentinel
                WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
            """)
            
            # Switch to keyspace
            self.session.set_keyspace('sentinel')

            # Create tables
            self.session.execute("""
                CREATE TABLE IF NOT EXISTS cases (
                    tenant_id text,
                    case_id uuid,
                    created_at timestamp,
                    severity text,
                    status text,
                    title text,
                    PRIMARY KEY ((tenant_id), created_at, case_id)
                ) WITH CLUSTERING ORDER BY (created_at DESC)
            """)

            self.session.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    tenant_id text,
                    alert_id uuid,
                    created_at timestamp,
                    event_id text,
                    ml_score float,
                    severity text,
                    PRIMARY KEY ((tenant_id), created_at, alert_id)
                ) WITH CLUSTERING ORDER BY (created_at DESC)
            """)

            logger.info("Connected to ScyllaDB and initialized schema")

        except Exception as e:
            logger.error(f"Failed to connect to ScyllaDB: {e}")
            raise

    def close(self):
        if self.cluster:
            self.cluster.shutdown()

    def write_case(self, tenant_id: str, case_data: Dict[str, Any]) -> uuid.UUID:
        case_id = case_data.get('case_id')
        if isinstance(case_id, str):
            case_id = uuid.UUID(case_id)
        elif not case_id:
            case_id = uuid.uuid4()

        created_at = case_data.get('created_at', datetime.utcnow())

        query = """
            INSERT INTO cases (tenant_id, case_id, created_at, severity, status, title)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        self.session.execute(query, (
            tenant_id,
            case_id,
            created_at,
            case_data.get('severity', 'info'),
            case_data.get('status', 'open'),
            case_data.get('title', 'Unknown Case')
        ))
        
        return case_id

    def write_alert(self, tenant_id: str, alert_data: Dict[str, Any]) -> uuid.UUID:
        alert_id = alert_data.get('alert_id')
        if isinstance(alert_id, str):
            alert_id = uuid.UUID(alert_id)
        elif not alert_id:
            alert_id = uuid.uuid4()

        created_at = alert_data.get('created_at', datetime.utcnow())

        query = """
            INSERT INTO alerts (tenant_id, alert_id, created_at, event_id, ml_score, severity)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        self.session.execute(query, (
            tenant_id,
            alert_id,
            created_at,
            alert_data.get('event_id', ''),
            float(alert_data.get('ml_score', 0.0)),
            alert_data.get('severity', 'info')
        ))

        return alert_id

    def get_cases(self, tenant_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        query = "SELECT * FROM cases WHERE tenant_id = %s LIMIT %s"
        result = self.session.execute(query, (tenant_id, limit))
        return list(result)

    def get_alerts(self, tenant_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        query = "SELECT * FROM alerts WHERE tenant_id = %s LIMIT %s"
        result = self.session.execute(query, (tenant_id, limit))
        return list(result)
