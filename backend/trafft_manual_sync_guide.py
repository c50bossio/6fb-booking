#!/usr/bin/env python3
"""
Manual data export guide for Trafft
Since the API isn't working, here's how to manually export data
"""

print("📋 Trafft Manual Data Export Guide")
print("=" * 50)
print("\nSince the API authentication is returning HTML instead of JSON,")
print("you'll need to manually export data from the Trafft dashboard.")
print("\n🔍 Steps to Export Data from Trafft Dashboard:\n")

print("1. **Appointments Export:**")
print("   - Go to Appointments section")
print("   - Look for Export/Download button (usually CSV or Excel)")
print("   - Export last 30-90 days of appointments")
print("   - Save as: trafft_appointments.csv")

print("\n2. **Customers Export:**")
print("   - Go to Customers section")
print("   - Export all customers")
print("   - Save as: trafft_customers.csv")

print("\n3. **Services Export:**")
print("   - Go to Services section")
print("   - Take screenshots or manually note:")
print("     - Service names")
print("     - Service prices")
print("     - Service durations")
print("   - Save as: trafft_services.csv")

print("\n4. **Employees/Barbers Export:**")
print("   - Go to Employees section")
print("   - Export or manually note:")
print("     - Employee names")
print("     - Employee schedules")
print("   - Save as: trafft_employees.csv")

print("\n5. **Locations Export:**")
print("   - Go to Locations section")
print("   - Export or note all locations")
print("   - Save as: trafft_locations.csv")

print("\n" + "=" * 50)
print("\n📤 Once you have the CSV files, we can:")
print("1. Create import scripts to load data into your database")
print("2. Calculate 6FB metrics from the imported data")
print("3. Set up a manual sync process until API access is fixed")

print("\n💡 Alternative: Browser Automation")
print("We could also create a Selenium script to automatically")
print("log in and export data periodically if manual export becomes tedious.")

print("\n🚀 Next Steps:")
print("1. Export the CSV files from Trafft dashboard")
print("2. Place them in the /backend/data/ folder")
print("3. Run the import scripts to sync with your database")

# Create data folder
import os
data_dir = "data"
if not os.path.exists(data_dir):
    os.makedirs(data_dir)
    print(f"\n✅ Created {data_dir}/ folder for CSV imports")