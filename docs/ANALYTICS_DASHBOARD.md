# Advanced Analytics Dashboard

## Overview
The 6FB Platform now includes a comprehensive analytics dashboard with real-time data visualization, advanced metrics, and export capabilities.

## Features

### 1. Real-Time Data Visualization
- **Revenue Charts**: Track revenue trends with daily, weekly, and monthly views
- **Booking Analytics**: Monitor booking patterns, completion rates, and cancellations
- **Service Performance**: Analyze service popularity and profitability
- **Client Retention**: Track client loyalty and visit frequency
- **Peak Hours Heatmap**: Identify busy times for better scheduling
- **Team Comparison**: Compare barber performance across metrics

### 2. Key Performance Indicators (KPIs)
- Total Revenue with growth percentage
- Booking volume and trends
- Active client count
- Average booking value
- Utilization rate
- Client retention rate

### 3. Interactive Charts
Built with Recharts for smooth, responsive visualizations:
- Area charts for revenue trends
- Bar charts for booking status
- Pie charts for service distribution
- Radar charts for skill analysis
- Heatmaps for peak hours
- Horizontal bar charts for leaderboards

### 4. Date Range Selection
- Quick ranges: Today, Last 7 days, Last 30 days, This month
- Custom date range picker
- Real-time data refresh

### 5. Export Functionality
Export analytics data in multiple formats:
- **CSV**: Raw data for Excel analysis
- **PDF**: Formatted reports with charts (coming soon)
- **Excel**: Multi-sheet workbooks (coming soon)

## Components

### Dashboard Structure
```
/analytics
├── AnalyticsDashboard.tsx    # Main dashboard container
├── RevenueChart.tsx          # Revenue trends and breakdowns
├── BookingTrendsChart.tsx    # Booking status analytics
├── PerformanceMetrics.tsx    # KPI cards with progress
├── ServiceAnalytics.tsx      # Service performance analysis
├── ClientRetentionChart.tsx  # Retention and cohort analysis
├── PeakHoursHeatmap.tsx      # Busy hours visualization
├── BarberComparison.tsx      # Team performance comparison
├── DateRangePicker.tsx       # Date selection component
└── ExportButton.tsx          # Data export functionality
```

### API Endpoints

#### Revenue Analytics
```
GET /api/v1/analytics/revenue?start_date=2024-01-01&end_date=2024-01-31
```
Returns daily revenue breakdown by services, products, and tips.

#### Booking Analytics
```
GET /api/v1/analytics/bookings?start_date=2024-01-01&end_date=2024-01-31
```
Returns booking counts by status (completed, cancelled, no-show, pending).

#### Performance Metrics
```
GET /api/v1/analytics/metrics?start_date=2024-01-01&end_date=2024-01-31
```
Returns aggregated KPIs and performance insights.

#### Service Analytics
```
GET /api/v1/analytics/services?start_date=2024-01-01&end_date=2024-01-31
```
Returns service-level performance data.

#### Retention Analytics
```
GET /api/v1/analytics/retention?start_date=2024-01-01&end_date=2024-01-31
```
Returns client retention metrics and cohort analysis.

#### Peak Hours
```
GET /api/v1/analytics/peak-hours?start_date=2024-01-01&end_date=2024-01-31
```
Returns hourly booking distribution by day of week.

#### Barber Comparison
```
GET /api/v1/analytics/barber-comparison?start_date=2024-01-01&end_date=2024-01-31
```
Returns comparative performance metrics for all barbers.

#### Export Data
```
GET /api/v1/analytics/export?format=csv&start_date=2024-01-01&end_date=2024-01-31
```
Exports analytics data in specified format.

## Usage

### Accessing the Dashboard
Navigate to `/analytics` in the application to access the full analytics dashboard.

### Viewing Different Metrics
Use the tab navigation to switch between:
- Revenue analysis
- Booking trends
- Service performance
- Client retention
- Team comparison

### Changing Date Ranges
1. Click the date range picker
2. Select a quick range or custom dates
3. Data automatically refreshes

### Exporting Data
1. Click the Export button
2. Choose format (CSV, PDF, Excel)
3. File downloads automatically

## Real-Time Updates
The dashboard integrates with WebSocket for real-time updates:
- Revenue changes appear instantly
- New bookings update charts automatically
- Performance metrics refresh in real-time

## Performance Considerations
- Data is aggregated on the backend for efficiency
- Charts use virtualization for large datasets
- Caching implemented for frequently accessed metrics
- WebSocket updates are throttled to prevent overload

## Security
- All endpoints require authentication
- Role-based access control enforced
- Location-based data filtering for non-admin users
- Sensitive financial data protected

## Future Enhancements
1. **Predictive Analytics**: ML-based forecasting
2. **Custom Reports**: User-defined report templates
3. **Mobile App Integration**: Native mobile analytics
4. **Advanced Filters**: Multi-dimensional filtering
5. **Scheduled Reports**: Automated email reports
6. **Benchmarking**: Industry comparison data
7. **Goal Setting**: Target vs actual tracking
8. **Alerts**: Threshold-based notifications