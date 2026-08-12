from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Literal

from analytics_engine import AnalyticsEngine
from ai_insight_engine import generate_ai_insights
from recommendation_engine import generate_final_recommendations
from waste_prediction_engine import generate_waste_predictions
from cost_saving_engine import calculate_cost_savings_from_predictions
from carbon_impact_engine import calculate_carbon_impact_from_predictions
from esg_score_calculation import calculate_esg_score


ReportPeriod = Literal[
    "day",
    "week",
    "month",
    "year",
]

VALID_PERIODS = {
    "day",
    "week",
    "month",
    "year",
}

DEFAULT_AVOIDABLE_WASTE_RATE = 0.80


def validate_period(period: str) -> ReportPeriod:
    """
    Validate the report period.
    """

    normalized = str(period).strip().lower()

    if normalized not in VALID_PERIODS:
        raise ValueError(
            "period must be day, week, month, or year."
        )

    return normalized  # type: ignore[return-value]


def validate_rate(
    value: Any,
    field_name: str,
) -> float:
    """
    Validate a rate between 0 and 1.
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


def parse_reference_date(
    reference_date: str | None,
) -> date:
    """
    Parse YYYY-MM-DD or use today's date.
    """

    if reference_date is None:
        return date.today()

    try:
        return datetime.strptime(
            reference_date,
            "%Y-%m-%d",
        ).date()

    except ValueError:
        raise ValueError(
            "reference_date must use YYYY-MM-DD format."
        )


def get_period_dates(
    period: ReportPeriod,
    reference_date: date,
) -> dict[str, str]:
    """
    Calculate the selected period's date range.
    """

    if period == "day":
        start_date = reference_date
        end_date = reference_date

    elif period == "week":
        start_date = (
            reference_date
            - timedelta(
                days=reference_date.weekday()
            )
        )

        end_date = (
            start_date
            + timedelta(days=6)
        )

    elif period == "month":
        start_date = reference_date.replace(
            day=1
        )

        if reference_date.month == 12:
            next_month = date(
                reference_date.year + 1,
                1,
                1,
            )

        else:
            next_month = date(
                reference_date.year,
                reference_date.month + 1,
                1,
            )

        end_date = (
            next_month
            - timedelta(days=1)
        )

    else:
        start_date = date(
            reference_date.year,
            1,
            1,
        )

        end_date = date(
            reference_date.year,
            12,
            31,
        )

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }


def get_prototype_multiplier(
    period: ReportPeriod,
) -> int:
    """
    Temporary mock-data scaling.

    Replace this when real historical records are stored
    in Supabase.
    """

    return {
        "day": 1,
        "week": 7,
        "month": 30,
        "year": 365,
    }[period]


def scale_number(
    value: Any,
    multiplier: float,
) -> float:
    """
    Multiply and round a numeric value.
    """

    try:
        number = float(value)

    except (TypeError, ValueError):
        number = 0.0

    return round(
        number * multiplier,
        2,
    )


def calculate_adherence_percent(
    acted_on: int,
    total: int,
) -> float:
    """
    Recommendation adherence percentage.
    """

    if total <= 0:
        return 0.0

    percentage = (
        acted_on
        / total
        * 100
    )

    return round(
        max(
            0.0,
            min(percentage, 100.0),
        ),
        2,
    )


def get_period_cost_summary(
    cost_report: dict[str, Any],
    period: ReportPeriod,
) -> dict[str, float]:
    """
    Select the correct cost-saving period.
    """

    if period == "day":
        source = cost_report.get(
            "daily_summary",
            {},
        )

        multiplier = 1

    elif period == "week":
        source = cost_report.get(
            "daily_summary",
            {},
        )

        multiplier = 7

    elif period == "month":
        source = cost_report.get(
            "monthly_summary",
            {},
        )

        multiplier = 1

    else:
        source = cost_report.get(
            "yearly_summary",
            {},
        )

        multiplier = 1

    return {
        "estimated_food_cost_saving_thb": scale_number(
            source.get(
                "estimated_food_cost_saving_thb",
                0,
            ),
            multiplier,
        ),

        "estimated_disposal_cost_saving_thb": scale_number(
            source.get(
                "estimated_disposal_cost_saving_thb",
                0,
            ),
            multiplier,
        ),

        "estimated_total_cost_saving_thb": scale_number(
            source.get(
                "estimated_total_cost_saving_thb",
                0,
            ),
            multiplier,
        ),

        "avoidable_waste_kg": scale_number(
            source.get(
                "avoidable_waste_kg",
                0,
            ),
            multiplier,
        ),
    }


def get_period_carbon_summary(
    carbon_report: dict[str, Any],
    period: ReportPeriod,
) -> dict[str, float]:
    """
    Select the correct carbon-impact period.
    """

    if period == "day":
        source = carbon_report.get(
            "daily_summary",
            {},
        )

        multiplier = 1

    elif period == "week":
        source = carbon_report.get(
            "daily_summary",
            {},
        )

        multiplier = 7

    elif period == "month":
        source = carbon_report.get(
            "monthly_summary",
            {},
        )

        multiplier = 1

    else:
        source = carbon_report.get(
            "yearly_summary",
            {},
        )

        multiplier = 1

    return {
        "predicted_waste_kg": scale_number(
            source.get(
                "predicted_waste_kg",
                0,
            ),
            multiplier,
        ),

        "carbon_impact_kg_co2e": scale_number(
            source.get(
                "carbon_impact_kg_co2e",
                0,
            ),
            multiplier,
        ),

        "avoidable_waste_kg": scale_number(
            source.get(
                "avoidable_waste_kg",
                0,
            ),
            multiplier,
        ),

        "estimated_carbon_reduction_kg_co2e": scale_number(
            source.get(
                "estimated_carbon_reduction_kg_co2e",
                0,
            ),
            multiplier,
        ),

        "remaining_carbon_impact_kg_co2e": scale_number(
            source.get(
                "remaining_carbon_impact_kg_co2e",
                0,
            ),
            multiplier,
        ),
    }


def build_accepted_recommendations(
    cost_report: dict[str, Any],
    carbon_report: dict[str, Any],
    accepted_menu_items: list[str],
    period: ReportPeriod,
) -> list[dict[str, Any]]:
    """
    Combine accepted recommendations with their
    projected financial and environmental benefits.
    """

    accepted_names = {
        str(name).strip().lower()
        for name in accepted_menu_items
    }

    multiplier = get_prototype_multiplier(
        period
    )

    carbon_lookup = {
        str(
            item.get(
                "menu_item",
                "Unknown",
            )
        ): item
        for item in carbon_report.get(
            "item_carbon_impacts",
            [],
        )
    }

    results = []

    for item in cost_report.get(
        "item_cost_savings",
        [],
    ):
        menu_item = str(
            item.get(
                "menu_item",
                "Unknown",
            )
        )

        if (
            menu_item.strip().lower()
            not in accepted_names
        ):
            continue

        carbon_item = carbon_lookup.get(
            menu_item,
            {},
        )

        results.append({
            "menu_item": menu_item,

            "category": item.get(
                "category",
                "Uncategorized",
            ),

            "status": "Accepted",

            "waste_risk_status": item.get(
                "waste_risk_status",
                "Unknown",
            ),

            "action": (
                f"Adjust {menu_item} preparation "
                f"closer to forecasted demand."
            ),

            "projected_cost_saving_thb": scale_number(
                item.get(
                    "estimated_total_cost_saving_thb",
                    0,
                ),
                multiplier,
            ),

            "projected_food_cost_saving_thb": scale_number(
                item.get(
                    "estimated_food_cost_saving_thb",
                    0,
                ),
                multiplier,
            ),

            "projected_disposal_cost_saving_thb": scale_number(
                item.get(
                    "estimated_disposal_cost_saving_thb",
                    0,
                ),
                multiplier,
            ),

            "projected_waste_reduction_kg": scale_number(
                item.get(
                    "avoidable_waste_kg",
                    0,
                ),
                multiplier,
            ),

            "projected_carbon_reduction_kg_co2e": scale_number(
                carbon_item.get(
                    "estimated_carbon_reduction_kg_co2e",
                    0,
                ),
                multiplier,
            ),
        })

    return results


def create_performance_history(
    period: ReportPeriod,
    total_cost_saving: float,
    total_waste_reduction: float,
    total_carbon_reduction: float,
) -> list[dict[str, Any]]:
    """
    Create temporary chart points.

    This is only for mock data. Real chart data should be
    aggregated from Supabase records for each date.
    """

    if period == "day":
        labels = ["Today"]

    elif period == "week":
        labels = [
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
        ]

    elif period == "month":
        labels = [
            "Week 1",
            "Week 2",
            "Week 3",
            "Week 4",
        ]

    else:
        labels = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]

    count = len(labels)

    return [
        {
            "label": label,

            "cost_saving_thb": round(
                total_cost_saving / count,
                2,
            ),

            "waste_reduction_kg": round(
                total_waste_reduction / count,
                2,
            ),

            "carbon_reduction_kg_co2e": round(
                total_carbon_reduction / count,
                2,
            ),
        }
        for label in labels
    ]


def generate_savings_report(
    period: str = "month",
    reference_date: str | None = None,
    avoidable_waste_rate: float = (
        DEFAULT_AVOIDABLE_WASTE_RATE
    ),
    accepted_menu_items: list[str] | None = None,
    total_recommendations: int | None = None,
    days_logged: int = 1,
    total_days_in_period: int = 1,
    reporting_rate: float = 1.0,
    previous_overall_esg_score: float | None = None,
) -> dict[str, Any]:
    """
    Generate one complete Waste Guard report.

    This function combines:
    - analytics
    - AI forecasting and anomaly insights
    - waste prediction
    - cost saving
    - carbon impact
    - ESG score
    - recommendations
    """

    normalized_period = validate_period(
        period
    )

    report_date = parse_reference_date(
        reference_date
    )

    avoidable_waste_rate = validate_rate(
        avoidable_waste_rate,
        "avoidable_waste_rate",
    )

    if accepted_menu_items is None:
        accepted_menu_items = []

    analytics_report = (
        AnalyticsEngine().generate_report()
    )

    ai_insights = generate_ai_insights()

    waste_prediction_result = (
        generate_waste_predictions()
    )

    cost_report = (
        calculate_cost_savings_from_predictions(
            waste_prediction_result=(
                waste_prediction_result
            ),
            avoidable_waste_rate=(
                avoidable_waste_rate
            ),
        )
    )

    carbon_report = (
        calculate_carbon_impact_from_predictions(
            waste_prediction_result=(
                waste_prediction_result
            ),
            avoidable_waste_rate=(
                avoidable_waste_rate
            ),
        )
    )

    recommendations = (
        generate_final_recommendations()
    )

    food_recommendations = (
        recommendations.get(
            "food_preparation_recommendations",
            [],
        )
    )

    sustainability_recommendations = (
        recommendations.get(
            "sustainability_recommendations",
            [],
        )
    )

    anomaly_recommendations = (
        recommendations.get(
            "anomaly_recommendations",
            [],
        )
    )

    if total_recommendations is None:
        total_recommendations = (
            len(food_recommendations)
            + len(sustainability_recommendations)
            + len(anomaly_recommendations)
        )

    accepted_count = len(
        accepted_menu_items
    )

    adherence_percent = (
        calculate_adherence_percent(
            acted_on=accepted_count,
            total=total_recommendations,
        )
    )

    adherence_rate = (
        adherence_percent / 100
    )

    waste_summary = (
        waste_prediction_result.get(
            "summary",
            {},
        )
    )

    average_waste_percent = float(
        waste_summary.get(
            "overall_waste_percent",
            0,
        )
    )

    esg_report = calculate_esg_score(
        average_waste_percent=(
            average_waste_percent
        ),

        days_logged=days_logged,

        total_days_in_period=(
            total_days_in_period
        ),

        reporting_rate=reporting_rate,

        recommendations_acted_on=(
            accepted_count
        ),

        total_recommendations=(
            total_recommendations
        ),

        previous_overall_score=(
            previous_overall_esg_score
        ),
    )

    period_cost = get_period_cost_summary(
        cost_report=cost_report,
        period=normalized_period,
    )

    period_carbon = (
        get_period_carbon_summary(
            carbon_report=carbon_report,
            period=normalized_period,
        )
    )

    accepted_recommendations = (
        build_accepted_recommendations(
            cost_report=cost_report,
            carbon_report=carbon_report,
            accepted_menu_items=(
                accepted_menu_items
            ),
            period=normalized_period,
        )
    )

    date_range = get_period_dates(
        period=normalized_period,
        reference_date=report_date,
    )

    summary = {
        "estimated_food_cost_saving_thb": (
            period_cost[
                "estimated_food_cost_saving_thb"
            ]
        ),

        "estimated_disposal_cost_saving_thb": (
            period_cost[
                "estimated_disposal_cost_saving_thb"
            ]
        ),

        "estimated_total_cost_saving_thb": (
            period_cost[
                "estimated_total_cost_saving_thb"
            ]
        ),

        "estimated_waste_reduction_kg": (
            period_cost[
                "avoidable_waste_kg"
            ]
        ),

        "predicted_waste_kg": (
            period_carbon[
                "predicted_waste_kg"
            ]
        ),

        "carbon_impact_before_action_kg_co2e": (
            period_carbon[
                "carbon_impact_kg_co2e"
            ]
        ),

        "estimated_carbon_reduction_kg_co2e": (
            period_carbon[
                "estimated_carbon_reduction_kg_co2e"
            ]
        ),

        "remaining_carbon_impact_kg_co2e": (
            period_carbon[
                "remaining_carbon_impact_kg_co2e"
            ]
        ),

        "recommendations_acted_on": (
            accepted_count
        ),

        "total_recommendations": (
            total_recommendations
        ),

        "recommendation_adherence_percent": (
            adherence_percent
        ),

        "recommendation_adherence_rate": (
            round(
                adherence_rate,
                4,
            )
        ),

        "overall_esg_score": (
            esg_report.get(
                "scores",
                {},
            ).get(
                "overall_sustainability_score",
                0,
            )
        ),

        "environmental_score": (
            esg_report.get(
                "scores",
                {},
            ).get(
                "environmental_score",
                0,
            )
        ),

        "social_score": (
            esg_report.get(
                "scores",
                {},
            ).get(
                "social_score",
                0,
            )
        ),

        "governance_score": (
            esg_report.get(
                "scores",
                {},
            ).get(
                "governance_score",
                0,
            )
        ),
    }

    return {
        "success": True,

        "report_type": (
            "wasteguard_savings_and_sustainability_report"
        ),

        "period": normalized_period,

        "period_label": (
            normalized_period.capitalize()
        ),

        "date_range": date_range,

        "calculation_mode": (
            "prototype_scaled_estimate"
        ),

        "summary": summary,

        "company": analytics_report.get(
            "company",
            {},
        ),

        "analytics": analytics_report,

        "ai_insights": ai_insights,

        "menu_demand_forecast": (
            ai_insights.get(
                "menu_demand_forecast",
                [],
            )
        ),

        "waste_prediction": (
            waste_prediction_result
        ),

        "cost_saving": cost_report,

        "carbon_impact": carbon_report,

        "esg": esg_report,

        "recommendations": recommendations,

        "accepted_recommendations": (
            accepted_recommendations
        ),

        "performance_history": (
            create_performance_history(
                period=normalized_period,

                total_cost_saving=summary[
                    "estimated_total_cost_saving_thb"
                ],

                total_waste_reduction=summary[
                    "estimated_waste_reduction_kg"
                ],

                total_carbon_reduction=summary[
                    "estimated_carbon_reduction_kg_co2e"
                ],
            )
        ),

        "calculation_basis": {
            "avoidable_waste_rate": (
                avoidable_waste_rate
            ),

            "avoidable_waste_rate_percent": round(
                avoidable_waste_rate * 100,
                2,
            ),

            "cost_saving_formula": (
                "avoidable food cost loss "
                "+ avoidable disposal cost"
            ),

            "carbon_impact_formula": (
                "predicted waste kg "
                "× food-waste carbon factor"
            ),

            "carbon_reduction_formula": (
                "carbon impact "
                "× avoidable waste rate"
            ),

            "prototype_note": (
                "Weekly, monthly, and yearly results are "
                "currently projected from the daily mock-data "
                "result. Replace this with real period aggregation "
                "when Supabase historical data is available."
            ),
        },
    }


if __name__ == "__main__":
    report = generate_savings_report(
        period="month",
        reference_date="2026-07-15",
        avoidable_waste_rate=0.80,
        accepted_menu_items=[
            "Fried Rice",
        ],
        days_logged=26,
        total_days_in_period=30,
        reporting_rate=0.90,
    )

    import json

    print(
        json.dumps(
            report,
            indent=2,
            ensure_ascii=False,
        )
    )