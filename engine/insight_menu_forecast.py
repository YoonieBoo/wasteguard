import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from mock_datas import (
    get_sales_history,
    get_today_input,
    get_menu_items
)


def create_menu_training_data():
    sales = get_sales_history()
    menu = get_menu_items()

    if sales is None or sales.empty:
         return pd.DataFrame()

    if menu is None or menu.empty:
         return pd.DataFrame()

    df = sales.merge(
        menu[["menu_item", "category"]],
        on="menu_item",
        how="left"
    )

    return df


def train_menu_forecast_model():
    df = create_menu_training_data()

    if df is None or df.empty:
         return None 

    features = [
        "menu_item",
        "category",
        "day_of_week",
        "weather",
        "promotion"
    ]

    target = "sold_quantity"

    required_columns = features + [target]

    missing_columns = [
         column 
         for column in required_columns
         if column not in df.columns 
    ]

    X = df[features]
    y = df[target]

    categorical_features = [
        "menu_item",
        "category",
        "day_of_week",
        "weather"
    ]

    numeric_features = ["promotion"]

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


def get_menu_comparison_data():
    sales = get_sales_history()
    sales["date"] = pd.to_datetime(sales["date"])

    rows = []

    for item in sales["menu_item"].unique():
        item_sales = sales[sales["menu_item"] == item].sort_values("date")

        yesterday_sales = int(item_sales["sold_quantity"].iloc[-1])
        seven_day_average = round(item_sales["sold_quantity"].tail(7).mean())
        thirty_day_average = round(item_sales["sold_quantity"].tail(30).mean())

        previous_average = item_sales["sold_quantity"].head(3).mean()
        recent_average = item_sales["sold_quantity"].tail(3).mean()

        if previous_average == 0:
            trend_percent = 0
        else:
            trend_percent = round(((recent_average - previous_average) / previous_average) * 100)

        rows.append({
            "menu_item": item,
            "yesterday_sales": yesterday_sales,
            "seven_day_average": int(seven_day_average),
            "thirty_day_average": int(thirty_day_average),
            "trend_percent": int(trend_percent),
        })

    return pd.DataFrame(rows)


def generate_menu_demand_forecast():

        today = get_today_input()
        menu = get_menu_items() 

        # No real per-dish input -> not generate a mock forecast 
        if today is None or today.empty:
             return pd.DataFrame()

        # if no Real Menu -> Break
        if menu is None or menu.empty :
             return pd.DataFrame()

        model = train_menu_forecast_model()

        if model is None : 
             return pd.DataFrame()

        today["ai_forecast"] = model.predict(today).round().astype(int)

        comparison = get_menu_comparison_data()

        result = today.merge(comparison, on="menu_item", how="left")

        result = result.merge(menu, on=["menu_item", "category"], how="left")
        return result