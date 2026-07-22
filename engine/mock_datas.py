# ==========================================================
# 1. COMPANY PROFILE
# ==========================================================

company_profile = {
    "company_name": "Green Garden Hotel",
    "business_type": "Hotel Restaurant",
    "location": "Bangkok",
    "operating_days_per_month": 30,
    "operating_hours": "06:00 - 22:00",
    "number_of_staff": 38,
    "floor_area_m2": 1800,
    "seating_capacity": 220
}

# ==========================================================
# 2. DAILY OPERATIONAL DATA (mock — used as fallback)
# ==========================================================

daily_operations = [
    {
        "date": "2026-06-01", "day": "Monday", "weather": "Sunny", "promotion": 0,
        "customers": 265, "occupancy_rate": 82, "food_waste_kg": 38.4,
        "electricity_kwh": 1185, "water_m3": 42, "gas_m3": 28,
        "revenue": 154000, "waste_disposal_cost": 820
    },
    {
        "date": "2026-06-02", "day": "Tuesday", "weather": "Rainy", "promotion": 1,
        "customers": 291, "occupancy_rate": 87, "food_waste_kg": 51.2,
        "electricity_kwh": 1264, "water_m3": 46, "gas_m3": 30,
        "revenue": 169500, "waste_disposal_cost": 910
    },
    {
        "date": "2026-06-03", "day": "Wednesday", "weather": "Cloudy", "promotion": 0,
        "customers": 248, "occupancy_rate": 79, "food_waste_kg": 33.5,
        "electricity_kwh": 1130, "water_m3": 40, "gas_m3": 27,
        "revenue": 149000, "waste_disposal_cost": 730
    },
    {
        "date": "2026-06-04", "day": "Thursday", "weather": "Sunny", "promotion": 0,
        "customers": 274, "occupancy_rate": 84, "food_waste_kg": 36.1,
        "electricity_kwh": 1198, "water_m3": 43, "gas_m3": 29,
        "revenue": 158400, "waste_disposal_cost": 760
    },
    {
        "date": "2026-06-05", "day": "Friday", "weather": "Sunny", "promotion": 1,
        "customers": 327, "occupancy_rate": 92, "food_waste_kg": 56.8,
        "electricity_kwh": 1328, "water_m3": 49, "gas_m3": 33,
        "revenue": 188700, "waste_disposal_cost": 980
    }
]

# ==========================================================
# 3. MENU SALES
# ==========================================================

menu_sales = [
    {
        "menu": "Breakfast Buffet", "category": "Buffet",
        "prepared_qty": 320, "sold_qty": 285, "leftover_qty": 35,
        "food_cost": 24, "selling_price": 65
    },
    {
        "menu": "Fried Rice", "category": "Main Course",
        "prepared_qty": 95, "sold_qty": 91, "leftover_qty": 4,
        "food_cost": 5, "selling_price": 15
    },
    {
        "menu": "Caesar Salad", "category": "Salad",
        "prepared_qty": 55, "sold_qty": 47, "leftover_qty": 8,
        "food_cost": 4, "selling_price": 12
    },
    {
        "menu": "Chicken Steak", "category": "Main Course",
        "prepared_qty": 72, "sold_qty": 68, "leftover_qty": 4,
        "food_cost": 8, "selling_price": 22
    }
]

# ==========================================================
# 4. UTILITY RATES
# ==========================================================

utility_rates = {
    "electricity_price_per_kwh": 4.20,
    "water_price_per_m3": 18.00,
    "gas_price_per_m3": 15.00,
    "food_waste_disposal_per_kg": 7.00
}

# ==========================================================
# 5. CARBON EMISSION FACTORS
# ==========================================================

carbon_factors = {
    "electricity": 0.42,
    "water": 0.34,
    "gas": 2.02,
    "food_waste": 2.50
}

# ==========================================================
# 6. INDUSTRY BENCHMARKS
# ==========================================================

industry_benchmarks = {
    "average_food_waste_percent": 12,
    "good_food_waste_percent": 8,
    "average_electricity_per_customer": 4.8,
    "average_water_per_customer": 0.17,
    "average_gas_per_customer": 0.11,
    "average_esg_score": 72
}

# ==========================================================
# 7. SUSTAINABILITY RECOMMENDATION RULES
# ==========================================================

recommendation_rules = [
    {
        "condition": "food_waste > benchmark", "priority": "High",
        "recommendation": "Reduce buffet production by 10-15%",
        "estimated_savings": 15000, "carbon_reduction": 120
    },
    {
        "condition": "electricity_usage > benchmark", "priority": "Medium",
        "recommendation": "Replace fluorescent lighting with LED bulbs",
        "estimated_savings": 6200, "carbon_reduction": 55
    },
    {
        "condition": "water_usage > benchmark", "priority": "Medium",
        "recommendation": "Install water-saving faucets",
        "estimated_savings": 3500, "carbon_reduction": 18
    },
    {
        "condition": "gas_usage > benchmark", "priority": "Low",
        "recommendation": "Improve kitchen burner efficiency",
        "estimated_savings": 2400, "carbon_reduction": 14
    }
]

# ==========================================================
# REAL-DATA PIPELINE OVERRIDE
# ==========================================================
# Call set_pipeline_data(daily_inputs) before running any engine.
# All engines (analytics, insight, recommendation) read from
# get_daily_operations() / get_sales_history() / get_today_input()
# which automatically use real data when set, otherwise fall back
# to the mock lists above.
# ==========================================================

import datetime
import pandas as pd

_pipeline_override = {}  # holds transformed real data between request calls


def set_pipeline_data(daily_inputs_raw=None, menu_items_raw=None, sales_history_raw=None):
    """
    Inject real business data into the pipeline for this request. Call with no
    args (or all empty) to reset to mock data. Each request resets the whole
    override, then sets whichever of the three pieces were actually provided.
    """
    _pipeline_override.clear()

    if daily_inputs_raw and len(daily_inputs_raw) > 0:
        _pipeline_override["daily_operations"] = _transform_bakery_inputs(daily_inputs_raw)

    if menu_items_raw and len(menu_items_raw) > 0:
        _pipeline_override["menu_items"] = _transform_menu_items(menu_items_raw)

    if sales_history_raw and len(sales_history_raw) > 0:
        _pipeline_override["sales_history"] = _transform_sales_history(sales_history_raw)


def _transform_menu_items(items):
    """
    Convert Next.js BusinessMenuItem[] → the menu_sales-shaped records
    get_menu_items()/get_today_input() expect.
    """
    result = []
    for item in items:
        result.append({
            "menu":          item.get("name") or "Unknown",
            "category":      item.get("category") or "Uncategorized",
            "food_cost":     float(item.get("unitCost") or 0),
            "selling_price": float(item.get("sellingPrice") or 0),
        })
    return result


def _transform_sales_history(rows):
    """
    Convert Next.js BusinessSalesHistoryRow[] → the flat per-dish-per-day
    records get_sales_history() expects. Weather/promotion aren't tracked
    per dish, so they're estimated the same way _transform_bakery_inputs
    already does for daily-aggregate data.
    """
    result = []
    for row in rows:
        date_str = row.get("date", "")
        try:
            day_name = datetime.datetime.strptime(date_str, "%Y-%m-%d").strftime("%A")
        except Exception:
            day_name = "Monday"

        result.append({
            "date":          date_str,
            "menu_item":     row.get("menu_item") or "Unknown",
            "day_of_week":   day_name,
            "weather":       "Sunny",
            "promotion":     0,
            "sold_quantity": float(row.get("sold_quantity") or 0),
        })
    return result


def _transform_bakery_inputs(rows):
    """
    Convert Next.js FoodRow[] → daily_operations list format expected by the engines.

    Bakery data doesn't include electricity/water/gas so we estimate those from
    customer count using bakery-scale ratios (much lower than hotel benchmarks,
    so the AI naturally focuses sustainability recommendations on food waste).
    """
    result = []
    for row in rows:
        customers = max(1, int(row.get("orders", 0)))
        leftover  = float(row.get("leftover", 0))

        # Convert pieces → kg  (~0.15 kg per bakery item: bread, pastry, box)
        food_waste_kg = round(leftover * 0.15, 2)

        # Day name from date string
        try:
            day_name = datetime.datetime.strptime(row["date"], "%Y-%m-%d").strftime("%A")
        except Exception:
            day_name = "Monday"

        # Revenue: use stored value or estimate from orders
        revenue = float(row.get("revenue", 0)) or customers * 75

        # Bakery utility estimates (per-customer ratios much lower than hotel)
        electricity_kwh = round(customers * 1.5 + 150)   # base load + per order
        water_m3        = round(customers * 0.012 + 4, 1)
        gas_m3          = round(customers * 0.010 + 2, 1)

        result.append({
            "date":                row.get("date", ""),
            "day":                 day_name,
            "weather":             str(row.get("weather", "Sunny")).capitalize(),
            "promotion":           int(row.get("promotion", 0)),
            "customers":           customers,
            "occupancy_rate":      min(100, round(customers * 0.8)),
            "food_waste_kg":       food_waste_kg,
            "electricity_kwh":     electricity_kwh,
            "water_m3":            water_m3,
            "gas_m3":              gas_m3,
            "revenue":             int(revenue),
            "waste_disposal_cost": round(food_waste_kg * 7.0),
        })
    return result


def get_effective_daily_operations():
    """Return real daily ops as a list (analytics_engine uses this)."""
    return _pipeline_override.get("daily_operations") or daily_operations


# ==========================================================
# DATAFRAME HELPERS  (used by insight engines)
# ==========================================================

def get_daily_operations():
    source = _pipeline_override.get("daily_operations") or daily_operations
    df = pd.DataFrame(source)
    df = df.rename(columns={
        "day":      "day_of_week",
        "customers":"customer_count",
        "water_m3": "water_liters",
        "gas_m3":   "gas_kg",
        "revenue":  "revenue_thb",
    })
    df["water_liters"] = df["water_liters"] * 1000
    df["is_weekend"]   = df["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)
    df["buffet_prepared_kg"] = df["customer_count"] * 0.45
    return df


def get_menu_items():
    source = _pipeline_override.get("menu_items") or menu_sales
    df = pd.DataFrame(source)
    df = df.rename(columns={
        "menu":          "menu_item",
        "selling_price": "selling_price_thb",
        "food_cost":     "food_cost_thb",
    })
    return df[["menu_item", "category", "food_cost_thb", "selling_price_thb"]]


def get_sales_history():
    override = _pipeline_override.get("sales_history")
    if override:
        return pd.DataFrame(override)

    ops = _pipeline_override.get("daily_operations") or daily_operations
    rows = []
    for day in ops:
        for item in menu_sales:
            rows.append({
                "date":        day["date"],
                "menu_item":   item["menu"],
                "day_of_week": day["day"],
                "weather":     day["weather"],
                "promotion":   day["promotion"],
                "sold_quantity": item["sold_qty"],
            })
    return pd.DataFrame(rows)


def get_today_input():
    source_items = _pipeline_override.get("menu_items") or menu_sales
    ops = _pipeline_override.get("daily_operations") or daily_operations
    # Use the most recent day's context for today's forecast
    if ops:
        latest      = max(ops, key=lambda x: x.get("date", ""))
        today_day   = latest.get("day", "Friday")
        today_wx    = latest.get("weather", "Sunny")
        today_promo = latest.get("promotion", 0)
    else:
        today_day, today_wx, today_promo = "Friday", "Sunny", 1

    rows = []
    for item in source_items:
        rows.append({
            "menu_item":   item["menu"],
            "category":    item["category"],
            "day_of_week": today_day,
            "weather":     today_wx,
            "promotion":   today_promo,
        })
    return pd.DataFrame(rows)
