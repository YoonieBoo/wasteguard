# esg_score_engine.py

from typing import Any


ENVIRONMENTAL_WEIGHT = 0.50
SOCIAL_WEIGHT = 0.25
GOVERNANCE_WEIGHT = 0.25

WASTE_SCORE_MULTIPLIER = 2.5

REPORTING_WEIGHT = 0.60
RECOMMENDATION_ADHERENCE_WEIGHT = 0.40


def clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 100.0,
) -> float:
    """
    Keep a score between 0 and 100.
    """

    return max(
        minimum,
        min(float(value), maximum),
    )


def validate_non_negative_number(
    value: Any,
    field_name: str,
) -> float:
    """
    Convert input into a non-negative float.
    """

    try:
        number = float(value)

    except (TypeError, ValueError):
        raise ValueError(
            f"{field_name} must be a valid number."
        )

    if number < 0:
        raise ValueError(
            f"{field_name} cannot be negative."
        )

    return number


def safe_rate(
    completed: float,
    total: float,
) -> float:
    """
    Return a rate between 0 and 1.

    Example:
        completed = 1
        total = 6

        result = 0.1667
    """

    completed = validate_non_negative_number(
        completed,
        "completed",
    )

    total = validate_non_negative_number(
        total,
        "total",
    )

    if total <= 0:
        return 0.0

    rate = completed / total

    return max(
        0.0,
        min(rate, 1.0),
    )


def calculate_environmental_score(
    average_waste_percent: float,
) -> float:
    """
    Formula:

        environmental score
        = 100 - average waste percent × 2.5

    The result is clamped between 0 and 100.
    """

    average_waste_percent = (
        validate_non_negative_number(
            average_waste_percent,
            "average_waste_percent",
        )
    )

    environmental_score = (
        100
        - average_waste_percent
        * WASTE_SCORE_MULTIPLIER
    )

    return round(
        clamp(environmental_score),
        2,
    )


def calculate_social_score(
    days_logged: int,
    total_days_in_period: int,
) -> float:
    """
    Formula:

        social score
        = days logged / total days in period × 100
    """

    logging_rate = safe_rate(
        completed=days_logged,
        total=total_days_in_period,
    )

    social_score = logging_rate * 100

    return round(
        clamp(social_score),
        2,
    )


def calculate_governance_score(
    reporting_rate: float,
    recommendation_adherence_rate: float,
) -> float:
    """
    Formula:

        governance score
        = (
            reporting rate × 0.60
            + recommendation adherence × 0.40
          ) × 100

    Both rates must be decimal values between 0 and 1.

    Examples:
        1.00 = 100%
        0.75 = 75%
        0.50 = 50%
    """

    reporting_rate = float(
        reporting_rate
    )

    recommendation_adherence_rate = float(
        recommendation_adherence_rate
    )

    reporting_rate = max(
        0.0,
        min(reporting_rate, 1.0),
    )

    recommendation_adherence_rate = max(
        0.0,
        min(
            recommendation_adherence_rate,
            1.0,
        ),
    )

    governance_score = (
        reporting_rate
        * REPORTING_WEIGHT
        + recommendation_adherence_rate
        * RECOMMENDATION_ADHERENCE_WEIGHT
    ) * 100

    return round(
        clamp(governance_score),
        2,
    )


def calculate_overall_esg_score(
    environmental_score: float,
    social_score: float,
    governance_score: float,
) -> float:
    """
    Formula:

        overall score
        = environmental × 0.50
        + social × 0.25
        + governance × 0.25
    """

    overall_score = (
        environmental_score
        * ENVIRONMENTAL_WEIGHT
        + social_score
        * SOCIAL_WEIGHT
        + governance_score
        * GOVERNANCE_WEIGHT
    )

    return round(
        clamp(overall_score),
        2,
    )


def get_score_status(
    score: float,
) -> str:
    """
    Return a readable status for the dashboard.
    """

    if score >= 85:
        return "Excellent"

    if score >= 70:
        return "Doing well"

    if score >= 55:
        return "Needs improvement"

    return "Action required"


def get_score_trend(
    current_score: float,
    previous_score: float | None,
) -> dict[str, Any]:
    """
    Compare the current score with a previous period.
    """

    if previous_score is None:
        return {
            "change": 0.0,
            "direction": "No comparison",
        }

    difference = (
        current_score
        - float(previous_score)
    )

    if difference > 0:
        direction = "Improved"

    elif difference < 0:
        direction = "Decreased"

    else:
        direction = "No change"

    return {
        "change": round(difference, 2),
        "direction": direction,
    }


def calculate_esg_score(
    average_waste_percent: float,
    days_logged: int,
    total_days_in_period: int,
    reporting_rate: float,
    recommendations_acted_on: int,
    total_recommendations: int,
    previous_overall_score: float | None = None,
) -> dict[str, Any]:
    """
    Calculate the full ESG score result.

    This output is designed for the Waste Guard ESG dashboard.
    """

    recommendation_adherence_rate = safe_rate(
        completed=recommendations_acted_on,
        total=total_recommendations,
    )

    environmental_score = (
        calculate_environmental_score(
            average_waste_percent
        )
    )

    social_score = calculate_social_score(
        days_logged=days_logged,
        total_days_in_period=(
            total_days_in_period
        ),
    )

    governance_score = (
        calculate_governance_score(
            reporting_rate=reporting_rate,
            recommendation_adherence_rate=(
                recommendation_adherence_rate
            ),
        )
    )

    overall_score = (
        calculate_overall_esg_score(
            environmental_score=(
                environmental_score
            ),
            social_score=social_score,
            governance_score=(
                governance_score
            ),
        )
    )

    trend = get_score_trend(
        current_score=overall_score,
        previous_score=previous_overall_score,
    )

    return {
        "success": True,

        "period_data": {
            "average_waste_percent": round(
                float(average_waste_percent),
                2,
            ),

            "days_logged": int(
                days_logged
            ),

            "total_days_in_period": int(
                total_days_in_period
            ),

            "reporting_rate": round(
                float(reporting_rate),
                4,
            ),

            "reporting_rate_percent": round(
                float(reporting_rate) * 100,
                2,
            ),

            "recommendations_acted_on": int(
                recommendations_acted_on
            ),

            "total_recommendations": int(
                total_recommendations
            ),

            "recommendation_adherence_rate": round(
                recommendation_adherence_rate,
                4,
            ),

            "recommendation_adherence_percent": round(
                recommendation_adherence_rate
                * 100,
                2,
            ),
        },

        "scores": {
            "overall_sustainability_score": round(
                overall_score,
                2,
            ),

            "environmental_score": round(
                environmental_score,
                2,
            ),

            "social_score": round(
                social_score,
                2,
            ),

            "governance_score": round(
                governance_score,
                2,
            ),
        },

        "dashboard_cards": {
            "overall": {
                "title": (
                    "Overall Sustainability Score"
                ),

                "score": round(
                    overall_score,
                ),

                "exact_score": round(
                    overall_score,
                    2,
                ),

                "maximum_score": 100,

                "status": get_score_status(
                    overall_score
                ),

                "trend": trend,
            },

            "environmental": {
                "title": "Energy & Waste",

                "score": round(
                    environmental_score
                ),

                "exact_score": round(
                    environmental_score,
                    2,
                ),

                "maximum_score": 100,

                "metric_value": round(
                    float(
                        average_waste_percent
                    ),
                    2,
                ),

                "metric_unit": "%",

                "metric_label": (
                    "Avg Food Waste"
                ),

                "status": get_score_status(
                    environmental_score
                ),
            },

            "social": {
                "title": "Team & Operations",

                "score": round(
                    social_score
                ),

                "exact_score": round(
                    social_score,
                    2,
                ),

                "maximum_score": 100,

                "metric_value": (
                    f"{int(days_logged)}/"
                    f"{int(total_days_in_period)}d"
                ),

                "metric_label": (
                    "Team Reporting"
                ),

                "status": get_score_status(
                    social_score
                ),
            },

            "governance": {
                "title": (
                    "Sustainability Actions"
                ),

                "score": round(
                    governance_score
                ),

                "exact_score": round(
                    governance_score,
                    2,
                ),

                "maximum_score": 100,

                "metric_value": (
                    f"{int(recommendations_acted_on)}/"
                    f"{int(total_recommendations)}"
                ),

                "metric_label": (
                    "AI Rec Adherence"
                ),

                "status": get_score_status(
                    governance_score
                ),
            },
        },

        "score_breakdown": [
            {
                "key": "environmental",
                "label": "Energy & Waste",
                "score": round(
                    environmental_score
                ),
                "exact_score": round(
                    environmental_score,
                    2,
                ),
                "maximum_score": 100,
                "weight_percent": 50,
            },
            {
                "key": "social",
                "label": "Team & Operations",
                "score": round(
                    social_score
                ),
                "exact_score": round(
                    social_score,
                    2,
                ),
                "maximum_score": 100,
                "weight_percent": 25,
            },
            {
                "key": "governance",
                "label": (
                    "Sustainability Actions"
                ),
                "score": round(
                    governance_score
                ),
                "exact_score": round(
                    governance_score,
                    2,
                ),
                "maximum_score": 100,
                "weight_percent": 25,
            },
        ],

        "formula_weights": {
            "environmental_weight_percent": 50,
            "social_weight_percent": 25,
            "governance_weight_percent": 25,
            "reporting_weight_percent": 60,
            "recommendation_adherence_weight_percent": 40,
            "waste_score_multiplier": 2.5,
        },
    }


if __name__ == "__main__":
    result = calculate_esg_score(
        average_waste_percent=9.3,
        days_logged=1,
        total_days_in_period=1,
        reporting_rate=1.0,
        recommendations_acted_on=1,
        total_recommendations=6,
        previous_overall_score=79,
    )

    print(
        "\n===== ESG SCORE RESULT =====\n"
    )

    print(result)
