// Recharts fallback for simple chart rendering
import React from 'react';

export const LineChart = ({ children, ...props }: any) => 
  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    Chart would render here
  </div>;

export const BarChart = ({ children, ...props }: any) => 
  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    Chart would render here
  </div>;

export const PieChart = ({ children, ...props }: any) => 
  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    Chart would render here
  </div>;

export const AreaChart = ({ children, ...props }: any) => 
  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    Area chart would render here
  </div>;

export const RadialBarChart = ({ children, ...props }: any) => 
  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    Radial bar chart would render here
  </div>;

export const XAxis = ({ ...props }: any) => null;
export const YAxis = ({ ...props }: any) => null;
export const CartesianGrid = ({ ...props }: any) => null;
export const Tooltip = ({ ...props }: any) => null;
export const Legend = ({ ...props }: any) => null;
export const Line = ({ ...props }: any) => null;
export const Bar = ({ ...props }: any) => null;
export const Area = ({ ...props }: any) => null;
export const RadialBar = ({ ...props }: any) => null;
export const Cell = ({ ...props }: any) => null;
export const ReferenceLine = ({ ...props }: any) => null;
export const ResponsiveContainer = ({ children, ...props }: any) => 
  <div className="w-full h-full">{children}</div>;

// Additional chart components for compliance dashboard
export const RadarChart = ({ children, ...props }: any) => 
  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    Radar chart would render here
  </div>;

export const Radar = ({ ...props }: any) => null;
export const PolarGrid = ({ ...props }: any) => null;
export const PolarAngleAxis = ({ ...props }: any) => null;
export const PolarRadiusAxis = ({ ...props }: any) => null;

// For service analytics
export const Pie = ({ ...props }: any) => null;