"""Automated Threat Hunting Service via LangGraph and APScheduler."""
import asyncio
import uuid
from datetime import datetime
import structlog
from app.dependencies import get_app_clickhouse, get_app_qdrant, get_app_postgres

logger = structlog.get_logger(__name__)


class ThreatHuntingAgent:
    """Proactive Threat Hunting Agent querying ClickHouse and Qdrant."""

    def __init__(self, ch_repo, qdrant_repo, pg_repo):
        self.ch = ch_repo
        self.qdrant = qdrant_repo
        self.pg = pg_repo

    async def run_mitre_hunt(self):
        """Execute hunting queries and tag with MITRE ATT&CK TTPs."""
        logger.info("threat_hunt_started")
        
        # Example 1: Hunt for suspicious PowerShell executions spanning 7 days (T1059.001)
        try:
            query = """
                SELECT src_ip, count(*) as cnt
                FROM events
                WHERE message ILIKE '%powershell.exe%' AND message ILIKE '%-EncodedCommand%'
                AND timestamp >= now() - INTERVAL 7 DAY
                GROUP BY src_ip
                HAVING cnt > 5
            """
            results = await self.ch.client.fetch(query)
            
            for row in results:
                src_ip = row.get("src_ip")
                cnt = row.get("cnt")
                # Create a simulated 'Finding' or 'Event' for this hunt
                finding_id = f"HUNT-{uuid.uuid4().hex[:8]}"
                logger.warning("threat_hunt_positive", ip=src_ip, count=cnt, tactic="T1059.001", finding_id=finding_id)
                
                # We save a verdict/finding record directly for the analyst queue
                verdict = AnalystVerdict(
                    id=str(uuid.uuid4()),
                    tenant_id="default",
                    event_id=finding_id,
                    analyst_id="system-hunter",
                    decision="approve", # Auto-approve high-confidence hunts
                    comment=f"Automated Hunt Match: T1059.001 PowerShell. Encoded executions: {cnt}. hunting_origin=True",
                    created_at=datetime.utcnow()
                )
                await self.pg.save_verdict(verdict)
                
        except Exception as e:
            logger.error("threat_hunt_failed", error=str(e))
        
        logger.info("threat_hunt_completed")


from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.threat_intel import scheduled_intel_sync
from app.services.compliance_digest import run_compliance_digest_job

hunter_scheduler = AsyncIOScheduler()

async def scheduled_hunt_job():
    """APScheduler Job to invoke the ThreatHuntingAgent."""
    ch = get_app_clickhouse()
    qdrant = get_app_qdrant()
    pg = get_app_postgres()
    
    agent = ThreatHuntingAgent(ch, qdrant, pg)
    await agent.run_mitre_hunt()

def start_hunter_scheduler():
    """Start the APScheduler for threat hunting."""
    # Run every 6 hours for proactive hunting
    hunter_scheduler.add_job(scheduled_hunt_job, 'interval', hours=6, id='mitre_hunt_job', replace_existing=True)
    
    # Run every 1 hour for external threat intel syncing
    hunter_scheduler.add_job(scheduled_intel_sync, 'interval', hours=1, id='intel_sync_job', replace_existing=True)
    
    # Run every day at 8:00 AM for compliance reporting
    hunter_scheduler.add_job(run_compliance_digest_job, 'cron', hour=8, minute=0, id='daily_compliance_digest', replace_existing=True)
    
    hunter_scheduler.start()
    logger.info("hunter_scheduler_started")
