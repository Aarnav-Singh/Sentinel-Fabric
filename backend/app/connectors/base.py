"""Abstract connector parser interface.

Every vendor parser (suricata.py, zeek.py, etc.) implements this
interface. The Kafka consumer calls ``parse()`` on the correct
parser based on the topic name.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.canonical_event import CanonicalEvent


class BaseParser(ABC):
    """Contract that every connector parser must fulfill."""

    @property
    @abstractmethod
    def source_type(self) -> str:
        """Canonical name for this source, e.g. 'suricata'."""
        ...

    @abstractmethod
    def parse(self, raw_log: str) -> CanonicalEvent:
        """Convert a single raw log line/blob into a CanonicalEvent.

        Raises ``ValueError`` if the log cannot be parsed — the caller
        must route the raw log to the dead letter queue.
        """
        ...
