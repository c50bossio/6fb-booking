'use client'

import React from 'react'

const CookiePolicyPage = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="flex flex-col space-y-1.5 pb-6">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">
            Cookie Policy
          </h3>
          <p className="text-sm text-gray-600">
            Learn about our use of cookies and how to manage your preferences
          </p>
        </div>
        
        <div className="space-y-6">
          <section>
            <h4 className="text-lg font-medium mb-3">What Are Cookies?</h4>
            <p className="text-gray-600 mb-4">
              Cookies are small text files stored on your device when you visit a website. They help websites 
              remember your preferences, analyze usage patterns, and provide personalized experiences.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">Cookie Categories</h4>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-green-700 mb-2">Essential Cookies (Always Active)</h5>
                <p className="text-sm text-gray-600 mb-3">Required for the website to function properly. These cannot be disabled.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>session_id</strong>: Maintain user session (Duration: Session, Provider: BookedBarber)</li>
                  <li><strong>csrf_token</strong>: Security - prevent CSRF attacks (Duration: 24 hours, Provider: BookedBarber)</li>
                  <li><strong>auth_token</strong>: Authentication state (Duration: 7 days, Provider: BookedBarber)</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-blue-700 mb-2">Analytics Cookies</h5>
                <p className="text-sm text-gray-600 mb-3">Help us understand how visitors use our website.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>_ga</strong>: Google Analytics - user tracking (Duration: 2 years, Provider: Google)</li>
                  <li><strong>_gid</strong>: Google Analytics - user distinction (Duration: 24 hours, Provider: Google)</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-purple-700 mb-2">Marketing Cookies</h5>
                <p className="text-sm text-gray-600 mb-3">Used to deliver personalized advertisements.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>_fbp</strong>: Facebook Pixel - ad targeting (Duration: 3 months, Provider: Meta)</li>
                  <li><strong>fr</strong>: Facebook - ad delivery (Duration: 3 months, Provider: Meta)</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-orange-700 mb-2">Functional Cookies</h5>
                <p className="text-sm text-gray-600 mb-3">Remember your preferences and settings.</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>language</strong>: Language preference (Duration: 1 year, Provider: BookedBarber)</li>
                  <li><strong>timezone</strong>: Timezone settings (Duration: 1 year, Provider: BookedBarber)</li>
                  <li><strong>theme</strong>: UI theme preference (Duration: 1 year, Provider: BookedBarber)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">Managing Your Preferences</h4>
            <p className="text-gray-600 mb-4">
              You can control cookies directly in your browser settings. Note that disabling certain 
              cookies may affect website functionality.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h5 className="font-medium mb-2">Popular Browsers</h5>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a 
                      href="https://support.google.com/chrome/answer/95647" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Google Chrome
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Mozilla Firefox
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Safari
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">Opt-out Tools</h5>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a 
                      href="https://tools.google.com/dlpage/gaoptout" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Google Analytics Opt-out
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://www.facebook.com/settings?tab=ads" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Facebook Ad Preferences
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-lg font-medium mb-3">Contact Information</h4>
            <p className="text-gray-600">
              For questions about our cookie policy, please contact us at{' '}
              <a href="mailto:privacy@bookedbarber.com" className="text-blue-600 hover:underline">
                privacy@bookedbarber.com
              </a>
            </p>
          </section>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-center text-blue-800 font-medium">
            We are committed to transparency in our use of cookies and respect your right to control your data.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CookiePolicyPage