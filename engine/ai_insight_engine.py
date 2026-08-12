import pandas as pd

from insight_menu_forecast import (
    generate_menu_demand_forecast,
)

from insight_sustainability_forecast import (
    generate_sustainability_forecast,
)

from insight_anomaly_detection import (
    detect_unusual_patterns,
)

from waste_prediction_engine import (
    generate_waste_predictions,
)


def generate_ai_insights():
    menu_forecast = (
        generate_menu_demand_forecast()
    )

    waste_predictions = (
        generate_waste_predictions()
    )

    sustainability_forecast = (
        generate_sustainability_forecast()
    )

    anomalies = (
        detect_unusual_patterns()
    )

    return {
        "menu_demand_forecast": (
            menu_forecast.to_dict(
                orient="records"
            )
        ),

        "waste_prediction": (
            waste_predictions
        ),

        "sustainability_forecast": (
            sustainability_forecast
        ),

        "unusual_patterns": anomalies,
    }


if __name__ == "__main__":
    insights = generate_ai_insights()

    print(
        "\n===== MENU DEMAND FORECAST =====\n"
    )

    print(
        pd.DataFrame(
            insights[
                "menu_demand_forecast"
            ]
        ).to_string(index=False)
    )

    print(
        "\n===== WASTE PREDICTION =====\n"
    )

    print(
        pd.DataFrame(
            insights[
                "waste_prediction"
            ][
                "waste_predictions"
            ]
        ).to_string(index=False)
    )

    print(
        "\n===== SUSTAINABILITY FORECAST =====\n"
    )

    print(
        insights[
            "sustainability_forecast"
        ]
    )

    print(
        "\n===== UNUSUAL PATTERNS =====\n"
    )

    for item in insights[
        "unusual_patterns"
    ]:
        print(item)