# PART:   Voice XGBoost Training — Optuna + 5-fold CV + export
# ACTOR:  Claude Opus 4.6
# PHASE:  17 — Dataset + Pipeline
# TASK:   Load GeMAPS features → Optuna hyperparameter search → train XGBoost → export
# SCOPE:  IN: features.csv + labels.csv | OUT: best_model.pkl + metrics
#
# Usage:
#   python train_voice_xgb.py --features ./data/voice/features.csv \
#                              --labels ./data/voice/labels.csv \
#                              --output ./models/voice
#
# Requirements:
#   pip install xgboost optuna scikit-learn pandas numpy joblib matplotlib

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


def load_data(
    features_path: str,
    labels_path: str,
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Load features CSV and labels CSV, merge on filename.

    Features CSV: participant_id, sentence_id, filename, feat_0..feat_87
    Labels CSV: filename, burnout(1-5), anxiety(1-5), energy(1-5), stress(1-5)

    Returns
    -------
    tuple
        (X, y, filenames) where X is (N, 88), y is (N, 4).
    """
    feat_df = pd.read_csv(features_path)
    label_df = pd.read_csv(labels_path)

    merged = feat_df.merge(label_df, on="filename", how="inner")

    feature_cols = [c for c in merged.columns if c.startswith("feat_")]
    label_cols = ["burnout", "anxiety", "energy", "stress"]

    # Check all label columns exist
    for col in label_cols:
        if col not in merged.columns:
            print(f"ERROR: Label column '{col}' not found in labels.csv")
            sys.exit(1)

    X = merged[feature_cols].values.astype(np.float32)
    y = merged[label_cols].values.astype(np.float32)
    filenames = merged["filename"].tolist()

    print(f"Loaded {X.shape[0]} samples, {X.shape[1]} features, {y.shape[1]} targets")
    return X, y, filenames


def optuna_objective(trial, X: np.ndarray, y_col: np.ndarray):
    """Optuna objective for one target column.

    5-fold CV with XGBoost regressor, minimize RMSE.
    """
    from sklearn.model_selection import cross_val_score
    import xgboost as xgb

    params = {
        "n_estimators": trial.suggest_int("n_estimators", 50, 500),
        "max_depth": trial.suggest_int("max_depth", 3, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "subsample": trial.suggest_float("subsample", 0.6, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "reg_lambda": trial.suggest_float("reg_lambda", 0.1, 10.0, log=True),
        "reg_alpha": trial.suggest_float("reg_alpha", 0.01, 1.0, log=True),
        "random_state": 42,
    }

    model = xgb.XGBRegressor(**params)
    scores = cross_val_score(
        model, X, y_col,
        cv=5,
        scoring="neg_root_mean_squared_error",
    )
    return -scores.mean()  # Optuna minimizes


def train_single_target(
    X: np.ndarray,
    y_col: np.ndarray,
    target_name: str,
    n_trials: int = 50,
) -> tuple[Any, dict[str, Any]]:
    """Train XGBoost for one target with Optuna hyperparameter search.

    Parameters
    ----------
    X : np.ndarray
        Feature matrix (N, 88).
    y_col : np.ndarray
        Target column (N,).
    target_name : str
        Name of the target (e.g., "burnout").
    n_trials : int
        Number of Optuna trials.

    Returns
    -------
    tuple
        (trained_model, metrics_dict)
    """
    import optuna
    import xgboost as xgb
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

    optuna.logging.set_verbosity(optuna.logging.WARNING)

    print(f"\n--- Training: {target_name} ---")

    # Optuna search
    study = optuna.create_study(direction="minimize")
    study.optimize(
        lambda trial: optuna_objective(trial, X, y_col),
        n_trials=n_trials,
        show_progress_bar=True,
    )

    best_params = study.best_params
    best_params["random_state"] = 42
    print(f"  Best params: {best_params}")

    # Train final model on full data, evaluate with 5-fold CV
    model = xgb.XGBRegressor(**best_params)

    cv_scores = cross_val_score(
        model, X, y_col,
        cv=5,
        scoring="neg_root_mean_squared_error",
    )

    # Final fit on all data
    model.fit(X, y_col)

    # Train/test split for additional metrics
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_col, test_size=0.15, random_state=42,
    )
    model_eval = xgb.XGBRegressor(**best_params)
    model_eval.fit(X_train, y_train)
    y_pred = model_eval.predict(X_test)

    metrics = {
        "target": target_name,
        "cv_rmse_mean": round(float(-cv_scores.mean()), 4),
        "cv_rmse_std": round(float(cv_scores.std()), 4),
        "test_rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        "test_mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
        "test_r2": round(float(r2_score(y_test, y_pred)), 4),
        "best_params": best_params,
        "n_trials": n_trials,
    }

    print(f"  CV RMSE: {metrics['cv_rmse_mean']:.4f} ± {metrics['cv_rmse_std']:.4f}")
    print(f"  Test R²: {metrics['test_r2']:.4f}")

    return model, metrics


def train_all_targets(
    X: np.ndarray,
    y: np.ndarray,
    target_names: list[str],
    output_dir: Path,
    n_trials: int = 50,
) -> None:
    """Train XGBoost for all target columns and export models.

    Parameters
    ----------
    X : np.ndarray
        Feature matrix (N, 88).
    y : np.ndarray
        Target matrix (N, K).
    target_names : list[str]
        Names of target columns.
    output_dir : Path
        Directory to save models and metrics.
    n_trials : int
        Optuna trials per target.
    """
    import joblib

    output_dir.mkdir(parents=True, exist_ok=True)
    all_metrics = []

    for i, name in enumerate(target_names):
        model, metrics = train_single_target(X, y[:, i], name, n_trials)

        # Save model
        model_path = output_dir / f"xgb_{name}.pkl"
        joblib.dump(model, model_path)
        print(f"  Model saved: {model_path}")

        all_metrics.append(metrics)

    # Save combined metrics
    metrics_path = output_dir / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(all_metrics, f, indent=2)
    print(f"\nAll metrics saved: {metrics_path}")


def main():
    parser = argparse.ArgumentParser(description="ARA Voice XGBoost Training")
    parser.add_argument("--features", type=str, required=True, help="Path to features CSV")
    parser.add_argument("--labels", type=str, required=True, help="Path to labels CSV")
    parser.add_argument("--output", type=str, default="./models/voice")
    parser.add_argument("--trials", type=int, default=50, help="Optuna trials per target")
    args = parser.parse_args()

    X, y, filenames = load_data(args.features, args.labels)

    target_names = ["burnout", "anxiety", "energy", "stress"]

    train_all_targets(
        X=X,
        y=y,
        target_names=target_names,
        output_dir=Path(args.output),
        n_trials=args.trials,
    )

    print("\n=== Training Complete ===")


if __name__ == "__main__":
    main()
