# waste_prediction_engine.py

import pandas as pd

from insight_menu_forecast import generate_menu_demand_forecast

from mock_datas import (
    menu_sales,
    utility_rates,
    carbon_factors,
    industry_benchmarks,
)


# Temporary prototype serving weights.
# Later, these should come from Supabase or the restaurant's menu data.
DEFAULT_SERVING_WEIGHTS = {
    "Breakfast Buffet": 0.45,
    "Fried Rice": 0.35,
    "Caesar Salad": 0.25,
    "Chicken Steak": 0.40,
}


def validate_number(value, field_name):
    """
    Convert a value into a positive number.
    """

    try:
        value = float(value)

    except (TypeError, ValueError):
        raise ValueError(
            f"{field_name} must be a valid number."
        )

    if value < 0:
        raise ValueError(
            f"{field_name} cannot be negative."
        )

    return value


def get_waste_risk_status(waste_percent):
    """
    Compare predicted waste against the benchmarks
    from mock_datas.py.
    """

    good_percent = industry_benchmarks[
        "good_food_waste_percent"
    ]

    average_percent = industry_benchmarks[
        "average_food_waste_percent"
    ]

    if waste_percent <= good_percent:
        return "Low Waste Risk"

    if waste_percent <= average_percent:
        return "Medium Waste Risk"

    return "High Waste Risk"


def generate_waste_recommendation(
    waste_risk_status,
    predicted_leftover_quantity,
    ai_forecast,
):
    """
    Return a readable action for the frontend.
    """

    forecast_quantity = round(ai_forecast)
    leftover_quantity = round(
        predicted_leftover_quantity
    )

    if waste_risk_status == "High Waste Risk":
        return (
            f"Prepare approximately {forecast_quantity} portions "
            f"initially. This may prevent around "
            f"{leftover_quantity} leftover portions."
        )

    if waste_risk_status == "Medium Waste Risk":
        return (
            f"Prepare approximately {forecast_quantity} portions "
            f"first and keep ingredients ready if demand increases."
        )

    return (
        "The current preparation quantity has a low predicted "
        "waste risk. Continue recording actual sales and leftovers."
    )


def predict_single_item_waste(item):
    """
    Predict waste for one menu item.

    Required fields:
        menu_item
        prepared_quantity
        ai_forecast

    Optional fields:
        category
        serving_weight_kg
        food_cost_per_portion
        selling_price_per_portion
        disposal_cost_per_kg
        carbon_factor
    """

    if not isinstance(item, dict):
        raise ValueError(
            "Each menu item must be an object."
        )

    required_fields = [
        "menu_item",
        "prepared_quantity",
        "ai_forecast",
    ]

    missing_fields = [
        field
        for field in required_fields
        if field not in item
    ]

    if missing_fields:
        raise ValueError(
            "Missing fields: "
            + ", ".join(missing_fields)
        )

    menu_item = str(
        item["menu_item"]
    ).strip()

    if not menu_item:
        raise ValueError(
            "menu_item cannot be empty."
        )

    prepared_quantity = validate_number(
        item["prepared_quantity"],
        "prepared_quantity",
    )

    ai_forecast = validate_number(
        item["ai_forecast"],
        "ai_forecast",
    )

    serving_weight_kg = validate_number(
        item.get(
            "serving_weight_kg",
            DEFAULT_SERVING_WEIGHTS.get(
                menu_item,
                0.35,
            ),
        ),
        "serving_weight_kg",
    )

    food_cost_per_portion = validate_number(
        item.get(
            "food_cost_per_portion",
            0,
        ),
        "food_cost_per_portion",
    )

    selling_price_per_portion = validate_number(
        item.get(
            "selling_price_per_portion",
            0,
        ),
        "selling_price_per_portion",
    )

    disposal_cost_per_kg = validate_number(
        item.get(
            "disposal_cost_per_kg",
            utility_rates[
                "food_waste_disposal_per_kg"
            ],
        ),
        "disposal_cost_per_kg",
    )

    carbon_factor = validate_number(
        item.get(
            "carbon_factor",
            carbon_factors["food_waste"],
        ),
        "carbon_factor",
    )

    # Forecast cannot sell more than what was prepared
    # when calculating leftover quantities.
    expected_sold_quantity = min(
        ai_forecast,
        prepared_quantity,
    )

    predicted_leftover_quantity = max(
        prepared_quantity
        - expected_sold_quantity,
        0,
    )

    predicted_waste_kg = (
        predicted_leftover_quantity
        * serving_weight_kg
    )

    if prepared_quantity > 0:
        predicted_waste_percent = (
            predicted_leftover_quantity
            / prepared_quantity
            * 100
        )

    else:
        predicted_waste_percent = 0

    demand_shortage_quantity = max(
        ai_forecast
        - prepared_quantity,
        0,
    )

    estimated_food_cost_loss = (
        predicted_leftover_quantity
        * food_cost_per_portion
    )

    estimated_sales_value_loss = (
        predicted_leftover_quantity
        * selling_price_per_portion
    )

    estimated_disposal_cost = (
        predicted_waste_kg
        * disposal_cost_per_kg
    )

    estimated_total_loss = (
        estimated_food_cost_loss
        + estimated_disposal_cost
    )

    estimated_carbon_impact = (
        predicted_waste_kg
        * carbon_factor
    )

    waste_risk_status = (
        get_waste_risk_status(
            predicted_waste_percent
        )
    )

    recommendation = (
        generate_waste_recommendation(
            waste_risk_status,
            predicted_leftover_quantity,
            ai_forecast,
        )
    )

    return {
        "menu_item": menu_item,
        "category": item.get(
            "category",
            "Uncategorized",
        ),

        "prepared_quantity": round(
            prepared_quantity,
            2,
        ),

        "ai_forecast": round(
            ai_forecast,
            2,
        ),

        "expected_sold_quantity": round(
            expected_sold_quantity,
            2,
        ),

        "predicted_leftover_quantity": round(
            predicted_leftover_quantity,
            2,
        ),

        "predicted_waste_kg": round(
            predicted_waste_kg,
            2,
        ),

        "predicted_waste_percent": round(
            predicted_waste_percent,
            2,
        ),

        "demand_shortage_quantity": round(
            demand_shortage_quantity,
            2,
        ),

        "waste_risk_status": (
            waste_risk_status
        ),

        "estimated_food_cost_loss_thb": round(
            estimated_food_cost_loss,
            2,
        ),

        "estimated_sales_value_loss_thb": round(
            estimated_sales_value_loss,
            2,
        ),

        "estimated_disposal_cost_thb": round(
            estimated_disposal_cost,
            2,
        ),

        "estimated_total_loss_thb": round(
            estimated_total_loss,
            2,
        ),

        "estimated_carbon_impact_kg_co2e": round(
            estimated_carbon_impact,
            2,
        ),

        "serving_weight_kg": round(
            serving_weight_kg,
            3,
        ),

        "recommendation": recommendation,
    }


def predict_waste_from_input(items):
    """
    Use data received from the frontend or Supabase.
    """

    if not isinstance(items, list):
        raise ValueError(
            "items must be a list."
        )

    if len(items) == 0:
        raise ValueError(
            "items cannot be empty."
        )

    results = []
    errors = []

    for index, item in enumerate(items):
        try:
            result = predict_single_item_waste(
                item
            )

            results.append(result)

        except ValueError as error:
            errors.append({
                "index": index,
                "menu_item": (
                    item.get(
                        "menu_item",
                        "Unknown",
                    )
                    if isinstance(item, dict)
                    else "Unknown"
                ),
                "error": str(error),
            })

    total_prepared = sum(
        item["prepared_quantity"]
        for item in results
    )

    total_forecast = sum(
        item["ai_forecast"]
        for item in results
    )

    total_leftover = sum(
        item["predicted_leftover_quantity"]
        for item in results
    )

    total_waste_kg = sum(
        item["predicted_waste_kg"]
        for item in results
    )

    total_food_cost_loss = sum(
        item["estimated_food_cost_loss_thb"]
        for item in results
    )

    total_disposal_cost = sum(
        item["estimated_disposal_cost_thb"]
        for item in results
    )

    total_loss = sum(
        item["estimated_total_loss_thb"]
        for item in results
    )

    total_carbon_impact = sum(
        item[
            "estimated_carbon_impact_kg_co2e"
        ]
        for item in results
    )

    if total_prepared > 0:
        overall_waste_percent = (
            total_leftover
            / total_prepared
            * 100
        )

    else:
        overall_waste_percent = 0

    overall_waste_risk = (
        get_waste_risk_status(
            overall_waste_percent
        )
    )

    return {
        "success": len(errors) == 0,

        "summary": {
            "total_items_received": len(
                items
            ),

            "total_items_predicted": len(
                results
            ),

            "total_items_failed": len(
                errors
            ),

            "total_prepared_quantity": round(
                total_prepared,
                2,
            ),

            "total_ai_forecast": round(
                total_forecast,
                2,
            ),

            "total_predicted_leftover_quantity": round(
                total_leftover,
                2,
            ),

            "total_predicted_waste_kg": round(
                total_waste_kg,
                2,
            ),

            "overall_waste_percent": round(
                overall_waste_percent,
                2,
            ),

            "overall_waste_risk": (
                overall_waste_risk
            ),

            "total_food_cost_loss_thb": round(
                total_food_cost_loss,
                2,
            ),

            "total_disposal_cost_thb": round(
                total_disposal_cost,
                2,
            ),

            "total_estimated_loss_thb": round(
                total_loss,
                2,
            ),

            "total_carbon_impact_kg_co2e": round(
                total_carbon_impact,
                2,
            ),
        },

        "waste_predictions": results,
        "errors": errors,
    }


def generate_waste_predictions():
    """
    Automatically use the output from
    insight_menu_forecast.py and the current mock data.

    This function is used by GET API routes.
    """

    forecast_df = (
        generate_menu_demand_forecast()
    )

    mock_menu_lookup = {
        item["menu"]: item
        for item in menu_sales
    }

    input_items = []

    for _, forecast_row in (
        forecast_df.iterrows()
    ):
        menu_item = forecast_row[
            "menu_item"
        ]

        menu_data = mock_menu_lookup.get(
            menu_item,
            {},
        )

        input_items.append({
            "menu_item": menu_item,

            "category": forecast_row.get(
                "category",
                menu_data.get(
                    "category",
                    "Uncategorized",
                ),
            ),

            "prepared_quantity": (
                menu_data.get(
                    "prepared_qty",
                    forecast_row[
                        "ai_forecast"
                    ],
                )
            ),

            "ai_forecast": forecast_row[
                "ai_forecast"
            ],

            "serving_weight_kg": (
                DEFAULT_SERVING_WEIGHTS.get(
                    menu_item,
                    0.35,
                )
            ),

            "food_cost_per_portion": (
                menu_data.get(
                    "food_cost",
                    0,
                )
            ),

            "selling_price_per_portion": (
                menu_data.get(
                    "selling_price",
                    0,
                )
            ),

            "disposal_cost_per_kg": (
                utility_rates[
                    "food_waste_disposal_per_kg"
                ]
            ),

            "carbon_factor": (
                carbon_factors[
                    "food_waste"
                ]
            ),
        })

    return predict_waste_from_input(
        input_items
    )


if __name__ == "__main__":
    result = generate_waste_predictions()

    print(
        "\n===== WASTE PREDICTION SUMMARY =====\n"
    )

    print(result["summary"])

    print(
        "\n===== MENU WASTE PREDICTIONS =====\n"
    )

    print(
        pd.DataFrame(
            result["waste_predictions"]
        ).to_string(index=False)
    )

    if result["errors"]:
        print(
            "\n===== ERRORS =====\n"
        )

        print(result["errors"])
