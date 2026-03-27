#!/usr/bin/env python3
"""CIC-IDS-2017/2018 Feature Extractor — Phase 34D.

Maps raw CIC-IDS CSV columns directly to Sentinel Fabric's 76-dimensional
feature space. Handles data cleaning, column normalization, and produces
evaluation-ready numpy arrays.

Usage:
    # Extract features from a single CSV file
    python cic_ids_feature_extractor.py --input Friday-WorkingHours.csv --output extracted.npz

    # Extract and run evaluate_real_traffic.py in one step
    python cic_ids_feature_extractor.py --input *.csv --evaluate

    # Merge multiple day CSVs (CIC-IDS-2017 ships as per-day files)
    python cic_ids_feature_extractor.py --merge-dir /path/to/cicids/ --output merged.csv
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import structlog

# Ensure app package is accessible
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logger = structlog.get_logger(__name__)

MODELS_DIR = PROJECT_ROOT / "models"
DATA_DIR = PROJECT_ROOT / "data" / "training"
RESULTS_DIR = PROJECT_ROOT / "models"

# ─────────────────────── Column Name Normalization ──────────────────────────
# CIC-IDS-2017 CSVs have inconsistent column naming across day files.
# Some have leading spaces, different casing, or em-dash vs hyphen.

COLUMN_ALIASES = {
    # Normalize to canonical names used in CIC_FEATURE_MAP
    " source port": "Source Port",
    "source port": "Source Port",
    "src port": "Source Port",
    " destination port": "Destination Port",
    "destination port": "Destination Port",
    "dst port": "Destination Port",
    " total fwd packets": "Total Fwd Packets",
    "total fwd packets": "Total Fwd Packets",
    " total backward packets": "Total Backward Packets",
    "total backward packets": "Total Backward Packets",
    "total bwd packets": "Total Backward Packets",
    " total length of fwd packets": "Total Length of Fwd Packets",
    "total length of fwd packets": "Total Length of Fwd Packets",
    " total length of bwd packets": "Total Length of Bwd Packets",
    "total length of bwd packets": "Total Length of Bwd Packets",
    " flow duration": "Flow Duration",
    "flow duration": "Flow Duration",
    " flow bytes/s": "Flow Bytes/s",
    "flow bytes/s": "Flow Bytes/s",
    " flow packets/s": "Flow Packets/s",
    "flow packets/s": "Flow Packets/s",
    " fwd iat mean": "Fwd IAT Mean",
    "fwd iat mean": "Fwd IAT Mean",
    " flow iat mean": "Flow IAT Mean",
    "flow iat mean": "Flow IAT Mean",
    " flow iat std": "Flow IAT Std",
    "flow iat std": "Flow IAT Std",
    " flow iat max": "Flow IAT Max",
    "flow iat max": "Flow IAT Max",
    " flow iat min": "Flow IAT Min",
    "flow iat min": "Flow IAT Min",
    " fwd header length": "Fwd Header Length",
    "fwd header length": "Fwd Header Length",
    " bwd header length": "Bwd Header Length",
    "bwd header length": "Bwd Header Length",
    " average packet size": "Average Packet Size",
    "average packet size": "Average Packet Size",
    " label": "Label",
    "label": "Label",
}

# CIC-IDS-2017 attack labels → Sentinel Fabric attack classes
CIC_LABEL_MAP = {
    "BENIGN": "benign",
    "Bot": "botnet",
    "DDoS": "ddos",
    "DoS GoldenEye": "dos",
    "DoS Hulk": "dos",
    "DoS Slowhttptest": "dos",
    "DoS slowloris": "dos",
    "FTP-Patator": "brute_force",
    "SSH-Patator": "brute_force",
    "Heartbleed": "exploits",
    "Infiltration": "infiltration",
    "PortScan": "port_scan",
    "Web Attack – Brute Force": "web_attack",
    "Web Attack – Sql Injection": "sql_injection",
    "Web Attack – XSS": "web_attack",
    "Web Attack \\x96 Brute Force": "web_attack",
    "Web Attack \\x96 Sql Injection": "sql_injection",
    "Web Attack \\x96 XSS": "web_attack",
    # CIC-IDS-2018 additions
    "Brute Force -Web": "web_attack",
    "Brute Force -XSS": "web_attack",
    "SQL Injection": "sql_injection",
    "DDOS attack-HOIC": "ddos",
    "DDOS attack-LOIC-UDP": "ddos",
    "DDoS attacks-LOIC-HTTP": "ddos",
    "DoS attacks-Hulk": "dos",
    "DoS attacks-SlowHTTPTest": "dos",
    "DoS attacks-Slowloris": "dos",
    "DoS attacks-GoldenEye": "dos",
    "FTP-BruteForce": "brute_force",
    "SSH-Bruteforce": "brute_force",
    "Infilteration": "infiltration",
}

# Sentinel Fabric attack classes
ATTACK_CLASSES = [
    "benign", "dos", "ddos", "brute_force", "web_attack",
    "infiltration", "botnet", "port_scan", "sql_injection",
    "fuzzers", "backdoors", "exploits", "reconnaissance",
]

# CIC-IDS feature columns → 76-dim Sentinel vector mapping
CIC_FEATURE_MAP = {
    "Source Port": 0,
    "Destination Port": 1,
    "Total Length of Fwd Packets": 2,
    "Total Length of Bwd Packets": 3,
    "Total Fwd Packets": 4,
    "Total Backward Packets": 5,
    "Flow Duration": 6,
    "Flow Bytes/s": 8,
    "Flow Packets/s": 9,
    "Fwd IAT Mean": 23,
    "Flow IAT Mean": 35,
    "Flow IAT Std": 36,
    "Flow IAT Max": 37,
    "Flow IAT Min": 38,
    "Fwd Header Length": 51,
    "Bwd Header Length": 52,
    "Average Packet Size": 53,
}


# ─────────────────────── Core Extraction ────────────────────────────────────


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to canonical form."""
    rename_map = {}
    for col in df.columns:
        lower = col.strip().lower()
        if lower in {k.lower(): k for k in COLUMN_ALIASES}:
            canonical = COLUMN_ALIASES.get(lower, col.strip())
            rename_map[col] = canonical
        elif col.strip() != col:
            rename_map[col] = col.strip()

    if rename_map:
        df = df.rename(columns=rename_map)
    return df


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Clean CIC-IDS data: handle inf, NaN, and type issues."""
    # Replace inf values
    df = df.replace([np.inf, -np.inf], np.nan)

    # Drop rows with all NaN features
    feature_cols = [c for c in CIC_FEATURE_MAP.keys() if c in df.columns]
    df = df.dropna(subset=feature_cols, how="all")

    # Fill remaining NaN with 0
    df[feature_cols] = df[feature_cols].fillna(0)

    # Ensure numeric types
    for col in feature_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    return df


def extract_features(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Extract 76-dim feature vectors and labels from CIC-IDS DataFrame.

    Returns:
        X: np.ndarray of shape (n_samples, 76) — feature vectors
        y: np.ndarray of shape (n_samples,) — integer class labels
        label_names: list of string label names parallel to y
    """
    n = len(df)
    X = np.zeros((n, 76), dtype=np.float32)

    # Map CIC columns to 76-dim positions
    for cic_col, sentinel_idx in CIC_FEATURE_MAP.items():
        if cic_col in df.columns:
            X[:, sentinel_idx] = df[cic_col].values.astype(np.float32)

    # Map labels
    if "Label" in df.columns:
        mapped_labels = df["Label"].map(CIC_LABEL_MAP).fillna("benign")
    else:
        mapped_labels = pd.Series(["benign"] * n)

    label_names = mapped_labels.tolist()
    class_to_idx = {name: idx for idx, name in enumerate(ATTACK_CLASSES)}
    y = np.array([class_to_idx.get(lbl, 0) for lbl in label_names], dtype=np.int32)

    return X, y, label_names


def load_and_extract(csv_path: str | Path) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Load a CSV file and extract features in one step."""
    logger.info("loading_csv", path=str(csv_path))
    df = pd.read_csv(csv_path, low_memory=False, encoding="utf-8", encoding_errors="replace")
    logger.info("raw_shape", rows=len(df), cols=len(df.columns))

    df = normalize_columns(df)
    df = clean_dataframe(df)
    logger.info("cleaned_shape", rows=len(df))

    X, y, labels = extract_features(df)

    # Log class distribution
    unique, counts = np.unique(y, return_counts=True)
    dist = {ATTACK_CLASSES[u]: int(c) for u, c in zip(unique, counts)}
    logger.info("class_distribution", distribution=dist)

    return X, y, labels


def merge_csv_files(csv_dir: str | Path) -> pd.DataFrame:
    """Merge multiple CIC-IDS day CSV files into one DataFrame."""
    csv_dir = Path(csv_dir)
    csv_files = sorted(csv_dir.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {csv_dir}")

    logger.info("merging_csvs", count=len(csv_files))
    frames = []
    for csv_file in csv_files:
        try:
            df = pd.read_csv(csv_file, low_memory=False, encoding="utf-8", encoding_errors="replace")
            df = normalize_columns(df)
            frames.append(df)
            logger.info("loaded", file=csv_file.name, rows=len(df))
        except Exception as exc:
            logger.warning("csv_load_failed", file=csv_file.name, error=str(exc))

    merged = pd.concat(frames, ignore_index=True)
    logger.info("merge_complete", total_rows=len(merged))
    return merged


# ─────────────────────── Evaluation Integration ─────────────────────────────


def run_evaluation(X: np.ndarray, y: np.ndarray) -> dict[str, Any]:
    """Evaluate models against extracted features.

    Loads trained XGBoost/RF models and evaluates on the provided data.
    Returns classification metrics.
    """
    from sklearn.metrics import classification_report, f1_score

    results: dict[str, Any] = {
        "dataset_size": len(X),
        "models_evaluated": [],
    }

    # Try XGBoost
    xgb_path = MODELS_DIR / "ensemble_xgb.json"
    if xgb_path.exists():
        try:
            import xgboost as xgb
            bst = xgb.Booster()
            bst.load_model(str(xgb_path))
            dmat = xgb.DMatrix(X)
            preds = bst.predict(dmat)

            if len(preds.shape) > 1:
                y_pred = preds.argmax(axis=1)
            else:
                y_pred = (preds > 0.5).astype(int)

            f1 = f1_score(y, y_pred, average="weighted", zero_division=0)
            report = classification_report(
                y, y_pred, labels=np.arange(len(ATTACK_CLASSES)), target_names=ATTACK_CLASSES, zero_division=0, output_dict=True
            )
            results["xgboost"] = {"f1_weighted": f1, "report": report}
            results["models_evaluated"].append("xgboost")
            logger.info("xgboost_evaluated", f1=f1)
        except Exception as exc:
            logger.warning("xgboost_eval_failed", error=str(exc))

    # Try RF
    rf_path = MODELS_DIR / "ensemble_rf.pkl"
    if rf_path.exists():
        try:
            import joblib
            rf = joblib.load(rf_path)

            # Match dimensions
            if X.shape[1] != rf.n_features_in_:
                X_eval = X[:, :rf.n_features_in_]
            else:
                X_eval = X

            # Apply scaler if available
            scaler_path = MODELS_DIR / "feature_scaler.pkl"
            if scaler_path.exists():
                scaler = joblib.load(scaler_path)
                X_eval = scaler.transform(X_eval)

            y_pred = rf.predict(X_eval)
            f1 = f1_score(y, y_pred, average="weighted", zero_division=0)
            report = classification_report(
                y, y_pred, labels=np.arange(len(ATTACK_CLASSES)), target_names=ATTACK_CLASSES, zero_division=0, output_dict=True
            )
            results["random_forest"] = {"f1_weighted": f1, "report": report}
            results["models_evaluated"].append("random_forest")
            logger.info("rf_evaluated", f1=f1)
        except Exception as exc:
            logger.warning("rf_eval_failed", error=str(exc))

    # Check exit criteria
    exit_criteria = {
        "sql_injection": 0.55,
        "infiltration": 0.55,
        "exploits": 0.50,
        "ddos": 0.60,
    }

    criteria_results = {}
    for class_name, threshold in exit_criteria.items():
        best_f1 = 0.0
        for model_key in ["xgboost", "random_forest"]:
            if model_key in results:
                report = results[model_key].get("report", {})
                class_metrics = report.get(class_name, {})
                f1 = class_metrics.get("f1-score", 0.0)
                best_f1 = max(best_f1, f1)
        criteria_results[class_name] = {
            "threshold": threshold,
            "best_f1": best_f1,
            "passed": best_f1 >= threshold,
        }

    results["exit_criteria"] = criteria_results
    results["all_criteria_passed"] = all(c["passed"] for c in criteria_results.values())

    return results


# ─────────────────────── CLI ────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Extract features from CIC-IDS-2017/2018 CSVs for Sentinel Fabric ML evaluation"
    )
    parser.add_argument("--input", "-i", help="Input CSV file or glob pattern")
    parser.add_argument("--merge-dir", help="Directory of CSV files to merge")
    parser.add_argument("--output", "-o", help="Output file (.npz for features, .csv for merged)")
    parser.add_argument("--evaluate", action="store_true", help="Run model evaluation after extraction")
    parser.add_argument("--sample", type=int, help="Random sample N rows (for quick testing)")
    parser.add_argument("--results-file", default=str(RESULTS_DIR / "real_traffic_results.json"),
                        help="Path for evaluation results JSON")

    args = parser.parse_args()

    if args.merge_dir:
        # Merge mode
        merged = merge_csv_files(args.merge_dir)
        merged = clean_dataframe(merged)
        output = args.output or str(DATA_DIR / "cicids2017_combined.csv")
        merged.to_csv(output, index=False)
        logger.info("merged_csv_saved", path=output, rows=len(merged))
        return

    if not args.input:
        parser.print_help()
        sys.exit(1)

    # Support glob patterns
    if "*" in args.input:
        files = sorted(glob.glob(args.input))
    else:
        files = [args.input]

    all_X, all_y, all_labels = [], [], []
    for f in files:
        if not os.path.exists(f):
            logger.warning("file_not_found", path=f)
            continue
        X, y, labels = load_and_extract(f)
        all_X.append(X)
        all_y.append(y)
        all_labels.extend(labels)

    if not all_X:
        logger.error("no_data_extracted")
        sys.exit(1)

    X = np.concatenate(all_X, axis=0)
    y = np.concatenate(all_y, axis=0)

    if args.sample and args.sample < len(X):
        rng = np.random.RandomState(42)
        idx = rng.choice(len(X), args.sample, replace=False)
        X, y = X[idx], y[idx]
        all_labels = [all_labels[i] for i in idx]
        logger.info("sampled", n=args.sample)

    logger.info("extraction_complete", samples=len(X), features=X.shape[1])

    # Save features
    if args.output:
        if args.output.endswith(".npz"):
            np.savez_compressed(args.output, X=X, y=y)
        elif args.output.endswith(".csv"):
            df_out = pd.DataFrame(X, columns=[f"f{i}" for i in range(76)])
            df_out["label"] = all_labels
            df_out.to_csv(args.output, index=False)
        logger.info("features_saved", path=args.output)

    # Evaluate
    if args.evaluate:
        logger.info("starting_evaluation")
        start = time.perf_counter()
        results = run_evaluation(X, y)
        elapsed = time.perf_counter() - start

        results["extraction_time_seconds"] = round(elapsed, 2)
        results["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # Save results
        results_path = args.results_file
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2, default=str)

        logger.info("evaluation_complete",
                     models=results["models_evaluated"],
                     all_criteria_passed=results["all_criteria_passed"],
                     results_file=results_path)

        # Print summary
        print("\n" + "=" * 60)
        print("CIC-IDS Real Traffic Evaluation Results")
        print("=" * 60)
        print(f"Dataset size: {results['dataset_size']:,}")
        print(f"Models evaluated: {', '.join(results['models_evaluated'])}")
        print()

        for model_key in ["xgboost", "random_forest"]:
            if model_key in results:
                print(f"  {model_key}: F1={results[model_key]['f1_weighted']:.4f}")

        print("\nExit Criteria:")
        for cls, info in results.get("exit_criteria", {}).items():
            status = "PASS" if info["passed"] else "FAIL"
            print(f"  {cls}: F1={info['best_f1']:.4f} (threshold={info['threshold']}) {status}")

        print(f"\nOverall: {'ALL PASSED' if results['all_criteria_passed'] else 'SOME FAILED'}")
        print(f"Time: {elapsed:.1f}s")


if __name__ == "__main__":
    main()
