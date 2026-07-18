# ai_report_writer.py

from __future__ import annotations

import json
import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field


load_dotenv()


OPENAI_REPORT_MODEL = os.getenv(
    "OPENAI_REPORT_MODEL",
    "gpt-5-mini",
)


class ReportHighlight(BaseModel):
    title: str = Field(
        description=(
            "Short title for the report highlight."
        )
    )

    description: str = Field(
        description=(
            "Short explanation using only supplied report data."
        )
    )

    metric: str = Field(
        description=(
            "Relevant metric exactly based on the supplied values."
        )
    )


class ReportAttentionItem(BaseModel):
    title: str = Field(
        description=(
            "Short title for an issue requiring attention."
        )
    )

    reason: str = Field(
        description=(
            "Why this issue needs attention."
        )
    )

    recommended_action: str = Field(
        description=(
            "A practical next action for the restaurant owner."
        )
    )


class AIReportOutput(BaseModel):
    report_title: str = Field(
        description=(
            "Professional title for the selected report period."
        )
    )

    headline: str = Field(
        description=(
            "One short headline describing the main result."
        )
    )

    executive_summary: str = Field(
        description=(
            "A clear two-to-four sentence summary written for "
            "a non-technical restaurant owner."
        )
    )

    financial_summary: str = Field(
        description=(
            "A short explanation of cost savings and losses."
        )
    )

    environmental_summary: str = Field(
        description=(
            "A short explanation of waste and carbon results."
        )
    )

    esg_summary: str = Field(
        description=(
            "A short explanation of environmental, social, "
            "governance, and overall ESG scores."
        )
    )

    recommendation_summary: str = Field(
        description=(
            "A short explanation of recommendation adoption "
            "and the most important actions."
        )
    )

    highlights: list[ReportHighlight] = Field(
        description=(
            "Two to five important report highlights."
        )
    )

    attention_items: list[
        ReportAttentionItem
    ] = Field(
        description=(
            "Zero to four issues requiring attention."
        )
    )

    next_actions: list[str] = Field(
        description=(
            "Two to four practical next actions."
        )
    )

    conclusion: str = Field(
        description=(
            "A short closing statement for the report."
        )
    )


def get_openai_client() -> OpenAI:
    """
    Create an OpenAI client from the backend API key.
    """

    api_key = os.getenv(
        "OPENAI_API_KEY"
    )

    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is missing. "
            "Add it to your .env file."
        )

    return OpenAI(
        api_key=api_key
    )


def create_report_subset(
    report_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Reduce the amount of data sent to OpenAI.

    The detailed raw analytics are still returned to the
    frontend, but OpenAI only needs the important calculated
    fields for writing.
    """

    return {
        "report_type": report_data.get(
            "report_type"
        ),

        "period": report_data.get(
            "period"
        ),

        "period_label": report_data.get(
            "period_label"
        ),

        "date_range": report_data.get(
            "date_range",
            {},
        ),

        "company": report_data.get(
            "company",
            {},
        ),

        "summary": report_data.get(
            "summary",
            {},
        ),

        "analytics_summary": {
            "totals": report_data.get(
                "analytics",
                {},
            ).get(
                "totals",
                {},
            ),

            "costs": report_data.get(
                "analytics",
                {},
            ).get(
                "costs",
                {},
            ),

            "efficiency_metrics": report_data.get(
                "analytics",
                {},
            ).get(
                "efficiency_metrics",
                {},
            ),

            "trends": report_data.get(
                "analytics",
                {},
            ).get(
                "trends",
                {},
            ),

            "benchmark_comparison": report_data.get(
                "analytics",
                {},
            ).get(
                "benchmark_comparison",
                {},
            ),
        },

        "waste_summary": report_data.get(
            "waste_prediction",
            {},
        ).get(
            "summary",
            {},
        ),

        "esg_scores": report_data.get(
            "esg",
            {},
        ).get(
            "scores",
            {},
        ),

        "accepted_recommendations": (
            report_data.get(
                "accepted_recommendations",
                [],
            )
        ),

        "recommendations": (
            report_data.get(
                "recommendations",
                {},
            )
        ),

        "calculation_basis": (
            report_data.get(
                "calculation_basis",
                {},
            )
        ),
    }


def build_report_prompt(
    report_data: dict[str, Any],
) -> str:
    """
    Build the prompt sent to OpenAI.
    """

    report_subset = create_report_subset(
        report_data
    )

    return (
        "Write a professional Waste Guard savings and "
        "sustainability report using the supplied JSON.\n\n"
        "Important rules:\n"
        "1. Use only numbers that exist in the supplied JSON.\n"
        "2. Do not invent, modify, estimate, or recalculate values.\n"
        "3. Describe calculated savings as projected or estimated, "
        "unless the input explicitly states that they are actual.\n"
        "4. Clearly distinguish carbon impact from carbon reduction.\n"
        "5. Clearly distinguish predicted waste from actual waste.\n"
        "6. Write for a non-technical restaurant or hotel owner.\n"
        "7. Mention major waste risks, cost opportunities, ESG "
        "performance, and recommendation adherence.\n"
        "8. Do not mention OpenAI, prompts, JSON, or being an AI.\n"
        "9. Do not claim that the report is independently audited.\n"
        "10. Keep the report concise enough for a dashboard.\n\n"
        "Calculated Waste Guard report data:\n"
        + json.dumps(
            report_subset,
            ensure_ascii=False,
            indent=2,
            default=str,
        )
    )


def create_fallback_report(
    report_data: dict[str, Any],
    error_message: str | None = None,
) -> dict[str, Any]:
    """
    Create a non-AI report when OpenAI is unavailable.
    """

    company = report_data.get(
        "company",
        {},
    )

    company_name = company.get(
        "company_name",
        "The business",
    )

    period = str(
        report_data.get(
            "period",
            "reporting period",
        )
    )

    summary = report_data.get(
        "summary",
        {},
    )

    total_saving = float(
        summary.get(
            "estimated_total_cost_saving_thb",
            0,
        )
    )

    waste_reduction = float(
        summary.get(
            "estimated_waste_reduction_kg",
            0,
        )
    )

    carbon_reduction = float(
        summary.get(
            "estimated_carbon_reduction_kg_co2e",
            0,
        )
    )

    overall_esg = float(
        summary.get(
            "overall_esg_score",
            0,
        )
    )

    acted_on = int(
        summary.get(
            "recommendations_acted_on",
            0,
        )
    )

    total_recommendations = int(
        summary.get(
            "total_recommendations",
            0,
        )
    )

    adherence = float(
        summary.get(
            "recommendation_adherence_percent",
            0,
        )
    )

    attention_items = []

    if adherence < 50 and total_recommendations > 0:
        attention_items.append({
            "title": (
                "Low recommendation adoption"
            ),

            "reason": (
                f"Only {acted_on} of "
                f"{total_recommendations} recommendations "
                f"were acted on."
            ),

            "recommended_action": (
                "Review the highest-priority remaining "
                "recommendation."
            ),
        })

    if overall_esg < 70:
        attention_items.append({
            "title": "ESG score needs improvement",

            "reason": (
                f"The overall ESG score is "
                f"{overall_esg:.2f} out of 100."
            ),

            "recommended_action": (
                "Prioritize environmental and governance "
                "improvements."
            ),
        })

    result = {
        "report_title": (
            f"{period.capitalize()} Waste Guard Report"
        ),

        "headline": (
            f"{company_name} sustainability performance"
        ),

        "executive_summary": (
            f"{company_name} is projected to save "
            f"THB {total_saving:,.2f} during this "
            f"{period}. The current actions could avoid "
            f"approximately {waste_reduction:,.2f} kg "
            f"of food waste and reduce emissions by "
            f"{carbon_reduction:,.2f} kg CO2e."
        ),

        "financial_summary": (
            f"Estimated total cost savings are "
            f"THB {total_saving:,.2f} for the selected period."
        ),

        "environmental_summary": (
            f"Estimated waste reduction is "
            f"{waste_reduction:,.2f} kg, with an estimated "
            f"carbon reduction of "
            f"{carbon_reduction:,.2f} kg CO2e."
        ),

        "esg_summary": (
            f"The overall sustainability score is "
            f"{overall_esg:.2f} out of 100."
        ),

        "recommendation_summary": (
            f"{acted_on} of {total_recommendations} "
            f"recommendations were acted on, giving an "
            f"adherence rate of {adherence:.2f}%."
        ),

        "highlights": [
            {
                "title": "Projected cost saving",
                "description": (
                    "Potential savings from reducing "
                    "avoidable food waste."
                ),
                "metric": (
                    f"THB {total_saving:,.2f}"
                ),
            },
            {
                "title": "Waste reduction",
                "description": (
                    "Food waste that could potentially "
                    "be prevented."
                ),
                "metric": (
                    f"{waste_reduction:,.2f} kg"
                ),
            },
            {
                "title": "Carbon reduction",
                "description": (
                    "Estimated emissions avoided through "
                    "waste reduction."
                ),
                "metric": (
                    f"{carbon_reduction:,.2f} kg CO2e"
                ),
            },
        ],

        "attention_items": attention_items,

        "next_actions": [
            (
                "Review the highest-risk menu items."
            ),
            (
                "Record actual preparation, sales, and "
                "leftovers after service."
            ),
            (
                "Compare projected and actual savings at "
                "the end of the reporting period."
            ),
        ],

        "conclusion": (
            "Continue tracking actual outcomes to improve "
            "forecast accuracy and validate projected savings."
        ),

        "generated_by": "fallback",
    }

    if error_message:
        result["generation_error"] = (
            error_message
        )

    return result


def generate_ai_report(
    report_data: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate the report using OpenAI Structured Outputs.
    """

    if not isinstance(
        report_data,
        dict,
    ):
        raise ValueError(
            "report_data must be a dictionary."
        )

    try:
        client = get_openai_client()

        response = client.responses.parse(
            model=OPENAI_REPORT_MODEL,

            input=[
                {
                    "role": "developer",
                    "content": (
                        "You are the report-writing assistant "
                        "for Waste Guard, a food-waste reduction "
                        "and sustainability platform. Write "
                        "accurate, practical, owner-facing reports. "
                        "Never change supplied numbers."
                    ),
                },
                {
                    "role": "user",
                    "content": build_report_prompt(
                        report_data
                    ),
                },
            ],

            text_format=AIReportOutput,
        )

        parsed = response.output_parsed

        if parsed is None:
            raise RuntimeError(
                "OpenAI returned no parsed report."
            )

        result = parsed.model_dump()

        result["generated_by"] = "openai"
        result["model"] = (
            OPENAI_REPORT_MODEL
        )

        return result

    except Exception as error:
        print(
            f"OpenAI report generation failed: {error}"
        )

        return create_fallback_report(
            report_data=report_data,
            error_message=str(error),
        )


if __name__ == "__main__":
    from savings_report import (
        generate_savings_report,
    )

    calculated_report = (
        generate_savings_report(
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
    )

    written_report = generate_ai_report(
        calculated_report
    )

    print(
        json.dumps(
            written_report,
            indent=2,
            ensure_ascii=False,
        )
    )
