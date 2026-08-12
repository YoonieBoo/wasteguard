import math

from mock_datas import (
    get_sales_history,
    get_menu_items,
    get_daily_operations,
    industry_benchmarks,
    utility_rates,
    carbon_factors
)

from insight_menu_forecast import generate_menu_demand_forecast
from insight_sustainability_forecast import generate_sustainability_forecast
from insight_anomaly_detection import detect_unusual_patterns


# PART 1: FOOD PREPARATION RECOMMENDATION
def calculate_safety_buffer(row):
    sales = get_sales_history()
    item_sales = sales[sales["menu_item"] == row["menu_item"]]

    average_sales = item_sales["sold_quantity"].mean()
    sales_volatility = item_sales["sold_quantity"].std() / average_sales

    buffer = 0.05

    if sales_volatility > 0.20:
        buffer += 0.05
    elif sales_volatility > 0.10:
        buffer += 0.03

    if row["trend_percent"] > 5:
        buffer += 0.02

    if row["category"] in ["Buffet", "Bread", "Main Course"]:
        buffer += 0.02

    if buffer > 0.20:
        buffer = 0.20

    return round(buffer, 2)


def get_demand_status(row):
    if row["ai_forecast"] >= row["seven_day_average"]:
        return "High Demand"
    elif row["ai_forecast"] >= row["thirty_day_average"]:
        return "Medium Demand"
    return "Normal Demand"


def get_waste_risk_status(row):
    if row["safety_buffer"] >= 0.15:
        return "Medium Waste Risk"
    return "Low Waste Risk"


def generate_food_prep_recommendations():
    # A real business with very little logged history can't train a useful
    # per-dish forecast — better to show nothing than a low-confidence guess.
    sales = get_sales_history()
    menu = get_menu_items()
    if sales.empty or menu.empty or sales["date"].nunique() < 2:
        return []

    forecast = generate_menu_demand_forecast()

    forecast["safety_buffer"] = forecast.apply(calculate_safety_buffer, axis=1)

    forecast["final_prep_recommendation"] = forecast.apply(
        lambda row: math.ceil(row["ai_forecast"] * (1 + row["safety_buffer"])),
        axis=1
    )

    forecast["safety_buffer_percent"] = forecast["safety_buffer"].apply(
        lambda value: int(value * 100)
    )

    forecast["demand_status"] = forecast.apply(get_demand_status, axis=1)
    forecast["waste_risk_status"] = forecast.apply(get_waste_risk_status, axis=1)

    final_columns = [
        "menu_item",
        "category",
        "yesterday_sales",
        "seven_day_average",
        "thirty_day_average",
        "trend_percent",
        "ai_forecast",
        "safety_buffer_percent",
        "final_prep_recommendation",
        "demand_status",
        "waste_risk_status"
    ]

    return forecast[final_columns].to_dict(orient="records")


# PART 2: SUSTAINABILITY RECOMMENDATIONS

def generate_sustainability_recommendations():
    # Same reasoning as generate_food_prep_recommendations(): a business with
    # no logged daily operations yet has nothing real to forecast from —
    # show nothing rather than a forecast trained on mock data.
    if get_daily_operations().empty:
        return []

    forecast = generate_sustainability_forecast()
    predictions = forecast["predictions"]

    predicted_food_waste = predictions["predicted_food_waste_kg"]
    predicted_electricity = predictions["predicted_electricity_kwh"]
    predicted_water = predictions["predicted_water_liters"]
    predicted_gas = predictions["predicted_gas_kg"]

    customer_count = forecast["future_input"]["customer_count"]

    electricity_per_customer = predicted_electricity / customer_count
    water_m3_per_customer = (predicted_water / 1000) / customer_count
    gas_per_customer = predicted_gas / customer_count
    food_waste_per_customer = predicted_food_waste / customer_count

    recommendations = []

    # Food waste recommendation
    if food_waste_per_customer > 0.15:
        savings = predicted_food_waste * utility_rates["food_waste_disposal_per_kg"] * 30
        carbon_reduction = predicted_food_waste * carbon_factors["food_waste"] * 30 * 0.12

        recommendations.append({
            "priority": "High",
            "recommendation": "Reduce buffet production by 12%.",
            "reason": "Predicted food waste per customer is higher than the acceptable level.",
            "estimated_savings": f"฿{round(savings):,}/month",
            "carbon_reduction": f"{round(carbon_reduction)} kg CO₂/month",
            "confidence": "89%"
        })

    # Electricity recommendation
    if electricity_per_customer > industry_benchmarks["average_electricity_per_customer"]:
        savings = predicted_electricity * utility_rates["electricity_price_per_kwh"] * 30 * 0.08
        carbon_reduction = predicted_electricity * carbon_factors["electricity"] * 30 * 0.08

        recommendations.append({
            "priority": "Medium",
            "recommendation": "Replace high-usage lighting with LED bulbs and adjust air-conditioning schedule.",
            "reason": "Predicted electricity usage per customer is above the industry benchmark.",
            "estimated_savings": f"฿{round(savings):,}/month",
            "carbon_reduction": f"{round(carbon_reduction)} kg CO₂/month",
            "confidence": "82%"
        })

    # Water recommendation
    if water_m3_per_customer > industry_benchmarks["average_water_per_customer"]:
        savings = (predicted_water / 1000) * utility_rates["water_price_per_m3"] * 30 * 0.10
        carbon_reduction = (predicted_water / 1000) * carbon_factors["water"] * 30 * 0.10

        recommendations.append({
            "priority": "Medium",
            "recommendation": "Install water-saving faucets and monitor kitchen washing practices.",
            "reason": "Predicted water usage per customer is above the industry benchmark.",
            "estimated_savings": f"฿{round(savings):,}/month",
            "carbon_reduction": f"{round(carbon_reduction)} kg CO₂/month",
            "confidence": "80%"
        })

    # Gas recommendation
    if gas_per_customer > industry_benchmarks["average_gas_per_customer"]:
        savings = predicted_gas * utility_rates["gas_price_per_m3"] * 30 * 0.07
        carbon_reduction = predicted_gas * carbon_factors["gas"] * 30 * 0.07

        recommendations.append({
            "priority": "Low",
            "recommendation": "Improve kitchen burner efficiency and check gas equipment maintenance.",
            "reason": "Predicted gas usage per customer is above the benchmark.",
            "estimated_savings": f"฿{round(savings):,}/month",
            "carbon_reduction": f"{round(carbon_reduction)} kg CO₂/month",
            "confidence": "76%"
        })

    return recommendations


# PART 3: ANOMALY-BASED RECOMMENDATIONS
def generate_anomaly_recommendations():
    if get_daily_operations().empty:
        return []

    anomalies = detect_unusual_patterns()

    results = []

    for anomaly in anomalies:
        results.append({
            "priority": "High",
            "recommendation": "Review unusual operational activity on this date.",
            "date": anomaly["date"],
            "reason": anomaly["possible_reasons"],
            "confidence": "78%"
        })

    return results



# PART 4: FULL RECOMMENDATION ENGINE OUTPUT
def generate_final_recommendations():
    return {
        "food_preparation_recommendations": generate_food_prep_recommendations(),
        "sustainability_recommendations": generate_sustainability_recommendations(),
        "anomaly_recommendations": generate_anomaly_recommendations()
    }


if __name__ == "__main__":
    result = generate_final_recommendations()

    print("\n===== FOOD PREPARATION RECOMMENDATIONS =====\n")
    for item in result["food_preparation_recommendations"]:
        print(item)

    print("\n===== SUSTAINABILITY RECOMMENDATIONS =====\n")
    for item in result["sustainability_recommendations"]:
        print(item)

    print("\n===== ANOMALY RECOMMENDATIONS =====\n")
    for item in result["anomaly_recommendations"]:
        print(item)