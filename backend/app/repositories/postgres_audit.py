"""Collaboration audit methods injected into PostgresRepository.

Extracted into a separate file for cohesion — imported and mixed in
at the bottom of postgres.py so the main repo stays thin.

Provides:
  - save_incident_annotation  — persist a note/tag/crdt-delta
  - save_incident_tag         — convenience wrapper for tag annotations
  - get_incident_annotations  — fetch full annotation history for an incident
  - get_incident_timeline     — ordered list of tags + notes for display
"""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Dict, Any

from sqlalchemy import select

if TYPE_CHECKING:
    pass   # avoid circular: PostgresRepository imported dynamically


class CollaborationAuditMixin:
    """Annotation persistence methods."""

    async def save_incident_annotation(
        self,
        incident_id: str,
        user_id: str,
        content: str,
        annotation_type: str = "note",
    ) -> None:
        """Persist a free-text analyst note or CRDT delta to the DB."""
        from app.repositories.postgres import IncidentAnnotation
        record = IncidentAnnotation(
            incident_id=incident_id,
            user_id=user_id,
            content=content,
            annotation_type=annotation_type,
        )
        async with self._session() as session:
            session.add(record)
            await session.commit()

    async def save_incident_tag(
        self,
        incident_id: str,
        user_id: str,
        tag: str,
    ) -> None:
        """Persist a tag (label) applied to an incident by an analyst."""
        await self.save_incident_annotation(
            incident_id=incident_id,
            user_id=user_id,
            content=tag,
            annotation_type="tag",
        )

    async def get_incident_annotations(
        self,
        incident_id: str,
        limit: int = 200,
        annotation_type: str | None = None,
    ) -> List[Dict[str, Any]]:
        """Return annotation history for an incident, newest first."""
        from app.repositories.postgres import IncidentAnnotation
        async with self._session() as session:
            q = (
                select(IncidentAnnotation)
                .where(IncidentAnnotation.incident_id == incident_id)
                .order_by(IncidentAnnotation.created_at.desc())
                .limit(limit)
            )
            if annotation_type:
                q = q.where(IncidentAnnotation.annotation_type == annotation_type)
            result = await session.execute(q)
            rows = result.scalars().all()
            return [
                {
                    "id": r.id,
                    "incident_id": r.incident_id,
                    "user_id": r.user_id,
                    "content": r.content,
                    "annotation_type": r.annotation_type,
                    "created_at": r.created_at.isoformat() if isinstance(r.created_at, datetime) else str(r.created_at),
                }
                for r in rows
            ]

    async def get_incident_timeline(self, incident_id: str) -> List[Dict[str, Any]]:
        """Merged, time-sorted view of notes + tags for the timeline panel."""
        return await self.get_incident_annotations(incident_id=incident_id, limit=500)
