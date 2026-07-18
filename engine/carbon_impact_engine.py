# carbon_impact_engine.py

from typing import Any

from mock_datas import (
    company_profile,
    carbon_factors,
)

from waste_prediction_engine import (
    generate_waste_predictions,
)


DEFAULT_AVOIDABLE_WASTE_RATE = 0.80


def validate_rate(
    value: Any,
    field_name: str,
) -> float:
    """
    Validate a decimal rate between 0 and 1.
    """

    try:
        rate = float(value)

    except (TypeError, ValueError):
        raise ValueError(
            f"{field_name} must be a valid number."
        )

    if rate < 0 or rate > 1:
        raise ValueError(
            f"{field_name} must be between 0 and 1."
        )

    return rate


def calculate_item_carbon_impact(
    waste_prediction: dict[str, Any],
    avoidable_waste_rate: float = (
        DEFAULT_AVOIDABLE_WASTE_RATE
    ),
) -> dict[str, Any]:
    """
    Calculate carbon impact and potential carbon
    reduction for one menu item.
    """

    avoidable_waste_rate = validate_rate(
        avoidable_waste_rate,
        "avoidable_waste_rate",
    )

    predicted_waste_kg = float(
        waste_prediction.get(
            "predicted_waste_kg",
            0,
        )
    )

    carbon_factor = float(
        waste_prediction.get(
            "carbon_factor_kg_co2e_per_kg",
            carbon_factors.get(
                "food_waste",
                2.5,
            ),
        )
    )

    existing_carbon_impact = (
        waste_prediction.get(
            "estimated_carbon_impact_kg_co2e"
        )
    )

    if existing_carbon_impact is None:
        carbon_impact = (
            predicted_waste_kg
            * carbon_factor
        )

    else:
        carbon_impact = float(
            existing_carbon_impact
        )

    avoidable_waste_kg = (
        predicted_waste_kg
        * avoidable_waste_rate
    )

    estimated_carbon_reduction = (
        carbon_impact
        * avoidable_waste_rate
    )

    remaining_carbon_impact = max(
        carbon_impact
        - estimated_carbon_reduction,
        0,
    )

    return {
        "menu_item": waste_prediction.get(
            "menu_item",
            "Unknown",
        ),

        "category": waste_prediction.get(
            "category",
            "Uncategorized",
        ),

        "waste_risk_status": (
            waste_prediction.get(
                "waste_risk_status",
                "Unknown",
            )
        ),

        "predicted_waste_kg": round(
            predicted_waste_kg,
            2,
        ),

        "carbon_factor_kg_co2e_per_kg": round(
            carbon_factor,
            2,
        ),

        "estimated_carbon_impact_kg_co2e": round(
            carbon_impact,
            2,
        ),

        "avoidable_waste_rate_percent": round(
            avoidable_waste_rate * 100,
            2,
        ),

        "avoidable_waste_kg": round(
            avoidable_waste_kg,
            2,
        ),

        "estimated_carbon_reduction_kg_co2e": round(
            estimated_carbon_reduction,
            2,
        ),

        "remaining_carbon_impact_kg_co2e": round(
            remaining_carbon_impact,
            2,
        ),
    }


def calculate_carbon_impact_from_predictions(
    waste_prediction_result: dict[str, Any],
    avoidable_waste_rate: float = (
        DEFAULT_AVOIDABLE_WASTE_RATE
    ),
    operating_days_per_month: int | None = None,
) -> dict[str, Any]:
    """
    Calculate carbon impact and carbon reduction
    across all menu waste predictions.
    """

    avoidable_waste_rate = validate_rate(
        avoidable_waste_rate,
        "avoidable_waste_rate",
    )

    if operating_days_per_month is None:
        operating_days_per_month = int(
            company_profile.get(
                "operating_days_per_month",
                30,
            )
        )

    if operating_days_per_month <= 0:
        raise ValueError(
            "operating_days_per_month must be greater than 0."
        )

    waste_predictions = (
        waste_prediction_result.get(
            "waste_predictions",
            [],
        )
    )

    if not isinstance(
        waste_predictions,
        list,
    ):
        raise ValueError(
            "waste_predictions must be a list."
        )

    item_results = []

    for prediction in waste_predictions:
        result = calculate_item_carbon_impact(
            waste_prediction=prediction,
            avoidable_waste_rate=(
                avoidable_waste_rate
            ),
        )

        item_results.append(result)

    daily_predicted_waste_kg = sum(
        item["predicted_waste_kg"]
        for item in item_results
    )

    daily_carbon_impact = sum(
        item[
            "estimated_carbon_impact_kg_co2e"
        ]
        for item in item_results
    )

    daily_avoidable_waste_kg = sum(
        item["avoidable_waste_kg"]
        for item in item_results
    )

    daily_carbon_reduction = sum(
        item[
            "estimated_carbon_reduction_kg_co2e"
        ]
        for item in item_results
    )

    daily_remaining_carbon = sum(
        item[
            "remaining_carbon_impact_kg_co2e"
        ]
        for item in item_results
    )

    monthly_predicted_waste_kg = (
        daily_predicted_waste_kg
        * operating_days_per_month
    )

    monthly_carbon_impact = (
        daily_carbon_impact
        * operating_days_per_month
    )

    monthly_avoidable_waste_kg = (
        daily_avoidable_waste_kg
        * operating_days_per_month
    )

    monthly_carbon_reduction = (
        daily_carbon_reduction
        * operating_days_per_month
    )

    monthly_remaining_carbon = (
        daily_remaining_carbon
        * operating_days_per_month
    )

    yearly_predicted_waste_kg = (
        monthly_predicted_waste_kg
        * 12
    )

    yearly_carbon_impact = (
        monthly_carbon_impact
        * 12
    )

    yearly_avoidable_waste_kg = (
        monthly_avoidable_waste_kg
        * 12
    )

    yearly_carbon_reduction = (
        monthly_carbon_reduction
        * 12
    )

    yearly_remaining_carbon = (
        monthly_remaining_carbon
        * 12
    )

    return {
        "success": True,

        "calculation_basis": {
            "food_waste_carbon_factor": (
                carbon_factors.get(
                    "food_waste",
                    2.5,
                )
            ),

            "avoidable_waste_rate_percent": round(
                avoidable_waste_rate * 100,
                2,
            ),

            "operating_days_per_month": (
                operating_days_per_month
            ),

            "description": (
                "Carbon impact is calculated from "
                "predicted food waste. Carbon reduction "
                "is the avoidable portion of that impact."
            ),
        },

        "daily_summary": {
            "predicted_waste_kg": round(
                daily_predicted_waste_kg,
                2,
            ),

            "carbon_impact_kg_co2e": round(
                daily_carbon_impact,
                2,
            ),

            "avoidable_waste_kg": round(
                daily_avoidable_waste_kg,
                2,
            ),

            "estimated_carbon_reduction_kg_co2e": round(
                daily_carbon_reduction,
                2,
            ),

            "remaining_carbon_impact_kg_co2e": round(
                daily_remaining_carbon,
                2,
            ),
        },

        "monthly_summary": {
            "predicted_waste_kg": round(
                monthly_predicted_waste_kg,
                2,
            ),

            "carbon_impact_kg_co2e": round(
                monthly_carbon_impact,
                2,
            ),

            "avoidable_waste_kg": round(
                monthly_avoidable_waste_kg,
                2,
            ),

            "estimated_carbon_reduction_kg_co2e": round(
                monthly_carbon_reduction,
                2,
            ),

            "remaining_carbon_impact_kg_co2e": round(
                monthly_remaining_carbon,
                2,
            ),
        },

        "yearly_summary": {
            "predicted_waste_kg": round(
                yearly_predicted_waste_kg,
                2,
            ),

            "carbon_impact_kg_co2e": round(
                yearly_carbon_impact,
                2,
            ),

            "avoidable_waste_kg": round(
                yearly_avoidable_waste_kg,
                2,
            ),

            "estimated_carbon_reduction_kg_co2e": round(
                yearly_carbon_reduction,
                2,
            ),

            "remaining_carbon_impact_kg_co2e": round(
                yearly_remaining_carbon,
                2,
            ),
        },

        "item_carbon_impacts": item_results,
    }


def generate_carbon_impact_report(
    avoidable_waste_rate: float = (
        DEFAULT_AVOIDABLE_WASTE_RATE
    ),
) -> dict[str, Any]:
    """
    Automatically generate waste predictions and
    calculate their carbon impact.
    """

    waste_prediction_result = (
        generate_waste_predictions()
    )

    return calculate_carbon_impact_from_predictions(
        waste_prediction_result=(
            waste_prediction_result
        ),
        avoidable_waste_rate=(
            avoidable_waste_rate
        ),
    )


if __name__ == "__main__":
    report = generate_carbon_impact_report(
        avoidable_waste_rate=0.80
    )

    print(
        "\n===== CARBON IMPACT REPORT =====\n"
    )

    print(
        "Daily summary:"
    )
    print(
        report["daily_summary"]
    )

    print(
        "\nMonthly summary:"
    )
    print(
        report["monthly_summary"]
    )

    print(
        "\nYearly summary:"
    )
    print(
        report["yearly_summary"]
    )

    print(
        "\nItem carbon impacts:"
    )

    for item in report[
        "item_carbon_impacts"
    ]:
        print(item)
