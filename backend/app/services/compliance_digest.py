"""Scheduled background task for generating Compliance & Executive Digests.

Generates PDF + CSV reports covering events mapped to SOC2/HIPAA/ISO27001
and automatically pushes them to configured generic webhooks or saves metadata to the DB.
"""
from __future__ import annotations

import io
import csv
import json
import httpx
import structlog
from datetime import datetime, timedelta

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from app.repositories.clickhouse import ClickHouseRepository
from app.dependencies import get_app_postgres

logger = structlog.get_logger(__name__)


class ComplianceDigestGenerator:
    """Generates scheduled PDF/CSV compliance digests."""

    def __init__(self, tenant_id: str = "default") -> None:
        self.tenant_id = tenant_id

    async def run_digest(self) -> None:
        """Main entry point called by APScheduler."""
        logger.info("starting_scheduled_compliance_digest", tenant_id=self.tenant_id)

        try:
            # 1. Fetch data from last 24 hours
            ch = ClickHouseRepository()
            events = await ch.get_recent_events(limit=5000)

            # Filter events to those with compliance tags
            compliance_events = [e for e in events if getattr(e, "compliance_tags", [])]

            if not compliance_events:
                logger.info("no_compliance_events_found", tenant_id=self.tenant_id)
                return

            # 2. Generate Files
            pdf_bytes = self._generate_pdf(compliance_events)
            csv_bytes = self._generate_csv(compliance_events)

            # 3. Save Metadata
            await self._save_metadata(pdf_bytes, "pdf")
            await self._save_metadata(csv_bytes, "csv")

            # 4. (Optional) Dispatch Webhook notification
            await self._dispatch_webhook(len(compliance_events))

            logger.info("compliance_digest_completed", events_mapped=len(compliance_events))

        except Exception as e:
            logger.error("compliance_digest_failed", error=str(e))

    def _generate_pdf(self, events: list) -> bytes:
        """Generate PDF digest using ReportLab."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        styles = getSampleStyleSheet()
        
        story = []
        story.append(Paragraph("24-Hour Compliance Exceptions Digest", styles['Heading1']))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", styles['Normal']))
        story.append(Paragraph(f"Tenant: {self.tenant_id}", styles['Normal']))
        story.append(Paragraph(f"Events Flagged: {len(events)}", styles['Normal']))
        story.append(Spacer(1, 24))

        # Sort by meta score
        events.sort(key=lambda x: x.ml_scores.meta_score if x.ml_scores and x.ml_scores.meta_score else 0.0, reverse=True)

        data = [["Timestamp", "Tags", "Severity", "Message"]]
        for e in events[:50]: # Top 50 for PDF
            ts = e.timestamp.strftime("%H:%M") if hasattr(e, 'timestamp') and e.timestamp else "N/A"
            tags = ", ".join(e.compliance_tags)
            msg = (e.message[:40] + '...') if e.message and len(e.message) > 40 else (e.message or "")
            sev = e.severity.value.upper() if e.severity else "INFO"
            data.append([ts, tags, sev, msg])

        t = Table(data, colWidths=[60, 120, 60, 200])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ]))
        story.append(t)
        doc.build(story)
        return buffer.getvalue()

    def _generate_csv(self, events: list) -> bytes:
        """Generate CSV digest."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp", "Event ID", "Source Type", "Severity", "Compliance Tags", "Score", "Message"])
        
        for e in events:
            writer.writerow([
                e.timestamp.isoformat() if hasattr(e, 'timestamp') and e.timestamp else "",
                e.event_id,
                e.source_type,
                e.severity.value if e.severity else "",
                ", ".join(e.compliance_tags),
                e.ml_scores.meta_score if e.ml_scores and e.ml_scores.meta_score else 0.0,
                e.message
            ])
        return output.getvalue().encode('utf-8')

    async def _save_metadata(self, fbytes: bytes, ftype: str) -> None:
        """Save report metadata to Postgres for Retrieval."""
        try:
            repo = get_app_postgres()
            import uuid
            from app.repositories.postgres import ReportMetadata
            
            meta = ReportMetadata(
                id=str(uuid.uuid4()),
                tenant_id=self.tenant_id,
                report_name=f"scheduled_compliance_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{ftype}",
                report_type=f"scheduled_{ftype}",
                generated_by="system_scheduler",
                file_size_bytes=len(fbytes)
            )
            await repo.save_report_metadata(meta)
        except Exception as e:
            logger.warning("save_digest_metadata_failed", error=str(e), format=ftype)

    async def _dispatch_webhook(self, event_count: int) -> None:
        """Optional: notify generic webhook that a digest was created."""
        try:
            from app.dependencies import get_app_redis
            redis = get_app_redis()
            
            # Reusing the existing alert config store
            raw = None
            if hasattr(redis, "get"):
                raw = await redis.get(f"alert_config:{self.tenant_id}")
            elif hasattr(redis, "_redis") and redis._redis:
                raw = await redis._redis.get(f"alert_config:{self.tenant_id}")
                
            if not raw:
                return
                
            config = json.loads(raw)
            webhook_url = config.get("generic_webhook_url") or config.get("slack_webhook_url")
            
            if webhook_url:
                payload = {"text": f"Compliance Digest Generated: {event_count} flagged events mapped to SOC2/HIPAA/ISO27001."}
                async with httpx.AsyncClient() as client:
                    await client.post(webhook_url, json=payload, timeout=5.0)
                    
        except Exception as e:
            logger.warning("digest_webhook_failed", error=str(e))


async def run_compliance_digest_job() -> None:
    """Wrapper function to be registered with APScheduler."""
    try:
        generator = ComplianceDigestGenerator(tenant_id="default")
        await generator.run_digest()
    except Exception as e:
        logger.error("compliance_scheduler_wrapper_failed", error=str(e))
