from __future__ import annotations

import json 
import math 
from dataclasses import asdict, dataclass
from datetime import datetime, timezone 
from pathlib import Path
from typing import Any, Mapping, Optional, Sequence 

import numpy as np 

from sklearn.metrics import (mean_absolute_error, mean_squared_error, r2_score)

# Evaluation result structure 
@dataclass
class RegressionMetrics :

    sample_count: int 

    mae: float
    mse: float 
    rmse: float 

    r2: Optional[float]

    mape_percent: Optional[float]
    wape_percent: Optional[float]
    accuracy_percent: Optional[float]

    mean_actual: float
    mean_predicted: float 

    total_actual: float
    total_predicted: float
    total_error: float

    bias: float

    def to_dict(self) -> dict[str, Any] :
        return asdict(self)
    
# Internal Helper Function 
def safe_round(value: Optional[float], decimal_places: int=4) -> Optional[float] :
    if value is None : 
        return None 
    
    numeric_value = float(value)

    if not math.isfinite(numeric_value) :
        return None 
    
    return round(numeric_value, decimal_places)

def convert_to_numeric_array(values: Any, value_name: str) -> np.ndarray :
    if values is None :
        raise ValueError(f"{value_name} cannot be None.")
    
    try: 
        numeric_array = np.asarray(values, dtype=float).reshape(-1)

    except (TypeError, ValueError) as error:
        raise ValueError(f"{value_name} must contain numerical values.") from error 
    
    if numeric_array.size == 0 :
        raise ValueError(f"{value_name} cannot be empty.")
    
    if np.isnan(numeric_array).any() :
        raise ValueError(f"{value_name} contains missing or NaN values.")
    
    if np.isinf(numeric_array).any() :
        raise ValueError(f"{value_name} contains infinite values. ")
    
    return numeric_array 

# Main Regression evaluation
def evaluate_regression(actual_values: Any, predicted_values:Any, accuracy_method: str = "wape") -> RegressionMetrics :
    
    actual_array = convert_to_numeric_array(actual_values, "actual_values")
    predicted_array = convert_to_numeric_array(predicted_values, "predicted_values")

    if len(actual_array) != len(predicted_array) :
        raise ValueError(
            "actual_values and predicted_values must contain."
            "the same number of values"
            f"Received {len(actual_array)} actual values and"
            f"{len(predicted_array)} predicted values."
        )
    
    absolute_errors = np.abs(actual_array - predicted_array)

    mae = mean_absolute_error(actual_array, predicted_array)
    mse = mean_squared_error(actual_array, predicted_array)
    rmse = math.sqrt(mse)

    # R2 - not be calcualted properly with one value or wehn every actual value is the same.
    if len(actual_array) < 2 or np.all(actual_array == actual_array[0]):
        r2 = None
    else:
        r2 = r2_score(actual_array, predicted_array)

    #MAPE cannot be devided by zero.
    nonzero_mask = actual_array != 0

    if np.any(nonzero_mask) :
        mape = float( np.mean(absolute_errors[nonzero_mask]
        / np.abs(actual_array[nonzero_mask])
        ) * 100
        )

    else :
        mape = None 

    total_absolute_actual = float(
        np.sum(np.abs(actual_array))
    )

    if total_absolute_actual > 0 :
        wape = float(
            np.sum(absolute_errors) /
            total_absolute_actual
            * 100
        )
    
    else : 
        wape = None 

    if accuracy_method.lower() == "wape" :
        selected_error_percentage = wape 

    elif accuracy_method.lower() == "mape" :
        selected_error_percentage = mape 

    else : 
        raise ValueError(
            "accuracy_method must be either 'wape' or 'mape'."
        )
    
    if selected_error_percentage is not None :
        accuracy = 100.0 - selected_error_percentage

        accuracy = max (
            0.0, min(100.0, accuracy)
        )
    
    else : 
        accuracy = None 

    mean_actual = float(np.mean(actual_array))

    mean_predicted = float(np.mean(predicted_array))

    total_actual = float(np.sum(actual_array))

    total_predicted = float(np.sum(predicted_array))

    total_error = (total_predicted - total_actual)

    bias = float(np.mean(predicted_array - actual_array))

    return RegressionMetrics(
        sample_count=len(actual_array),

        mae=safe_round(mae),
        mse=safe_round(mse),
        rmse= safe_round(rmse),

        r2 = safe_round(r2),

        mape_percent=safe_round(mape),
        wape_percent = safe_round(wape),
        accuracy_percent=safe_round(accuracy),

        mean_actual=safe_round(mean_actual),
        mean_predicted = safe_round(mean_predicted),

        total_actual=safe_round(total_actual),
        total_predicted=safe_round(total_predicted),
        total_error=safe_round(total_error),

        bias = safe_round(bias)
    )

# AI Forecasting Engine Evaluation 
def evaluate_forecasting_engine(
        actual_sold_quantity: Any,
        predicted_demand: Any
) -> dict[str, Any] :
    metrics = evaluate_regression(
        actual_values=actual_sold_quantity,
        predicted_values=predicted_demand,
        accuracy_method="wape"
    )

    return {
        "engine": "AI Forecasting Engine",
        "target": "sold_quantity",
        "metrics": metrics.to_dict()
    }

# Optional waste prediction evaluation
def evaluate_waste_prediction_engine(
        actual_waste_kg: Any,
        predicted_waste_kg:Any
) -> dict[str,Any] :
    metrics = evaluate_regression(
        actual_values = actual_waste_kg,
        predicted_values=predicted_waste_kg,
        accuracy_method="wape"
    )

    return {
        "engine": "Waste Prediction Engine",
        "target": "waste_kg",
        "metrics": metrics.to_dict()
    }
    
# Field extraction
def extract_field(
        records: Sequence[Mapping[str, Any]],
        field_name: str
) -> list[Any] :
    extract_values = []

    for index, record in enumerate(records):
        if field_name not in record :
            raise KeyError(
                f"Field '{field_name}' is missing."
                f"from record at index {index}."
            )
        
        extract_values.append(record[field_name])

    return extract_values

def evaluate_engine_records(
    actual_records: Sequence[Mapping[str, Any]],
    predicted_records: Sequence[Mapping[str, Any]],
    actual_field: str,
    predicted_field: str,
    engine_name: str,
    target_name: Optional[str] = None,
) -> dict[str, Any]:
    if len(actual_records) != len(predicted_records):
        raise ValueError(
            "actual_records and predicted_records "
            "must contain the same number of records."
        )

    actual_values = extract_field(
        actual_records,
        actual_field,
    )

    predicted_values = extract_field(
        predicted_records,
        predicted_field,
    )

    metrics = evaluate_regression(
        actual_values=actual_values,
        predicted_values=predicted_values,
    )

    return {
        "engine": engine_name,
        "target": target_name or actual_field,
        "metrics": metrics.to_dict(),
    }

# Evaluate records using matching keys
def evaluate_engine_records_by_key(
    actual_records: Sequence[Mapping[str, Any]],
    predicted_records: Sequence[Mapping[str, Any]],
    key_fields: Sequence[str],
    actual_field: str,
    predicted_field: str,
    engine_name: str,
    target_name: Optional[str] = None,
) -> dict[str, Any]:
    def create_record_key(
        record: Mapping[str, Any],
    ) -> tuple[Any, ...]:

        key_values = []

        for field_name in key_fields:

            if field_name not in record:
                raise KeyError(
                    f"Matching field '{field_name}' "
                    "is missing from a record."
                )

            key_values.append(
                record[field_name]
            )

        return tuple(key_values)

    actual_record_map = {
        create_record_key(record): record
        for record in actual_records
    }

    predicted_record_map = {
        create_record_key(record): record
        for record in predicted_records
    }

    matching_keys = set(
        actual_record_map.keys()
    ).intersection(
        predicted_record_map.keys()
    )

    if not matching_keys:
        raise ValueError(
            "No matching actual and predicted records were found. "
            f"Matching fields: {list(key_fields)}"
        )

    sorted_matching_keys = sorted(
        matching_keys,
        key=lambda key: str(key),
    )

    actual_values = []

    predicted_values = []

    for matching_key in sorted_matching_keys:

        actual_record = actual_record_map[
            matching_key
        ]

        predicted_record = predicted_record_map[
            matching_key
        ]

        if actual_field not in actual_record:
            raise KeyError(
                f"Actual field '{actual_field}' "
                f"is missing for key {matching_key}."
            )

        if predicted_field not in predicted_record:
            raise KeyError(
                f"Predicted field '{predicted_field}' "
                f"is missing for key {matching_key}."
            )

        actual_values.append(
            actual_record[actual_field]
        )

        predicted_values.append(
            predicted_record[predicted_field]
        )

    metrics = evaluate_regression(
        actual_values=actual_values,
        predicted_values=predicted_values,
    )

    actual_without_predictions = (
        len(actual_record_map)
        - len(sorted_matching_keys)
    )

    predictions_without_actuals = (
        len(predicted_record_map)
        - len(sorted_matching_keys)
    )

    return {
        "engine": engine_name,

        "target": (
            target_name
            or actual_field
        ),

        "matching": {
            "key_fields": list(key_fields),

            "matched_records":
                len(sorted_matching_keys),

            "actual_records_without_prediction":
                actual_without_predictions,

            "predictions_without_actual_record":
                predictions_without_actuals,
        },

        "metrics": metrics.to_dict(),
    }

# Create complete evaluation report 
def create_evaluation_report(
    evaluations: Sequence[Mapping[str, Any]],
    model_name: Optional[str] = None,
    model_version: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    return {
        "report_name":
            "Waste Guard Engine Evaluation",

        "generated_at_utc":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "model_name":
            model_name,

        "model_version":
            model_version,

        "notes":
            notes,

        "evaluations":
            list(evaluations),
    }

# Save Evaluation as JSON
def save_evaluation_report(
    report: Mapping[str, Any],
    output_path: str | Path = (
        "reports/"
        "engine_evaluation_report.json"
    ),
) -> Path:
    file_path = Path(output_path)

    file_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with file_path.open(
        mode="w",
        encoding="utf-8",
    ) as json_file:

        json.dump(
            report,
            json_file,
            indent=2,
            ensure_ascii=False,
        )

    return file_path

# Print evaluation summary 
def print_evaluation_summary(
    report: Mapping[str, Any],
) -> None:
    """
    Print evaluation results in the terminal.
    """

    print("\n" + "=" * 65)

    print(
        report.get(
            "report_name",
            "Waste Guard Evaluation",
        )
    )

    print("=" * 65)

    model_name = report.get(
        "model_name"
    )

    model_version = report.get(
        "model_version"
    )

    if model_name:
        print(
            f"Model: {model_name}"
        )

    if model_version:
        print(
            f"Version: {model_version}"
        )

    for evaluation in report.get(
        "evaluations",
        [],
    ):

        engine_name = evaluation.get(
            "engine",
            "Unknown Engine",
        )

        metrics = evaluation.get(
            "metrics",
            {},
        )

        print("\n" + "-" * 65)

        print(engine_name)

        print("-" * 65)

        print(
            f"Samples: "
            f"{metrics.get('sample_count')}"
        )

        print(
            f"Accuracy: "
            f"{metrics.get('accuracy_percent')}%"
        )

        print(
            f"MAE: "
            f"{metrics.get('mae')}"
        )

        print(
            f"MSE: "
            f"{metrics.get('mse')}"
        )

        print(
            f"RMSE: "
            f"{metrics.get('rmse')}"
        )

        print(
            f"R²: "
            f"{metrics.get('r2')}"
        )

        print(
            f"MAPE: "
            f"{metrics.get('mape_percent')}%"
        )

        print(
            f"WAPE: "
            f"{metrics.get('wape_percent')}%"
        )

        print(
            f"Bias: "
            f"{metrics.get('bias')}"
        )

        print(
            f"Total actual: "
            f"{metrics.get('total_actual')}"
        )

        print(
            f"Total predicted: "
            f"{metrics.get('total_predicted')}"
        )

        print(
            f"Total error: "
            f"{metrics.get('total_error')}"
        )

    print("\n" + "=" * 65)