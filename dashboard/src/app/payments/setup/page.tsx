'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface Barber {
  id: number;
  name: string;
  email: string;
  has_payment_model: boolean;
}

interface SetupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export default function PaymentSetupPage() {
  const router = useRouter();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [paymentModel, setPaymentModel] = useState({
    payment_type: 'commission',
    service_commission_rate: 30,
    product_commission_rate: 15,
    booth_rent_amount: 0,
    rent_frequency: 'weekly',
    auto_pay_commissions: true
  });
  
  const [bankAccount, setBankAccount] = useState({
    routing_number: '',
    account_number: '',
    account_type: 'checking',
    account_name: ''
  });
  
  const [microDeposits, setMicroDeposits] = useState({
    amount1: '',
    amount2: ''
  });
  
  const [squareLink, setSquareLink] = useState({
    square_location_id: '',
    square_employee_email: ''
  });

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const response = await axios.get('/api/v1/barbers');
      setBarbers(response.data);
    } catch (error) {
      console.error('Error fetching barbers:', error);
    }
  };

  const handleBarberSelect = (barberId: number) => {
    setSelectedBarber(barberId);
    setCurrentStep(2);
  };

  const createPaymentModel = async () => {
    if (!selectedBarber) return;
    
    setLoading(true);
    try {
      await axios.post('/api/v1/barber-payments/payment-models/', {
        barber_id: selectedBarber,
        ...paymentModel
      });
      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating payment model:', error);
      alert('Failed to create payment model');
    } finally {
      setLoading(false);
    }
  };

  const addBankAccount = async () => {
    if (!selectedBarber) return;
    
    setLoading(true);
    try {
      const modelResponse = await axios.get(`/api/v1/barber-payments/payment-models/${selectedBarber}`);
      const paymentModelId = modelResponse.data.id;
      
      await axios.post(`/api/v1/barber-payments/payment-models/${paymentModelId}/bank-account`, bankAccount);
      setCurrentStep(4);
    } catch (error) {
      console.error('Error adding bank account:', error);
      alert('Failed to add bank account');
    } finally {
      setLoading(false);
    }
  };

  const verifyMicroDeposits = async () => {
    if (!selectedBarber) return;
    
    setLoading(true);
    try {
      const modelResponse = await axios.get(`/api/v1/barber-payments/payment-models/${selectedBarber}`);
      const paymentModelId = modelResponse.data.id;
      
      await axios.post(`/api/v1/barber-payments/payment-models/${paymentModelId}/verify-bank`, {
        amount1: parseFloat(microDeposits.amount1),
        amount2: parseFloat(microDeposits.amount2)
      });
      setCurrentStep(5);
    } catch (error) {
      console.error('Error verifying micro deposits:', error);
      alert('Verification failed. Please check the amounts.');
    } finally {
      setLoading(false);
    }
  };

  const linkSquareAccount = async () => {
    if (!selectedBarber) return;
    
    setLoading(true);
    try {
      await axios.post('/api/v1/square/link-barber', {
        barber_id: selectedBarber,
        ...squareLink
      });
      alert('Setup complete! The barber can now receive payouts.');
      router.push('/payments');
    } catch (error) {
      console.error('Error linking Square account:', error);
      alert('Failed to link Square account');
    } finally {
      setLoading(false);
    }
  };

  const steps: SetupStep[] = [
    {
      id: 1,
      title: 'Select Barber',
      description: 'Choose a barber to set up payments for',
      completed: currentStep > 1
    },
    {
      id: 2,
      title: 'Payment Model',
      description: 'Configure commission rates and payment type',
      completed: currentStep > 2
    },
    {
      id: 3,
      title: 'Bank Account',
      description: 'Add bank account for ACH payouts',
      completed: currentStep > 3
    },
    {
      id: 4,
      title: 'Verify Account',
      description: 'Confirm micro-deposit amounts',
      completed: currentStep > 4
    },
    {
      id: 5,
      title: 'Square Integration',
      description: 'Link Square POS account (optional)',
      completed: currentStep > 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <BanknotesIcon className="h-8 w-8 text-emerald-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Payment Setup</h1>
                <p className="text-sm text-gray-400">Configure barber payment settings</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/payments')}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.completed ? 'bg-emerald-600 border-emerald-600' : 
                  currentStep === step.id ? 'border-emerald-400 text-emerald-400' : 
                  'border-gray-600 text-gray-600'
                }`}>
                  {step.completed ? (
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-1 mx-2 ${
                    step.completed ? 'bg-emerald-600' : 'bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-white">
              {steps.find(s => s.id === currentStep)?.title}
            </h2>
            <p className="text-sm text-gray-400">
              {steps.find(s => s.id === currentStep)?.description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Select a Barber</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {barbers.filter(b => !b.has_payment_model).map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => handleBarberSelect(barber.id)}
                    className="flex items-center space-x-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors text-left"
                  >
                    <UserIcon className="h-10 w-10 text-gray-400" />
                    <div>
                      <p className="font-medium text-white">{barber.name}</p>
                      <p className="text-sm text-gray-400">{barber.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white mb-4">Configure Payment Model</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Payment Type</label>
                <select
                  value={paymentModel.payment_type}
                  onChange={(e) => setPaymentModel({...paymentModel, payment_type: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="commission">Commission Based</option>
                  <option value="booth_rent">Booth Rent</option>
                  <option value="hybrid">Hybrid (Rent + Commission)</option>
                </select>
              </div>

              {(paymentModel.payment_type === 'commission' || paymentModel.payment_type === 'hybrid') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Service Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      value={paymentModel.service_commission_rate}
                      onChange={(e) => setPaymentModel({...paymentModel, service_commission_rate: parseInt(e.target.value)})}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Shop owner keeps this percentage of service revenue</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Product Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      value={paymentModel.product_commission_rate}
                      onChange={(e) => setPaymentModel({...paymentModel, product_commission_rate: parseInt(e.target.value)})}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Shop owner keeps this percentage of product sales</p>
                  </div>
                </>
              )}

              {(paymentModel.payment_type === 'booth_rent' || paymentModel.payment_type === 'hybrid') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Booth Rent Amount
                    </label>
                    <input
                      type="number"
                      value={paymentModel.booth_rent_amount}
                      onChange={(e) => setPaymentModel({...paymentModel, booth_rent_amount: parseFloat(e.target.value)})}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Rent Frequency
                    </label>
                    <select
                      value={paymentModel.rent_frequency}
                      onChange={(e) => setPaymentModel({...paymentModel, rent_frequency: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={createPaymentModel}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Payment Model'}
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white mb-4">Add Bank Account</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Account Name</label>
                <input
                  type="text"
                  value={bankAccount.account_name}
                  onChange={(e) => setBankAccount({...bankAccount, account_name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="John's Checking"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Routing Number</label>
                <input
                  type="text"
                  value={bankAccount.routing_number}
                  onChange={(e) => setBankAccount({...bankAccount, routing_number: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Account Number</label>
                <input
                  type="text"
                  value={bankAccount.account_number}
                  onChange={(e) => setBankAccount({...bankAccount, account_number: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Account Type</label>
                <select
                  value={bankAccount.account_type}
                  onChange={(e) => setBankAccount({...bankAccount, account_type: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  <strong>Note:</strong> Dwolla will send two small deposits (less than $0.10 each) to verify this account. 
                  This typically takes 1-2 business days.
                </p>
              </div>

              <button
                onClick={addBankAccount}
                disabled={loading || !bankAccount.routing_number || !bankAccount.account_number}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {loading ? 'Adding Bank Account...' : 'Add Bank Account'}
              </button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white mb-4">Verify Micro-Deposits</h3>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-400">
                  Check the bank account for two small deposits from Dwolla. 
                  Enter the exact amounts below to verify the account.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">First Deposit Amount</label>
                <input
                  type="text"
                  value={microDeposits.amount1}
                  onChange={(e) => setMicroDeposits({...microDeposits, amount1: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.05"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Second Deposit Amount</label>
                <input
                  type="text"
                  value={microDeposits.amount2}
                  onChange={(e) => setMicroDeposits({...microDeposits, amount2: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.08"
                />
              </div>

              <button
                onClick={verifyMicroDeposits}
                disabled={loading || !microDeposits.amount1 || !microDeposits.amount2}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {loading ? 'Verifying...' : 'Verify Deposits'}
              </button>

              <button
                onClick={() => setCurrentStep(5)}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Skip for Now
              </button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white mb-4">Link Square Account (Optional)</h3>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-purple-400">
                  Link the barber's Square employee account to automatically track product sales and calculate commissions.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Square Location ID</label>
                <input
                  type="text"
                  value={squareLink.square_location_id}
                  onChange={(e) => setSquareLink({...squareLink, square_location_id: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="LOCATION_ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Barber's Square Email</label>
                <input
                  type="email"
                  value={squareLink.square_employee_email}
                  onChange={(e) => setSquareLink({...squareLink, square_employee_email: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="barber@example.com"
                />
              </div>

              <button
                onClick={linkSquareAccount}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {loading ? 'Linking...' : 'Complete Setup'}
              </button>

              <button
                onClick={() => router.push('/payments')}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Skip Square Integration
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}