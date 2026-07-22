import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from mock_datas import set_pipeline_data
from analytics_engine import AnalyticsEngine
from ai_insight_engine import generate_ai_insights
from recommendation_engine import generate_final_recommendations
from waste_prediction_engine import generate_waste_predictions, predict_waste_from_input
from esg_score_calculation import calculate_esg_score
from savings_report import generate_savings_report

app = Flask(__name__)
CORS(app)

confirmed_staff_preparation = []


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "WasteGuard AI Sustainability Consultant API is running.",
        "available_routes": [
            "GET  /api/analytics",
            "POST /api/analytics          — body: { daily_inputs: FoodRow[] }",
            "GET  /api/ai-insights",
            "GET  /api/recommendations",
            "POST /api/recommendations    — body: { daily_inputs: FoodRow[] }",
            "GET  /api/waste-predictions",
            "POST /api/waste-predictions  — body: { items: MenuItemInput[] }",
            "GET  /api/esg-score",
            "POST /api/esg-score          — body: { average_waste_percent, days_logged, total_days_in_period, "
            "reporting_rate, recommendations_acted_on, total_recommendations, previous_overall_score? }",
            "GET  /api/savings-report",
            "POST /api/savings-report     — body: { period, reference_date?, avoidable_waste_rate?, "
            "accepted_menu_items?, total_recommendations?, days_logged?, total_days_in_period?, reporting_rate?, "
            "previous_overall_esg_score? }",
            "POST /api/confirm-preparation",
            "GET  /api/staff-preparation",
        ]
    })


# ── Analytics ─────────────────────────────────────────────────────────────────

@app.route("/api/analytics", methods=["GET", "POST"])
def get_analytics():
    """
    GET  → run analytics on mock data
    POST → run analytics on real bakery data from Next.js
           body: { "daily_inputs": FoodRow[] }
    """
    if request.method == "POST":
        body = request.get_json() or {}
        set_pipeline_data(body.get("daily_inputs", []))
    else:
        set_pipeline_data(None)  # reset to mock

    engine = AnalyticsEngine()
    report = engine.generate_report()
    return jsonify(report)


# ── AI Insights ───────────────────────────────────────────────────────────────

@app.route("/api/ai-insights", methods=["GET", "POST"])
def get_ai_insights():
    """
    POST → inject real data before generating insights
    """
    if request.method == "POST":
        body = request.get_json() or {}
        set_pipeline_data(body.get("daily_inputs", []))
    else:
        set_pipeline_data(None)

    insights = generate_ai_insights()
    return jsonify(insights)


# ── Recommendations ───────────────────────────────────────────────────────────

@app.route("/api/recommendations", methods=["GET", "POST"])
@app.route("/api/ai-recommendations", methods=["GET", "POST"])
def get_recommendations():
    """
    GET  → recommendations from mock data (demo / fallback)
    POST → full pipeline: Company data → Analytics → AI Insight → Recommendations
           body: { "daily_inputs": FoodRow[], "menu_items"?: BusinessMenuItem[],
                   "sales_history"?: BusinessSalesHistoryRow[] }

    Flow:
      set_pipeline_data() injects real bakery data into mock_datas.py.
      All engines (analytics, insight, recommendation) call get_daily_operations(),
      get_sales_history(), get_today_input(), get_menu_items() which now return
      the real data when menu_items/sales_history are provided.
    """
    if request.method == "POST":
        body = request.get_json() or {}
        set_pipeline_data(
            body.get("daily_inputs", []),
            body.get("menu_items", []),
            body.get("sales_history", []),
        )
    else:
        set_pipeline_data(None)

    recommendations = generate_final_recommendations()
    return jsonify(recommendations)


# ── Waste predictions ─────────────────────────────────────────────────────────

@app.route("/api/waste-predictions", methods=["GET", "POST"])
def get_waste_predictions():
    """
    GET  → predictions from the current menu forecast (mock/demo)
    POST → predictions for specific menu items
           body: { "items": [{ menu_item, prepared_quantity, ai_forecast, ... }] }
    """
    if request.method == "POST":
        body = request.get_json() or {}
        items = body.get("items")
        if items:
            return jsonify(predict_waste_from_input(items))

    return jsonify(generate_waste_predictions())


# ── ESG score ─────────────────────────────────────────────────────────────────

def _default_esg_inputs():
    """Mock-data defaults, mirroring generate_savings_report()'s own defaults."""
    waste_summary = generate_waste_predictions().get("summary", {})
    recommendations = generate_final_recommendations()
    total_recommendations = sum(
        len(recommendations.get(key, []))
        for key in (
            "food_preparation_recommendations",
            "sustainability_recommendations",
            "anomaly_recommendations",
        )
    )
    return {
        "average_waste_percent": waste_summary.get("overall_waste_percent", 0),
        "days_logged": 1,
        "total_days_in_period": 1,
        "reporting_rate": 1.0,
        "recommendations_acted_on": 0,
        "total_recommendations": total_recommendations,
        "previous_overall_score": None,
    }


@app.route("/api/esg-score", methods=["GET", "POST"])
def get_esg_score():
    """
    GET  → ESG score from mock data
    POST → ESG score from real inputs (usually computed client-side from the
           owner's actual logged days / accepted recommendations)
           body: { average_waste_percent, days_logged, total_days_in_period,
                    reporting_rate, recommendations_acted_on, total_recommendations,
                    previous_overall_score? }
    """
    inputs = _default_esg_inputs()

    if request.method == "POST":
        body = request.get_json() or {}
        inputs.update({k: v for k, v in body.items() if v is not None})

    result = calculate_esg_score(
        average_waste_percent=inputs["average_waste_percent"],
        days_logged=inputs["days_logged"],
        total_days_in_period=inputs["total_days_in_period"],
        reporting_rate=inputs["reporting_rate"],
        recommendations_acted_on=inputs["recommendations_acted_on"],
        total_recommendations=inputs["total_recommendations"],
        previous_overall_score=inputs.get("previous_overall_score"),
    )
    return jsonify(result)


# ── Savings report ────────────────────────────────────────────────────────────

@app.route("/api/savings-report", methods=["GET", "POST"])
def get_savings_report():
    """
    GET  → full savings/sustainability report on mock data (period=month)
    POST → full report with real inputs
           body: { period?, reference_date?, avoidable_waste_rate?, accepted_menu_items?,
                    total_recommendations?, days_logged?, total_days_in_period?,
                    reporting_rate?, previous_overall_esg_score? }
    """
    body = request.get_json(silent=True) or {} if request.method == "POST" else {}

    try:
        report = generate_savings_report(
            period=body.get("period", "month"),
            reference_date=body.get("reference_date"),
            avoidable_waste_rate=body.get("avoidable_waste_rate", 0.80),
            accepted_menu_items=body.get("accepted_menu_items"),
            total_recommendations=body.get("total_recommendations"),
            days_logged=body.get("days_logged", 1),
            total_days_in_period=body.get("total_days_in_period", 1),
            reporting_rate=body.get("reporting_rate", 1.0),
            previous_overall_esg_score=body.get("previous_overall_esg_score"),
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify(report)


# ── Staff preparation confirmation ────────────────────────────────────────────

@app.route("/api/confirm-preparation", methods=["POST"])
def confirm_preparation():
    global confirmed_staff_preparation

    body = request.get_json()
    if not body or "items" not in body:
        return jsonify({"error": "Please send items to confirm"}), 400

    staff_items = []
    for item in body["items"]:
        staff_items.append({
            "menu_item":       item.get("menu_item"),
            "category":        item.get("category"),
            "planned_quantity":item.get("final_prep_recommendation"),
            "demand_status":   item.get("demand_status"),
            "waste_risk_status":item.get("waste_risk_status"),
        })

    confirmed_staff_preparation = staff_items

    return jsonify({
        "message": "Manager confirmed today's preparation plan",
        "today_preparation": confirmed_staff_preparation,
    })


@app.route("/api/staff-preparation", methods=["GET"])
def get_staff_preparation():
    return jsonify({"today_preparation": confirmed_staff_preparation})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
