import csv
import io
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.middleware.auth import require_analyst, AuditLogger
from app.repositories.clickhouse import ClickHouseRepository
from app.repositories.postgres import PostgresRepository, ReportMetadata
from app.dependencies import get_app_postgres

router = APIRouter(prefix="/reports", tags=["Reporting"])

@router.get("/csv")
async def generate_csv_report(
    limit: int = 100,
    request: Request = None,
    claims: dict = Depends(require_analyst),
):
    """Generate a CSV report of recent security events. Requires analyst role."""
    AuditLogger.log("report_csv_generated", request=request, claims=claims, detail=f"limit={limit}")
    ch = ClickHouseRepository()
    try:
        events = await ch.get_recent_events(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "Event ID", "Source Type", "Severity", 
        "Action", "Meta Score", "Message"
    ])
    
    for ev in events:
        writer.writerow([
            ev.timestamp.isoformat() if hasattr(ev, 'timestamp') and ev.timestamp else "",
            ev.event_id,
            ev.source_type,
            ev.severity.value if ev.severity else "",
            ev.action,
            ev.ml_scores.meta_score if ev.ml_scores and ev.ml_scores.meta_score else 0.0,
            ev.message
        ])
    
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="security_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    }
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)


@router.get("/pdf")
async def generate_pdf_report(
    limit: int = 50,
    request: Request = None,
    claims: dict = Depends(require_analyst),
):
    """Generate a PDF report of high-severity events. Requires analyst role."""
    AuditLogger.log("report_pdf_generated", request=request, claims=claims, detail=f"limit={limit}")

    ch = ClickHouseRepository()
    try:
        # For an executive report, we want to fetch events and display the top severe ones
        events = await ch.get_recent_events(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # Generate PDF in memory
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    subtitle_style = styles['Heading2']
    normal_style = styles['Normal']

    story = []
    
    # Title
    story.append(Paragraph("Sentinel Fabric V2 - Executive Security Report", title_style))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Paragraph(f"Total Evaluated Events: {len(events)}", normal_style))
    story.append(Spacer(1, 24))

    # Top Severe Events section
    story.append(Paragraph("Top Severe Events", subtitle_style))
    story.append(Spacer(1, 12))

    # Filter events to severe/critical and sort by meta score descending
    severe_events = [ev for ev in events if ev.severity and ev.severity.value in ("critical", "high")]
    severe_events.sort(key=lambda x: x.ml_scores.meta_score if x.ml_scores and x.ml_scores.meta_score else 0.0, reverse=True)
    
    if not severe_events:
        story.append(Paragraph("No critical or high severity events found in the requested timespan.", normal_style))
    else:
        # Create table data
        data = [["Timestamp", "Message", "Severity", "Score", "Action"]]
        for idx, ev in enumerate(severe_events[:20]):  # Limit to top 20 for the PDF
            ts = ev.timestamp.strftime("%m/%d %H:%M") if hasattr(ev, 'timestamp') and ev.timestamp else "N/A"
            msg = (ev.message[:50] + '...') if len(ev.message) > 50 else ev.message
            score = f"{ev.ml_scores.meta_score:.2f}" if ev.ml_scores and ev.ml_scores.meta_score else "0.00"
            severity = ev.severity.value.upper() if ev.severity else "UNKNOWN"
            action = ev.action.upper() if ev.action else "UNKNOWN"
            data.append([ts, msg, severity, score, action])

        # Style the table
        t = Table(data, colWidths=[80, 200, 60, 50, 70])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ]))
        story.append(t)

    # Build PDF
    doc.build(story)
    
    # Save metadata to postgres asynchronously (since reportlab is synchronous)
    try:
        repo = get_app_postgres()
        tenant_id = claims.get("tenant_id", "default")
        user_id = claims.get("sub", "system")
        
        pdf_bytes = buffer.getvalue()
        file_size = len(pdf_bytes)
        
        import uuid
        meta = ReportMetadata(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            report_name=f"executive_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
            report_type="executive_pdf",
            generated_by=user_id,
            file_size_bytes=file_size
        )
        await repo.save_report_metadata(meta)
    except Exception as save_err:
        AuditLogger.log("report_metadata_failed", request=request, claims=claims, detail=f"error={save_err}")
    
    buffer.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="executive_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
    }
    return StreamingResponse(iter([buffer.getvalue()]), media_type="application/pdf", headers=headers)

