'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BarberPremiumDashboard } from '@/components/financial/BarberPremiumDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown } from 'lucide-react';
import { barbersService } from '@/lib/api';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface BarberInfo {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export default function BarberDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const barberId = params.id as string;

  const [barber, setBarber] = useState<BarberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBarberInfo();
  }, [barberId]);

  const fetchBarberInfo = async () => {
    try {
      setLoading(true);
      const response = await barbersService.getBarber(Number(barberId));
      setBarber({
        id: response.data.id.toString(),
        name: `${response.data.first_name} ${response.data.last_name}`,
        email: response.data.email,
        role: response.data.role || 'barber'
      });
    } catch (error) {
      console.error('Failed to fetch barber info:', error);
      setError('Failed to load barber information');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !barber) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Barber not found'}
            </h2>
            <p className="text-gray-600 mb-4">
              Unable to load the barber dashboard. Please try again.
            </p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header Navigation */}
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={handleBack}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Barber Dashboard
            </h1>
          </div>
        </div>

        {/* Premium Dashboard Component */}
        <ErrorBoundary>
          <BarberPremiumDashboard
            barberId={barberId}
            barberName={barber.name}
            isPremium={true}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
