from mock_datas import (
    company_profile,
    get_effective_daily_operations,  # uses real data when injected, else mock
    menu_sales,
    utility_rates,
    carbon_factors,
    industry_benchmarks,
)


class AnalyticsEngine:
    def __init__(self):
        self.company    = company_profile
        self.daily_data = get_effective_daily_operations()  # real or mock list
        self.menu_sales = menu_sales
        self.rates      = utility_rates
        self.carbon     = carbon_factors
        self.benchmarks = industry_benchmarks

    # ── Basic totals ──────────────────────────────────────────────────────────
    def calculate_totals(self):
        total_customers   = sum(day["customers"]     for day in self.daily_data)
        total_food_waste  = sum(day["food_waste_kg"] for day in self.daily_data)
        total_electricity = sum(day["electricity_kwh"] for day in self.daily_data)
        total_water       = sum(day["water_m3"]      for day in self.daily_data)
        total_gas         = sum(day["gas_m3"]        for day in self.daily_data)
        total_revenue     = sum(day["revenue"]       for day in self.daily_data)

        return {
            "total_customers":      total_customers,
            "total_food_waste_kg":  round(total_food_waste,  2),
            "total_electricity_kwh":round(total_electricity, 2),
            "total_water_m3":       round(total_water,       2),
            "total_gas_m3":         round(total_gas,         2),
            "total_revenue":        round(total_revenue,     2),
        }

    # ── Cost calculation ──────────────────────────────────────────────────────
    def calculate_costs(self):
        t = self.calculate_totals()
        electricity_cost = t["total_electricity_kwh"] * self.rates["electricity_price_per_kwh"]
        water_cost       = t["total_water_m3"]        * self.rates["water_price_per_m3"]
        gas_cost         = t["total_gas_m3"]          * self.rates["gas_price_per_m3"]
        waste_cost       = t["total_food_waste_kg"]   * self.rates["food_waste_disposal_per_kg"]

        return {
            "electricity_cost":         round(electricity_cost, 2),
            "water_cost":               round(water_cost,       2),
            "gas_cost":                 round(gas_cost,         2),
            "food_waste_disposal_cost": round(waste_cost,       2),
            "total_operating_cost":     round(electricity_cost + water_cost + gas_cost + waste_cost, 2),
        }

    # ── Carbon emissions ──────────────────────────────────────────────────────
    def calculate_carbon_emissions(self):
        t = self.calculate_totals()
        elec_co2  = t["total_electricity_kwh"] * self.carbon["electricity"]
        water_co2 = t["total_water_m3"]        * self.carbon["water"]
        gas_co2   = t["total_gas_m3"]          * self.carbon["gas"]
        waste_co2 = t["total_food_waste_kg"]   * self.carbon["food_waste"]

        return {
            "electricity_co2_kg": round(elec_co2,  2),
            "water_co2_kg":       round(water_co2, 2),
            "gas_co2_kg":         round(gas_co2,   2),
            "food_waste_co2_kg":  round(waste_co2, 2),
            "total_co2_kg":       round(elec_co2 + water_co2 + gas_co2 + waste_co2, 2),
        }

    # ── Efficiency metrics ────────────────────────────────────────────────────
    def calculate_efficiency_metrics(self):
        t = self.calculate_totals()
        c = t["total_customers"]
        if c == 0:
            return {"electricity_per_customer": 0, "water_per_customer": 0,
                    "gas_per_customer": 0, "food_waste_per_customer_kg": 0}

        return {
            "electricity_per_customer":    round(t["total_electricity_kwh"] / c, 2),
            "water_per_customer":          round(t["total_water_m3"]        / c, 3),
            "gas_per_customer":            round(t["total_gas_m3"]          / c, 3),
            "food_waste_per_customer_kg":  round(t["total_food_waste_kg"]   / c, 3),
        }

    # ── Menu waste analysis ───────────────────────────────────────────────────
    def analyze_menu_waste(self):
        results = []
        for item in self.menu_sales:
            prepared    = item["prepared_qty"]
            leftover    = item["leftover_qty"]
            waste_pct   = (leftover / prepared) * 100 if prepared else 0
            lost_value  = leftover * item["food_cost"]
            results.append({
                "menu":                item["menu"],
                "category":            item["category"],
                "prepared_qty":        prepared,
                "sold_qty":            item["sold_qty"],
                "leftover_qty":        leftover,
                "waste_percent":       round(waste_pct,   2),
                "estimated_lost_value":round(lost_value,  2),
            })
        results.sort(key=lambda x: x["waste_percent"], reverse=True)
        return results

    # ── Trend analysis ────────────────────────────────────────────────────────
    def calculate_trends(self):
        data = self.daily_data
        mid  = max(1, len(data) // 2)
        first_half  = data[:mid]
        second_half = data[mid:] or data  # guard empty second half

        def avg(d, key):
            return sum(row[key] for row in d) / len(d) if d else 0

        return {
            "food_waste_trend_percent":  round(self._pct_change(avg(first_half, "food_waste_kg"),  avg(second_half, "food_waste_kg")),  2),
            "electricity_trend_percent": round(self._pct_change(avg(first_half, "electricity_kwh"),avg(second_half, "electricity_kwh")), 2),
            "water_trend_percent":       round(self._pct_change(avg(first_half, "water_m3"),        avg(second_half, "water_m3")),        2),
            "revenue_trend_percent":     round(self._pct_change(avg(first_half, "revenue"),         avg(second_half, "revenue")),         2),
        }

    def _pct_change(self, old, new):
        return ((new - old) / old) * 100 if old else 0

    # ── ESG score ─────────────────────────────────────────────────────────────
    def calculate_esg_score(self):
        eff   = self.calculate_efficiency_metrics()
        score = 100

        if eff["electricity_per_customer"]   > self.benchmarks["average_electricity_per_customer"]:
            score -= 10
        if eff["water_per_customer"]         > self.benchmarks["average_water_per_customer"]:
            score -= 10
        if eff["gas_per_customer"]           > self.benchmarks["average_gas_per_customer"]:
            score -= 8
        if eff["food_waste_per_customer_kg"] > 0.15:
            score -= 12

        rating = (
            "Excellent"         if score >= 85 else
            "Good"              if score >= 70 else
            "Needs Improvement" if score >= 55 else
            "Poor"
        )
        return {"esg_score": score, "rating": rating}

    # ── Benchmark comparison ──────────────────────────────────────────────────
    def compare_with_benchmarks(self):
        eff = self.calculate_efficiency_metrics()
        return {
            "electricity_status": "Above benchmark" if eff["electricity_per_customer"]   > self.benchmarks["average_electricity_per_customer"] else "Good",
            "water_status":       "Above benchmark" if eff["water_per_customer"]         > self.benchmarks["average_water_per_customer"]        else "Good",
            "gas_status":         "Above benchmark" if eff["gas_per_customer"]           > self.benchmarks["average_gas_per_customer"]          else "Good",
            "food_waste_status":  "High"            if eff["food_waste_per_customer_kg"] > 0.15                                                 else "Good",
        }

    # ── Full report ───────────────────────────────────────────────────────────
    def generate_report(self):
        return {
            "company":              self.company,
            "totals":               self.calculate_totals(),
            "costs":                self.calculate_costs(),
            "carbon_emissions":     self.calculate_carbon_emissions(),
            "efficiency_metrics":   self.calculate_efficiency_metrics(),
            "menu_waste_analysis":  self.analyze_menu_waste(),
            "trends":               self.calculate_trends(),
            "benchmark_comparison": self.compare_with_benchmarks(),
            "esg":                  self.calculate_esg_score(),
        }


if __name__ == "__main__":
    engine = AnalyticsEngine()
    report = engine.generate_report()
    print("\n===== WASTEGUARD ANALYTICS REPORT =====\n")
    for key, value in report.items():
        print(f"\n{key.upper()}:")
        if isinstance(value, list):
            for item in value:
                print(" ", item)
        else:
            print(" ", value)
