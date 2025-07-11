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

export const XAxis = ({ ...props }: any) => null;
export const YAxis = ({ ...props }: any) => null;
export const CartesianGrid = ({ ...props }: any) => null;
export const Tooltip = ({ ...props }: any) => null;
export const Legend = ({ ...props }: any) => null;
export const Line = ({ ...props }: any) => null;
export const Bar = ({ ...props }: any) => null;
export const Cell = ({ ...props }: any) => null;
export const ResponsiveContainer = ({ children, ...props }: any) => 
  <div className="w-full h-full">{children}</div>;