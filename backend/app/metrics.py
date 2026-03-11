from prometheus_client import Counter, Histogram, Gauge

# Histogram for measuring the latency of each of the 15 pipeline steps
PIPELINE_STEP_DURATION = Histogram(
    "pipeline_step_duration_seconds",
    "Latency of each pipeline step",
    ["step_name"]
)

# Counter for tracking the total number of events processed
EVENTS_PROCESSED = Counter(
    "events_processed_total",
    "Total number of events processed",
    ["tenant_id", "event_format"]
)

# Gauges for tracking ML anomaly scores
VAE_ANOMALY_SCORE = Gauge(
    "vae_anomaly_score_current",
    "Latest VAE anomaly score seen by the pipeline"
)

TEMPORAL_ANOMALY_SCORE = Gauge(
    "temporal_anomaly_score_current",
    "Latest Temporal anomaly score seen by the pipeline"
)

META_SCORE = Gauge(
    "meta_score_current",
    "Latest Meta score calculated by the pipeline"
)
