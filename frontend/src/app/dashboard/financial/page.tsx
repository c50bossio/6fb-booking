'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarberEarningsOverview } from '@/components/financial/BarberEarningsOverview';
import { ShopOwnerDashboard } from '@/components/financial/ShopOwnerDashboard';
import { PayoutHistory } from '@/components/financial/PayoutHistory';
import { CompensationPlanManager } from '@/components/financial/CompensationPlanManager';
import { FinancialReports } from '@/components/financial/FinancialReports';
import { DollarSign, TrendingUp, Calendar, Settings } from 'lucide-react';

export default function FinancialDashboard() {
  const { user } = useAuth();
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
            <ShopOwnerDashboard />
          </TabsContent>
        )}

        <TabsContent value="earnings" className="space-y-4">
          <BarberEarningsOverview
            barberId={isBarber ? user?.barber_id : undefined}
            showAllBarbers={isShopOwner}
          />
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4">
          <PayoutHistory
            barberId={isBarber ? user?.barber_id : undefined}
            showAllPayouts={isShopOwner}
          />
        </TabsContent>

        {isShopOwner && (
          <TabsContent value="compensation" className="space-y-4">
            <CompensationPlanManager />
          </TabsContent>
        )}

        <TabsContent value="reports" className="space-y-4">
          <FinancialReports
            barberId={isBarber ? user?.barber_id : undefined}
            showAllReports={isShopOwner}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
