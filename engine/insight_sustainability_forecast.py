import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from mock_datas import get_daily_operations


def create_sustainability_training_data():
    df = get_daily_operations()
    df["date"] = pd.to_datetime(df["date"])

    return df


def train_sustainability_forecast_model(target_column):
    df = create_sustainability_training_data()

    features = [
        "day_of_week",
        "weather",
        "is_weekend",
        "promotion",
        "occupancy_rate",
        "customer_count",
        "buffet_prepared_kg",
        "revenue_thb"
    ]

    X = df[features]
    y = df[target_column]

    categorical_features = [
        "day_of_week",
        "weather"
    ]

    numeric_features = [
        "is_weekend",
        "promotion",
        "occupancy_rate",
        "customer_count",
        "buffet_prepared_kg",
        "revenue_thb"
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ("numeric", "passthrough", numeric_features)
        ]
    )

    model = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", RandomForestRegressor(
            n_estimators=200,
            random_state=42
        ))
    ])

    model.fit(X, y)

    return model


def get_future_business_input():
    return pd.DataFrame([
        {
            "day_of_week": "Friday",
            "weather": "Sunny",
            "is_weekend": 0,
            "promotion": 1,
            "occupancy_rate": 85,
            "customer_count": 165,
            "buffet_prepared_kg": 115,
            "revenue_thb": 56000
        }
    ])


def generate_sustainability_forecast():
    future_input = get_future_business_input()

    target_columns = [
        "food_waste_kg",
        "electricity_kwh",
        "water_liters",
        "gas_kg"
    ]

    predictions = {}

    for target in target_columns:
        model = train_sustainability_forecast_model(target)
        prediction = model.predict(future_input)[0]
        predictions[target] = round(float(prediction), 2)

    return {
        "future_input": future_input.to_dict(orient="records")[0],
        "predictions": {
            "predicted_food_waste_kg": predictions["food_waste_kg"],
            "predicted_electricity_kwh": predictions["electricity_kwh"],
            "predicted_water_liters": predictions["water_liters"],
            "predicted_gas_kg": predictions["gas_kg"]
        }
    }