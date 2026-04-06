"""UMBRIX Query Language (UQL) Engine — Phase 3.

UQL is an ML-aware detection query language that understands:
  - ML scores (ml_score > 0.8)
  - MITRE ATT&CK tactics (tactic = "lateral-movement")
  - Multi-event sequences (sequence on source_ip [...] maxspan=15m)
  - Semantic similarity (similar("cobalt strike beacon", threshold=0.85))

Usage::

    from app.engine.uql.compiler import UQLCompiler
    from app.engine.uql.nl_translator import translate_nl_to_uql

    uql = translate_nl_to_uql("find PowerShell after credential access")
    result = UQLCompiler().compile(uql)
    # result.clickhouse_where, result.qdrant_params, result.cep_pattern_id
"""
