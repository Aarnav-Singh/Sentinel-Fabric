# Sentinel Fabric V2 — Project History & Reference Guide

## 1. Project Mission & Architecture

**Sentinel Fabric V2** is an enterprise-grade Security Posture Intelligence (SPI) platform. It provides real-time visibility and automated triage for large-scale security telemetry by orchestrating a 15-step intelligence pipeline.

### Core Architecture Components

| Component | Technology | Role |
|---|---|---|
| **API Backend** | FastAPI | High-performance async REST & SSE services. |
| **Logic Orchestration** | LangGraph | Agentic RAG flow control. |
| **Analytic Store** | ClickHouse | Columnar storage for millions of security events. |
| **Hot Cache** | Redis | Real-time entity state, campaign correlation, and rate limiting. |
| **Relational Store** | PostgreSQL | Multi-tenant users, RBAC, Findings, and Audit logs. |
| **Vector Engine** | Qdrant | Semantic search for IOCs and behavioral DNA. |
| **Stream Processing** | Kafka | Decoupled log ingestion and DLQ management. |
| **LLM Engine** | llama.cpp | Local OpenAI-compatible API for generating security narratives. |
| **Frontend UI** | Next.js | Modern dashboard with Dribbble-style cybersecurity aesthetics. |

---

## 2. The 15-Step Logic Pipeline

The heart of the application is the `PipelineService` (`backend/app/services/pipeline.py`), which processes every incoming event through these steps:

1. **Feature Extraction**: Calculates 76-dimensional behavioral features + temporal delta.
2. **Behavioral DNA**: Upserts vector to Qdrant for identity similarity tracking.
3. **ML Scoring (Concurrent)**:
    - **Ensemble**: XGBoost/LightGBM for known attack patterns.
    - **VAE**: Variational Autoencoder for deep anomaly detection.
    - **HST**: Half-Space Trees for streaming data drift detection.
    - **Temporal**: LSTM/RNN for sequence-based risk assessment.
4. **Scoring Sync**:
    - **Adversarial**: Detects LLM-fingerprint patterns and timing attacks.
    - **Meta-Learner**: Fuses all scores into a single `meta_score` [0-1].
5. **Sigma Matching**: Real-time YAML rule matching against the event payload.
6. **IOC Enrichment**: Cross-references OTX/Threat-Intel feeds.
7. **Campaign Correlation**: Groups events by entity/tactic in Redis.
8. **Entity State Update**: Atomic Redis state updates for real-time profiling.
9. **Risk Recalculation**: Adjusts asset criticality based on historical context.
10. **Agentic RAG**: LangGraph orchestrator retrieves graph paths and similar past notes.
11. **Narrative Generation**: llama.cpp (primary) or Claude/OpenAI generates a human summary.
12. **Recommendation Engine**: Generates SOC-analyst advice (Isolate/Block/Watch).
13. **Alert Dispatch**: Triggers Notifications/Webhooks.
14. **Audit Logging**: Structured persistence of the decision trail.
15. **Persistence & Broadcast**: ClickHouse storage + SSE broadcast to the frontend.

---

## 3. Implemented Capabilities (Phases 1-7)

### Security & Hardening (Phase 2 & 4)
- **RBAC Enforcement**: Role-based access (Viewer/Analyst/Admin) on all API routes.
- **Audit Logger**: Permanent record of sensitive actions (Sigma edits, Playbook execution).
- **Hardened Auth**: JWT-secret rotation, self-issued tokens, and CSRF protection.
- **Tenant Isolation**: Strict `tenant_id` filtering in ClickHouse, Postgres, and Qdrant.

### Advanced Intelligence (Phase 3 & 7)
- **Agentic RAG**: A LangGraph workflow that chooses between Native RAG (text search) and Graph RAG (PostgreSQL recursive CTEs) based on event complexity.
- **Local LLM**: Full transition from Ollama to **llama.cpp** for low-latency, privacy-preserving narrative generation.
- **Semantic IOCs**: Qdrant-based similarity lookup for malicious indicators.

### UI & UX Redesign (Phase 6)
- **SOC Dashboard**: KPI cards, live telemetry pings, and animated threat timelines.
- **Command Center**: Glassmorphic UI with cyan (`#06b6d4`) and red (`#ef4444`) accents.
- **Dynamic Investigations**: Fully wired Findings and Incident detail views with real backend data.

---

## 4. Operational Context (For AI Models)

### Critical File Map
- `backend/app/main.py`: Final API assembly and middleware wiring.
- `backend/app/config.py`: Single source of truth for ENV variables.
- `backend/app/engine/agentic_rag.py`: The LangGraph state machine.
- `backend/app/engine/narrative.py`: Multi-tier LLM fallback logic.
- `backend/app/services/pipeline.py`: The 15-step deterministic operation logic.
- `frontend/src/app/api/proxy/[...path]/route.ts`: Crucial Next.js proxy for backend communication.

### Data Schemas (Reference)
- **CanonicalEvent**: The project's "Gold Schema". Everything (Syslog, CloudTrail, GCP) is normalized into this Pydantic model before the pipeline starts.
- **Finding**: The output of the pipeline. Links an `Event` to an `Incident` and contains the `narrative` and `meta_score`.
- **PlaybookTemplate**: Postgres-backed SOAR definitions using JSONB for step-logic.

### Decision Engine Weighting
The `MetaLearner` (`backend/app/ml/meta_learner.py`) fuses scores using the following default architectural weights:
- **VAE Anomaly**: 35% (Focus on structural data deviations)
- **Temporal Patterns**: 25% (Focus on frequency and sequence)
- **Adversarial Signals**: 20% (Focus on LLM/timing manipulation)
- **Sigma/IOC Overrides**: Mandatory 1.0 score if a critical Sigma rule hits.

---

## 5. Phase 8 & 9: Functional Depth & Quality

### Functional Depth (Phase 8)
- **Database-Backed SOAR Playbooks**: Migrated from in-memory stubs to Postgres `PlaybookTemplate` ORMs with 3 pre-defined automated response templates (`isolate-endpoint`, `block-ip`, `quarantine-user`).
- **Advanced Action Simulations**: Built out mocked external integrations (`httpx`) for CrowdStrike, Palo Alto, and Okta within `ActionRegistry`.
- **PDF Reporting Engine**: Implemented a fully functional PDF exporter via `ReportLab` mapping Top Severe Events from ClickHouse to customized visual grids.
- **Production Log Parsers**: Replaced ingestion stubs for AWS CloudTrail, GCP Audit, and Syslog RFC3164 with strict `Pydantic` `BaseModel` variants with schema validation capabilities.
- **Frontend Sync**: Verified direct SWR-polling bindings on the "Vault" and "Compliance" dashboard screens against backend endpoints (`/api/v1/posture/`).

### Quality & Optimization (Phase 9)
- **PipelineService Unit Testing**: Engineered comprehensive end-to-end unit tests verifying the exact deterministic flow of a `CanonicalEvent` through all 15 operational steps with strict Mock validation.
- **LangGraph Integration Testing**: Built automated test validation for the `AgenticRagOrchestrator` to ensure high-severity/lateral movement indicators deterministically route to deep `graph_rag` correlation nodes.
- **Strict Narrative Prompts**: Overhauled the `llama.cpp` security narrative `LLMNarrativeEngine` prompts to enforce clinical, actionable bullet points, bypassing overly conversational model predispositions.
- **Synthetic ML Weights**: Upgraded the VAE, Temporal, Adversarial, and meta-learner engines to support real localized loading logic (via `.pth` PyTorch and `.txt` LightGBM binary configurations).

---

## 6. Enterprise Scalability & SOAR (Phases 10-13)

### Observability & Alerting (Phase 10)
- **Prometheus Metrics**: Exported deep latency histograms for the 15-step pipeline and ML gauges.
- **Outbound Webhooks**: Integrated asynchronous alerting for Slack, Discord, and Microsoft Teams.
- **Deep Health Dashboard**: Built frontend/backend polling for ClickHouse, Redis, and Qdrant cluster statuses.

### Interactive SOAR (Phase 11)
- **Playbook Editor**: Created a visual React drag-and-drop editor for incident response playbooks.
- **Manual Approval Gates**: Authored native LangGraph state-pausing mechanism inside the `ActionRegistry` waiting for Analyst verifications (`/api/v1/soar/resume`).
- **Real-Time Execution Tracking**: Pushed Server-Sent Events (SSE) broadcasting to sync playbook nodes live to the frontend.

### Machine Learning Refinement (Phase 12)
- **Offline ML Training**: Developed `train_models.py` for PyTorch VAE and LightGBM model compilation simulating vast network traffic features.
- **Analyst Feedback Loop**: Implemented `/findings/{id}/action` endpoints where analyst True/False Positive verdicts trigger real-time `MetaLearner` weight adjustments.

### Enterprise Scale Architecture (Phase 13)
- **High-Throughput Ingestion**: Transitioned to Kafka broker architecture with a decoupled `worker.py` pipeline consumer.
- **HA Topologies**: Authored production `docker-compose.prod.yml` configuring Zookeeper, ClickHouse (ReplicatedMergeTree), and Redis Sentinel.
- **ABAC PII Masking**: Upgraded the auth middleware to support Attribute-Based Access Control, masking source IPs and usernames based on analyst clearance levels.

---

## 7. Advanced Threat Hunting & Edge Scalability (Phases 14-17)

### Phase 14: Automated Threat Hunting
- **Continuous Agents**: Implemented APScheduler background jobs executing LangGraph agents (`ThreatHuntingAgent`) to proactively query ClickHouse and Qdrant, converting logical hits into `hunting_origin` Findings tagged with MITRE ATT&CK TTPs.
- **Ext. Threat Intel**: Built a native MISP/TAXII IOC asynchronous fetcher (`app.services.threat_intel.py`), persisting intelligence to Redis and ClickHouse on a rolling schedule.

### Phase 15: Compliance Reporting Automation
- **Framework Mapping**: Auto-mapped real-time telemetry and triggered Sigma rules against SOC2, HIPAA, and ISO27001 requirements utilizing the new `ComplianceMapper` inside the pipeline.
- **Scheduled Digests**: Automated PDF/CSV compliance digest generation triggering daily via the `ComplianceDigestGenerator` and pushed through generic alert webhooks.

### Phase 16: Distributed Edge Processing
- **Multi-Region Ingestion**: Deployed lightweight FastAPI instances (`edge_gateway.py`) as edge Kafka producers to validate data locally and publish to remote, region-specific topics.
- **Federated Analytics**: Advanced `clickhouse.py` schemas to utilize `Distributed` ClickHouse engines across multiple data centers, aggregating results without localizing telemetry.

### Phase 17: ChatOps & Collaboration
- **Multiplayer Incident Analysis**: Established `app.api.collaboration.py` projecting WebSockets (`/api/v1/ws/collaborate/{incident_id}`) for tracking live analyst presence and note syncs.
- **Bi-Directional ChatOps Bot**: Engineered Slack/Teams webhook interceptors (`app.api.chatops.py`) decoding interactive Actionable Messages into secure resume signals for the paused manual SOAR engine.

### Phase 17: ChatOps & Collaboration
- **Multiplayer Investigations**: WebSockets for live collaborative pointers/notes on incident pages.
- **Bi-Directional ChatOps**: Approve or reject SOAR actions directly from Microsoft Teams/Slack actionable messages.
