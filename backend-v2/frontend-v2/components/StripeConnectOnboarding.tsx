'use client';

import { useState, useEffect } from 'react';
import { createStripeConnectAccount, getStripeConnectStatus } from '@/lib/api';
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface StripeConnectOnboardingProps {
  onComplete?: () => void;
}

export default function StripeConnectOnboarding({ onComplete }: StripeConnectOnboardingProps) {
  const [status, setStatus] = useState<{
    has_account: boolean;
    account_id?: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    requirements?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const result = await getStripeConnectStatus();
      setStatus(result);
      
      if (result.charges_enabled && result.payouts_enabled && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
      setError('Failed to check account status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setCreating(true);
      setError('');
      
      const result = await createStripeConnectAccount();
      
      // Redirect to Stripe onboarding
      window.location.href = result.onboarding_url;
    } catch (error: any) {
      setError(error.message || 'Failed to create Stripe Connect account');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const isFullyOnboarded = status?.charges_enabled && status?.payouts_enabled;
  const hasStartedOnboarding = status?.has_account;
  const hasRequirements = status?.requirements && status.requirements.length > 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-8 w-8" />
            <h2 className="text-2xl font-bold">Stripe Connect Setup</h2>
          </div>
          <p className="text-purple-100">
            Set up your payout account to receive payments from appointments
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isFullyOnboarded ? (
            /* Fully Onboarded */
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Account Active</h3>
                </div>
                <p className="text-green-700">
                  Your Stripe Connect account is fully set up and ready to receive payouts.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Account ID</span>
                  <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">
                    {status?.account_id}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Charges Enabled</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Payouts Enabled</span>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>

              <div className="mt-6">
                <a
                  href="https://dashboard.stripe.com/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Stripe Dashboard
                </a>
              </div>
            </div>
          ) : hasStartedOnboarding ? (
            /* Incomplete Onboarding */
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                      Account Setup Incomplete
                    </h3>
                    <p className="text-yellow-700">
                      You've started the onboarding process but haven't completed all requirements.
                    </p>
                  </div>
                </div>
              </div>

              {hasRequirements && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Outstanding Requirements:</h4>
                  <ul className="space-y-2">
                    {status.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">{req.replace(/_/g, ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleCreateAccount}
                  disabled={creating}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    'Continue Setup'
                  )}
                </button>
                
                <button
                  onClick={checkStatus}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          ) : (
            /* Not Started */
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Why Connect with Stripe?
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Automatic Payouts</p>
                      <p className="text-sm text-gray-600">
                        Receive your earnings directly to your bank account
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Secure Processing</p>
                      <p className="text-sm text-gray-600">
                        Industry-leading security and fraud protection
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Real-time Tracking</p>
                      <p className="text-sm text-gray-600">
                        Monitor your earnings and payouts in real-time
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600">
                  <strong>Setup takes about 5-10 minutes.</strong> You'll need:
                </p>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• Business information (name, address, tax ID)</li>
                  <li>• Bank account details for payouts</li>
                  <li>• Personal identification for verification</li>
                </ul>
              </div>

              <button
                onClick={handleCreateAccount}
                disabled={creating}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Start Stripe Connect Setup
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            By connecting with Stripe, you agree to their{' '}
            <a
              href="https://stripe.com/connect-account/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Terms of Service
            </a>
            {' '}and{' '}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}