from mock_datas import (
    company_profile,
    daily_operations,
    menu_sales,
    utility_rates,
    carbon_factors,
    industry_benchmarks
)

class AnalyticsEngine: 
    def __init__(self):
        self.company = company_profile
        self.daily_data = daily_operations
        self.menu_sales = menu_sales
        self.rates = utility_rates
        self.carbon = carbon_factors
        self.benchmarks = industry_benchmarks 

    # Basic totals
    def calculate_totals(self) :
        total_customers = sum(day["customers"] for day in self.daily_data)
        total_food_waste = sum(day["food_waste_kg"] for day in self.daily_data)
        total_electricity = sum(day["electricity_kwh"] for day in self.daily_data)
        total_water = sum(day["water_m3"] for day in self.daily_data)
        total_gas = sum(day["gas_m3"] for day in self.daily_data)
        total_revenue = sum(day["revenue"] for day in self.daily_data)

        return {
            "total_customers": total_customers,
            "total_food_waste_kg": round(total_food_waste, 2),
            "total_electricity_kwh": round(total_electricity, 2),
            "total_water_m3": round(total_water, 2),
            "total_gas_m3": round(total_gas, 2),
            "total_revenue": round(total_revenue, 2)
        }
    
    # Cost Calculation
    def calculate_costs(self):
        totals = self.calculate_totals()
        electricity_cost = totals["total_electricity_kwh"] * self.rates["electricity_price_per_kwh"]
        water_cost = totals["total_water_m3"] * self.rates["water_price_per_m3"]
        gas_cost = totals["total_gas_m3"] * self.rates["gas_price_per_m3"]
        waste_cost = totals["total_food_waste_kg"] * self.rates["food_waste_disposal_per_kg"]
        total_operating_cost = electricity_cost + water_cost + gas_cost + waste_cost

        return {
            "electricity_cost": round(electricity_cost, 2),
            "water_cost": round(water_cost, 2),
            "gas_cost": round(gas_cost, 2),
            "food_waste_disposal_cost": round(waste_cost, 2),
            "total_operating_cost": round(total_operating_cost, 2)
        }
    
    # Carbon Emissions 
    def calculate_carbon_emissions(self):
    
        totals = self.calculate_totals()
        electricity_co2 = totals["total_electricity_kwh"] * self.carbon["electricity"]
        water_co2 = totals["total_water_m3"] * self.carbon["water"]
        gas_co2 = totals["total_gas_m3"] * self.carbon["gas"]
        food_waste_co2 = totals["total_food_waste_kg"] * self.carbon["food_waste"]
        total_co2 = electricity_co2 + water_co2 + gas_co2 + food_waste_co2

        return {
            "electricity_co2_kg": round(electricity_co2, 2),
            "water_co2_kg": round(water_co2, 2),
            "gas_co2_kg": round(gas_co2, 2),
            "food_waste_co2_kg": round(food_waste_co2, 2),
            "total_co2_kg": round(total_co2, 2)
        }
    
    # Efficiency Metrics 
    def calculate_efficiency_metrics(self):
    
        totals = self.calculate_totals()
        customers = totals["total_customers"]
        electricity_per_customer = totals["total_electricity_kwh"] / customers
        water_per_customer = totals["total_water_m3"] / customers
        gas_per_customer = totals["total_gas_m3"] / customers
        waste_per_customer = totals["total_food_waste_kg"] / customers

        return {
            "electricity_per_customer": round(electricity_per_customer, 2),
            "water_per_customer": round(water_per_customer, 3),
            "gas_per_customer": round(gas_per_customer, 3),
            "food_waste_per_customer_kg": round(waste_per_customer, 3)
        }
    
    # Menu Waste Analysis
    def analyze_menu_waste(self):
    
        results = []

        for item in self.menu_sales:
            prepared = item["prepared_qty"]
            leftover = item["leftover_qty"]
            waste_percent = (leftover / prepared) * 100
            lost_value = leftover * item["food_cost"]

            results.append({
                "menu": item["menu"],
                "category": item["category"],
                "prepared_quantity": prepared,
                "sold_qty": item["sold_qty"],
                "leftover_qty": leftover,
                "waste_percent": round(waste_percent, 2),
                "estimated_lost_value": round(lost_value, 2)
            })

        results.sort(key=lambda x: x["waste_percent"], reverse=True)
        return results
    
    # Trend Analysis
    def calculate_trends(self):
        first_half = self.daily_data[:len(self.daily_data)//2]
        second_half = self.daily_data[len(self.daily_data)//2:]

        def average(data, key):
            return sum(day[key] for day in data) / len(data)

        food_waste_change = self._percentage_change(
            average(first_half, "food_waste_kg"),
            average(second_half, "food_waste_kg")
        )

        electricity_change = self._percentage_change(
            average(first_half, "electricity_kwh"),
            average(second_half, "electricity_kwh")
        )

        water_change = self._percentage_change(
            average(first_half, "water_m3"),
            average(second_half, "water_m3")
        )

        revenue_change = self._percentage_change(
            average(first_half, "revenue"),
            average(second_half, "revenue")
        )

        return {
            "food_waste_trend_percent": round(food_waste_change, 2),
            "electricity_trend_percent": round(electricity_change, 2),
            "water_trend_percent": round(water_change, 2),
            "revenue_trend_percent": round(revenue_change, 2)
        }

    def _percentage_change(self, old, new):

        if old == 0:
            return 0
        return ((new - old) / old) * 100
    
    # ESG Score 
    def calculate_esg_score(self):
        efficiency = self.calculate_efficiency_metrics()
        score = 100

        if efficiency["electricity_per_customer"] > self.benchmarks["average_electricity_per_customer"]:
            score -= 10

        if efficiency["water_per_customer"] > self.benchmarks["average_water_per_customer"]:
            score -= 10

        if efficiency["gas_per_customer"] > self.benchmarks["average_gas_per_customer"]:
            score -= 8

        if efficiency["food_waste_per_customer_kg"] > 0.15:
            score -= 12

        if score >= 85:
            rating = "Excellent"

        elif score >= 70:
            rating = "Good"

        elif score >= 55:
            rating = "Needs Improvement"

        else:
            rating = "Poor"

        return {
            "esg_score": score,
            "rating": rating
        }
    
    # Benchmark Comparison
    def compare_with_benchmarks(self):
        efficiency = self.calculate_efficiency_metrics()

        return {
            "electricity_status": "Above benchmark" if efficiency["electricity_per_customer"] > self.benchmarks["average_electricity_per_customer"] else "Good",
            "water_status": "Above benchmark" if efficiency["water_per_customer"] > self.benchmarks["average_water_per_customer"] else "Good",
            "gas_status": "Above benchmark" if efficiency["gas_per_customer"] > self.benchmarks["average_gas_per_customer"] else "Good",
            "food_waste_status": "High" if efficiency["food_waste_per_customer_kg"] > 0.15 else "Good"
        }
    
    # Full Analytics Report 
    def generate_report(self):
        return {
            "company": self.company,
            "totals": self.calculate_totals(),
            "costs": self.calculate_costs(),
            "carbon_emissions": self.calculate_carbon_emissions(),
            "efficiency_metrics": self.calculate_efficiency_metrics(),
            "menu_waste_analysis": self.analyze_menu_waste(),
            "trends": self.calculate_trends(),
            "benchmark_comparison": self.compare_with_benchmarks(),
            "esg": self.calculate_esg_score()
        }

# Testing
if __name__ == "__main__":
    engine = AnalyticsEngine()
    report = engine.generate_report()

    print("\n===== WASTEGUARD ANALYTICS REPORT =====\n")
    print("Company:")
    print(report["company"])
    print("\nTotals:")
    print(report["totals"])
    print("\nCosts:")
    print(report["costs"])
    print("\nCarbon Emissions:")
    print(report["carbon_emissions"])
    print("\nEfficiency Metrics:")
    print(report["efficiency_metrics"])
    print("\nMenu Waste Analysis:")

    for item in report["menu_waste_analysis"]:
        print(item)

    print("\nTrends:")
    print(report["trends"])
    print("\nBenchmark Comparison:")
    print(report["benchmark_comparison"])
    print("\nESG Score:")
    print(report["esg"])