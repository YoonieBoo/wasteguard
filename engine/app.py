import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from mock_datas import set_pipeline_data
from analytics_engine import AnalyticsEngine
from ai_insight_engine import generate_ai_insights
from recommendation_engine import generate_final_recommendations

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
           body: { "daily_inputs": FoodRow[] }

    Flow:
      set_pipeline_data() injects real bakery data into mock_datas.py.
      All engines (analytics, insight, recommendation) call get_daily_operations(),
      get_sales_history(), get_today_input() which now return the real data.
    """
    if request.method == "POST":
        body = request.get_json() or {}
        set_pipeline_data(body.get("daily_inputs", []))
    else:
        set_pipeline_data(None)

    recommendations = generate_final_recommendations()
    return jsonify(recommendations)


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
