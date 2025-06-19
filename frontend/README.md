# 6FB Booking Platform - Frontend

A Next.js frontend for the Six Figure Barber booking platform that integrates with Trafft and automates the proven 6FB methodology.

## 🚀 Phase 1 Complete

### ✅ Features Implemented

- **6FB Dashboard Layout**: Comprehensive dashboard matching current spreadsheet functionality
- **Key Metrics Cards**: Daily and weekly performance indicators
- **6FB Score Display**: Visual representation of overall business performance with component breakdown
- **Weekly Comparison**: Current week vs previous week analytics with growth indicators
- **Daily Appointments**: Today's schedule with appointment management
- **Revenue Breakdown**: Service revenue, tips, and product sales visualization

### 🛠️ Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand (ready for implementation)
- **Charts**: Recharts (ready for implementation)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

### 📁 Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles with CSS variables
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main dashboard page
├── components/
│   ├── dashboard/           # Dashboard-specific components
│   │   ├── SixFBDashboard.tsx    # Main dashboard container
│   │   ├── DashboardHeader.tsx   # Header with branding and nav
│   │   ├── MetricsCards.tsx      # Key performance metrics
│   │   ├── SixFBScore.tsx        # 6FB score visualization
│   │   ├── WeeklyComparison.tsx  # Week-over-week analysis
│   │   └── DailyAppointments.tsx # Today's schedule
│   └── ui/                  # Reusable UI components
│       ├── button.tsx       # Button component
│       ├── card.tsx         # Card components
│       └── badge.tsx        # Badge component
└── lib/
    └── utils.ts             # Utility functions
```

### 🎨 Design System

- **Color Scheme**: Professional blue/purple gradient with clean whites and grays
- **Typography**: Clear hierarchy with emphasis on key metrics
- **Components**: Consistent shadcn/ui design system
- **Responsiveness**: Mobile-first responsive design

### 📊 Dashboard Features

#### 6FB Score Card
- Overall performance score (0-100)
- Letter grade (A+ to F)
- Component breakdown:
  - Booking Utilization
  - Revenue Growth
  - Customer Retention
  - Average Ticket
  - Service Quality

#### Metrics Cards
- Today's appointments and booking rate
- Today's revenue and average ticket
- Weekly performance with growth indicators
- Customer type breakdown (new vs returning)

#### Weekly Comparison
- Revenue comparison with previous week
- Appointment count changes
- Revenue breakdown by source
- Customer acquisition metrics

#### Daily Appointments
- Complete today's schedule
- Appointment status tracking
- Customer type identification
- Revenue per appointment
- Quick check-in functionality

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 🔗 API Integration (Ready for Phase 2)

The frontend is structured to easily integrate with the FastAPI backend:

- API service layer ready for implementation
- TypeScript interfaces for data models
- Error handling and loading states prepared
- Real-time updates architecture planned

## 🔮 Next Steps (Phase 2)

1. **API Integration**: Connect to FastAPI backend
2. **Authentication**: User login and session management
3. **Real-time Updates**: Live data from Trafft webhooks
4. **Data Entry Forms**: Manual appointment entry interface
5. **Client Management**: Customer profiles and history
6. **Trafft Setup**: API configuration and sync status

## 📝 Notes

- Currently using mock data for demonstration
- All components are TypeScript with proper type definitions
- Responsive design optimized for desktop and mobile
- Ready for backend API integration
- Follows 6FB methodology and current spreadsheet structure# Build trigger
