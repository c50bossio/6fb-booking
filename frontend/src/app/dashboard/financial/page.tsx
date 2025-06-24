'use client';

import React, { useState, useEffect } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { BarberEarningsOverview } from '@/components/financial/BarberEarningsOverview';
// import { ShopOwnerDashboard } from '@/components/financial/ShopOwnerDashboard';
// import { PayoutHistory } from '@/components/financial/PayoutHistory';
// import { CompensationPlanManager } from '@/components/financial/CompensationPlanManager';
// import { FinancialReports } from '@/components/financial/FinancialReports';
import { DollarSign, TrendingUp, Calendar, Settings, Crown, Flame } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FinancialDashboard() {
  // const { user } = useAuth();
  const user = { role: 'shop_owner' }; // Temporary placeholder
  const [activeTab, setActiveTab] = useState('overview');

  // Determine user role and show appropriate views
  const isShopOwner = user?.role === 'shop_owner' || user?.role === 'super_admin';
  const isBarber = user?.role === 'barber';

  useEffect(() => {
    // Set default tab based on user role
    if (isShopOwner) {
      setActiveTab('shop-overview');
    } else if (isBarber) {
      setActiveTab('earnings');
    }
  }, [isShopOwner, isBarber]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Financial Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track earnings, manage payouts, and monitor financial performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {isShopOwner && (
            <TabsTrigger value="shop-overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Shop Overview
            </TabsTrigger>
          )}
          {(isBarber || isShopOwner) && (
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {isBarber ? 'My Earnings' : 'Barber Earnings'}
            </TabsTrigger>
          )}
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Payout History
          </TabsTrigger>
          {isShopOwner && (
            <TabsTrigger value="compensation" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Compensation Plans
            </TabsTrigger>
          )}
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {isShopOwner && (
          <TabsContent value="shop-overview" className="space-y-4">
            <Card className="p-6">
              <p>Shop Owner Dashboard - Coming Soon</p>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="earnings" className="space-y-4">
          {isBarber ? (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">My Earnings Dashboard</h2>
                  <Button
                    onClick={() => {
                      // TODO: Replace with actual user barber ID from auth context
                      const barberId = user?.barber_id || '1'; // Fallback to 1 for demo
                      window.location.href = `/dashboard/barber/${barberId}`;
                    }}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Open Premium Dashboard
                  </Button>
                </div>
                <p className="text-gray-600 mb-4">
                  Access your comprehensive earnings analytics, goals tracking, achievements, and insights.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Today's Earnings</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 mt-2">$285.50</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Week Progress</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 mt-2">96.7%</p>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Flame className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Current Streak</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-600 mt-2">5 days</p>
                    </CardContent>
                  </Card>
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">All Barber Earnings</h2>
                <p className="text-gray-600 mb-4">
                  Monitor and manage earnings across all barbers in your shop.
                </p>
                <div className="space-y-3">
                  {[
                    { name: "Marcus Johnson", earnings: "$1,450.75", streak: "5 days", status: "active" },
                    { name: "DeAndre Williams", earnings: "$1,285.00", streak: "3 days", status: "active" },
                    { name: "Carlos Rodriguez", earnings: "$1,125.50", streak: "7 days", status: "active" },
                    { name: "Jamal Thompson", earnings: "$965.25", streak: "2 days", status: "active" }
                  ].map((barber, index) => (
                    <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {barber.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h3 className="font-medium">{barber.name}</h3>
                            <p className="text-sm text-gray-600">Week: {barber.earnings}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">🔥 {barber.streak}</p>
                            <p className="text-xs text-gray-600">goal streak</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Replace with actual barber ID from barber data
                              const barberId = index + 1; // Temporary mapping for demo
                              window.location.href = `/dashboard/barber/${barberId}`;
                            }}
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            View Dashboard
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <Card className="p-6">
            <p>Payout History - Coming Soon</p>
          </Card>
        </TabsContent>

        {isShopOwner && (
          <TabsContent value="compensation" className="space-y-4">
            <Card className="p-6">
              <p>Compensation Plan Manager - Coming Soon</p>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="reports" className="space-y-4">
          <Card className="p-6">
            <p>Financial Reports - Coming Soon</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
