from sklearn.ensemble import IsolationForest

from mock_datas import get_daily_operations


def detect_unusual_patterns():
    df = get_daily_operations()

    features = [
        "customer_count",
        "occupancy_rate",
        "buffet_prepared_kg",
        "food_waste_kg",
        "electricity_kwh",
        "water_liters",
        "gas_kg",
        "revenue_thb"
    ]

    X = df[features]

    model = IsolationForest(
        contamination=0.10,
        random_state=42
    )

    df["anomaly_result"] = model.fit_predict(X)

    anomalies = df[df["anomaly_result"] == -1].copy()

    results = []

    for _, row in anomalies.iterrows():
        possible_reasons = []

        if row["food_waste_kg"] > df["food_waste_kg"].mean() * 1.25:
            possible_reasons.append("Food waste is unusually high")

        if row["electricity_kwh"] > df["electricity_kwh"].mean() * 1.15:
            possible_reasons.append("Electricity usage is unusually high")

        if row["water_liters"] > df["water_liters"].mean() * 1.15:
            possible_reasons.append("Water usage is unusually high")

        if row["gas_kg"] > df["gas_kg"].mean() * 1.15:
            possible_reasons.append("Gas usage is unusually high")

        if row["customer_count"] < df["customer_count"].mean() * 0.80:
            possible_reasons.append("Customer count is lower than usual")

        results.append({
            "date": row["date"],
            "day_of_week": row["day_of_week"],
            "weather": row["weather"],
            "customer_count": int(row["customer_count"]),
            "food_waste_kg": float(row["food_waste_kg"]),
            "electricity_kwh": float(row["electricity_kwh"]),
            "water_liters": float(row["water_liters"]),
            "gas_kg": float(row["gas_kg"]),
            "possible_reasons": possible_reasons
        })

    return results