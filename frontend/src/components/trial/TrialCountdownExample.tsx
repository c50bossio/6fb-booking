'use client'

import React from 'react'
import { TrialCountdown } from './index'

/**
 * Example usage of the TrialCountdown component
 * This file demonstrates different states and configurations
 */
export default function TrialCountdownExample() {
  // Example dates
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const handleUpgrade = () => {
    console.log('Upgrade clicked')
    // Navigate to upgrade flow or open modal
  }

  const handleTrialInfoClick = () => {
    console.log('Trial info clicked')
    // Show trial details or navigate to billing
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Trial Countdown Examples</h1>

      {/* Active Premium */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Active Premium Account</h2>
        <TrialCountdown
          trialEndDate={oneWeekFromNow}
          subscriptionStatus="active"
          onUpgrade={handleUpgrade}
          onTrialInfoClick={handleTrialInfoClick}
        />
      </div>

      {/* Trial with 1 week remaining */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Trial - 1 Week Remaining</h2>
        <TrialCountdown
          trialEndDate={oneWeekFromNow}
          subscriptionStatus="trial"
          onUpgrade={handleUpgrade}
          onTrialInfoClick={handleTrialInfoClick}
        />
      </div>

      {/* Trial with 3 days remaining (warning state) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Trial - 3 Days Remaining (Warning)</h2>
        <TrialCountdown
          trialEndDate={threeDaysFromNow}
          subscriptionStatus="trial"
          onUpgrade={handleUpgrade}
          onTrialInfoClick={handleTrialInfoClick}
        />
      </div>

      {/* Trial with 1 day remaining (critical state) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Trial - 1 Day Remaining (Critical)</h2>
        <TrialCountdown
          trialEndDate={oneDayFromNow}
          subscriptionStatus="trial"
          onUpgrade={handleUpgrade}
          onTrialInfoClick={handleTrialInfoClick}
        />
      </div>

      {/* Trial with hours remaining (very critical) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Trial - Hours Remaining (Very Critical)</h2>
        <TrialCountdown
          trialEndDate={twoHoursFromNow}
          subscriptionStatus="trial"
          onUpgrade={handleUpgrade}
          onTrialInfoClick={handleTrialInfoClick}
        />
      </div>

      {/* Expired trial */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Expired Trial</h2>
        <TrialCountdown
          trialEndDate={yesterday}
          subscriptionStatus="expired"
          onUpgrade={handleUpgrade}
          onTrialInfoClick={handleTrialInfoClick}
        />
      </div>

      {/* Compact versions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Compact Versions</h2>
        <div className="space-y-3">
          <TrialCountdown
            trialEndDate={threeDaysFromNow}
            subscriptionStatus="trial"
            onUpgrade={handleUpgrade}
            onTrialInfoClick={handleTrialInfoClick}
            compact
          />
          <TrialCountdown
            trialEndDate={oneWeekFromNow}
            subscriptionStatus="active"
            onUpgrade={handleUpgrade}
            onTrialInfoClick={handleTrialInfoClick}
            compact
          />
          <TrialCountdown
            trialEndDate={yesterday}
            subscriptionStatus="expired"
            onUpgrade={handleUpgrade}
            onTrialInfoClick={handleTrialInfoClick}
            compact
          />
        </div>
      </div>

      {/* Without upgrade button */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Without Upgrade Button</h2>
        <TrialCountdown
          trialEndDate={threeDaysFromNow}
          subscriptionStatus="trial"
          onTrialInfoClick={handleTrialInfoClick}
          showUpgradeButton={false}
        />
      </div>
    </div>
  )
}
