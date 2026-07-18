from typing import Any

from mock_datas import company_profile

from waste_prediction_engine import (
    generate_waste_predictions,
)


DEFAULT_AVOIDABLE_WASTE_RATE = 0.80


def validate_percentage_rate(
    value: Any,
    field_name: str,
) -> float:
    """
    Validate a decimal percentage rate.

    Examples:
        0.80 = 80%
        0.50 = 50%
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


def calculate_item_cost_saving(
    waste_prediction: dict[str, Any],
    avoidable_waste_rate: float = (
        DEFAULT_AVOIDABLE_WASTE_RATE
    ),
) -> dict[str, Any]:
    """
    Calculate potential cost savings for one menu item.

    avoidable_waste_rate represents how much of the
    predicted waste can realistically be prevented.

    Example:
        0.80 means 80% of predicted waste is avoidable.
    """

    avoidable_waste_rate = validate_percentage_rate(
        avoidable_waste_rate,
        "avoidable_waste_rate",
    )

    food_cost_loss = float(
        waste_prediction.get(
            "estimated_food_cost_loss_thb",
            0,
        )
    )

    disposal_cost = float(
        waste_prediction.get(
            "estimated_disposal_cost_thb",
            0,
        )
    )

    total_loss = float(
        waste_prediction.get(
            "estimated_total_loss_thb",
            food_cost_loss + disposal_cost,
        )
    )

    predicted_leftover_quantity = float(
        waste_prediction.get(
            "predicted_leftover_quantity",
            0,
        )
    )

    predicted_waste_kg = float(
        waste_prediction.get(
            "predicted_waste_kg",
            0,
        )
    )

    avoidable_leftover_quantity = (
        predicted_leftover_quantity
        * avoidable_waste_rate
    )

    avoidable_waste_kg = (
        predicted_waste_kg
        * avoidable_waste_rate
    )

    estimated_food_cost_saving = (
        food_cost_loss
        * avoidable_waste_rate
    )

    estimated_disposal_cost_saving = (
        disposal_cost
        * avoidable_waste_rate
    )

    estimated_total_cost_saving = (
        total_loss
        * avoidable_waste_rate
    )

    remaining_cost_after_action = max(
        total_loss
        - estimated_total_cost_saving,
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

        "avoidable_waste_rate_percent": round(
            avoidable_waste_rate * 100,
            2,
        ),

        "current_estimated_loss_thb": round(
            total_loss,
            2,
        ),

        "avoidable_leftover_quantity": round(
            avoidable_leftover_quantity,
            2,
        ),

        "avoidable_waste_kg": round(
            avoidable_waste_kg,
            2,
        ),

        "estimated_food_cost_saving_thb": round(
            estimated_food_cost_saving,
            2,
        ),

        "estimated_disposal_cost_saving_thb": round(
            estimated_disposal_cost_saving,
            2,
        ),

        "estimated_total_cost_saving_thb": round(
            estimated_total_cost_saving,
            2,
        ),

        "remaining_cost_after_action_thb": round(
            remaining_cost_after_action,
            2,
        ),
    }


def calculate_cost_savings_from_predictions(
    waste_prediction_result: dict[str, Any],
    avoidable_waste_rate: float = (
        DEFAULT_AVOIDABLE_WASTE_RATE
    ),
    operating_days_per_month: int | None = None,
) -> dict[str, Any]:
    """
    Calculate cost savings for all waste predictions.

    The input should be the output returned by:
        generate_waste_predictions()

    or:
        predict_waste_from_input()
    """

    avoidable_waste_rate = validate_percentage_rate(
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
        item_result = calculate_item_cost_saving(
            waste_prediction=prediction,
            avoidable_waste_rate=(
                avoidable_waste_rate
            ),
        )

        item_results.append(item_result)

    daily_food_cost_saving = sum(
        item[
            "estimated_food_cost_saving_thb"
        ]
        for item in item_results
    )

    daily_disposal_cost_saving = sum(
        item[
            "estimated_disposal_cost_saving_thb"
        ]
        for item in item_results
    )

    daily_total_cost_saving = sum(
        item[
            "estimated_total_cost_saving_thb"
        ]
        for item in item_results
    )

    daily_avoidable_waste_kg = sum(
        item["avoidable_waste_kg"]
        for item in item_results
    )

    monthly_total_cost_saving = (
        daily_total_cost_saving
        * operating_days_per_month
    )

    yearly_total_cost_saving = (
        monthly_total_cost_saving
        * 12
    )

    monthly_food_cost_saving = (
        daily_food_cost_saving
        * operating_days_per_month
    )

    monthly_disposal_cost_saving = (
        daily_disposal_cost_saving
        * operating_days_per_month
    )

    monthly_avoidable_waste_kg = (
        daily_avoidable_waste_kg
        * operating_days_per_month
    )

    yearly_avoidable_waste_kg = (
        monthly_avoidable_waste_kg
        * 12
    )

    return {
        "success": True,

        "calculation_basis": {
            "avoidable_waste_rate_percent": round(
                avoidable_waste_rate * 100,
                2,
            ),

            "operating_days_per_month": (
                operating_days_per_month
            ),

            "description": (
                "Savings are estimated from the "
                "avoidable portion of predicted food "
                "cost loss and disposal cost."
            ),
        },

        "daily_summary": {
            "estimated_food_cost_saving_thb": round(
                daily_food_cost_saving,
                2,
            ),

            "estimated_disposal_cost_saving_thb": round(
                daily_disposal_cost_saving,
                2,
            ),

            "estimated_total_cost_saving_thb": round(
                daily_total_cost_saving,
                2,
            ),

            "avoidable_waste_kg": round(
                daily_avoidable_waste_kg,
                2,
            ),
        },

        "monthly_summary": {
            "estimated_food_cost_saving_thb": round(
                monthly_food_cost_saving,
                2,
            ),

            "estimated_disposal_cost_saving_thb": round(
                monthly_disposal_cost_saving,
                2,
            ),

            "estimated_total_cost_saving_thb": round(
                monthly_total_cost_saving,
                2,
            ),

            "avoidable_waste_kg": round(
                monthly_avoidable_waste_kg,
                2,
            ),
        },

        "yearly_summary": {
            "estimated_total_cost_saving_thb": round(
                yearly_total_cost_saving,
                2,
            ),

            "avoidable_waste_kg": round(
                yearly_avoidable_waste_kg,
                2,
            ),
        },

        "item_cost_savings": item_results,
    }


def generate_cost_saving_report(
    avoidable_waste_rate: float = (
        DEFAULT_AVOIDABLE_WASTE_RATE
    ),
) -> dict[str, Any]:
    """
    Automatically generate waste predictions and
    calculate their potential cost savings.
    """

    waste_prediction_result = (
        generate_waste_predictions()
    )

    return calculate_cost_savings_from_predictions(
        waste_prediction_result=(
            waste_prediction_result
        ),
        avoidable_waste_rate=(
            avoidable_waste_rate
        ),
    )


if __name__ == "__main__":
    report = generate_cost_saving_report(
        avoidable_waste_rate=0.80
    )

    print(
        "\n===== COST SAVING REPORT =====\n"
    )

    print("Daily summary:")

    print(report["daily_summary"])

    print("\nMonthly summary:")

    print(report["monthly_summary"])

    print("\nYearly summary:")

    print(report["yearly_summary"])

    print("\nItem cost savings:")

    for item in report[
        "item_cost_savings"
    ]:
        print(item)
