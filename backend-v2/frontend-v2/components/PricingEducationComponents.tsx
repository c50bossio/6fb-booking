/**
 * Pricing Education Components - 6FB Pricing Strategy Education
 * 
 * Educational components to help barbers understand and implement
 * Six Figure Barber pricing strategies effectively.
 */

import React, { useState } from 'react';
import {
  SixFBTier,
  PricingStrategy,
  ServiceCategoryEnum,
  EDUCATIONAL_CONTENT_TEMPLATES
} from '../lib/pricing-validation';

// Educational Card Component
interface EducationalCardProps {
  title: string;
  content: string;
  icon?: string;
  actionText?: string;
  onAction?: () => void;
  level?: 'beginner' | 'intermediate' | 'advanced';
}

export const EducationalCard: React.FC<EducationalCardProps> = ({
  title,
  content,
  icon = '💡',
  actionText,
  onAction,
  level = 'beginner'
}) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-50 border-green-200 text-green-800';
      case 'intermediate': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'advanced': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span className={`px-2 py-1 text-xs rounded-full ${getLevelColor(level)}`}>
              {level}
            </span>
          </div>
          <p className="text-gray-700 mb-3">{content}</p>
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {actionText} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Interactive Pricing Strategy Guide
export const PricingStrategyGuide: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<PricingStrategy | null>(null);

  const strategies = [
    {
      strategy: PricingStrategy.VALUE_BASED,
      title: 'Value-Based Pricing',
      description: 'Price based on value delivered to clients',
      tier: SixFBTier.STARTER,
      icon: '💎',
      examples: ['$35 Essential Haircut', '$25 Precision Beard Trim'],
      principles: [
        'Focus on client outcomes and satisfaction',
        'Communicate value clearly',
        'Build relationships that justify pricing',
        'Consistent quality delivery'
      ]
    },
    {
      strategy: PricingStrategy.VALUE_BASED_PREMIUM,
      title: 'Premium Value Pricing',
      description: 'Enhanced value pricing with premium positioning',
      tier: SixFBTier.PROFESSIONAL,
      icon: '⭐',
      examples: ['$65 Signature Cut & Style', '$80 Complete Grooming Experience'],
      principles: [
        'Advanced techniques and personalization',
        'Extended consultation and planning',
        'Premium product usage',
        'Relationship-focused service'
      ]
    },
    {
      strategy: PricingStrategy.LUXURY_VALUE,
      title: 'Luxury Value Pricing',
      description: 'Exclusive pricing for high-end services',
      tier: SixFBTier.PREMIUM,
      icon: '👑',
      examples: ['$120 Executive Grooming', '$75 Classic Straight Razor Shave'],
      principles: [
        'Exclusivity and time efficiency',
        'Premium experience delivery',
        'VIP treatment and amenities',
        'Master-level expertise'
      ]
    },
    {
      strategy: PricingStrategy.ULTIMATE_LUXURY,
      title: 'Ultimate Luxury Pricing',
      description: 'Peak pricing for ultimate experiences',
      tier: SixFBTier.LUXURY,
      icon: '💫',
      examples: ['$200 Master Craftsman Experience'],
      principles: [
        'Complete luxury experience',
        'Highest level of craftsmanship',
        'Exclusive clientele',
        'Comprehensive service offerings'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">6FB Pricing Strategies</h2>
        <p className="text-gray-600">Choose a strategy to learn more about implementation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((item, index) => (
          <div
            key={index}
            onClick={() => setSelectedStrategy(item.strategy)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedStrategy === item.strategy
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{item.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
                <span className="text-xs text-blue-600 font-medium">{item.tier} Tier</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedStrategy && (
        <div className="mt-6 p-6 bg-white border border-gray-200 rounded-lg">
          {(() => {
            const strategy = strategies.find(s => s.strategy === selectedStrategy);
            if (!strategy) return null;

            return (
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="text-3xl">{strategy.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{strategy.title}</h3>
                    <p className="text-gray-600">{strategy.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Key Principles</h4>
                    <ul className="space-y-2">
                      {strategy.principles.map((principle, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          <span className="text-gray-700">{principle}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Examples</h4>
                    <ul className="space-y-2">
                      {strategy.examples.map((example, idx) => (
                        <li key={idx} className="flex items-center">
                          <span className="text-blue-500 mr-2">→</span>
                          <span className="text-gray-700">{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// Pricing Mistakes Warning Component
export const PricingMistakesWarning: React.FC = () => {
  const [expandedMistake, setExpandedMistake] = useState<number | null>(null);

  const commonMistakes = [
    {
      mistake: 'Cost-Plus Pricing',
      description: 'Pricing based on costs rather than value delivered',
      warning: 'This approach limits revenue potential and doesn\'t reflect true service value.',
      solution: 'Switch to value-based pricing by focusing on client outcomes and satisfaction.',
      impact: 'Can reduce revenue by 20-40% compared to value-based pricing'
    },
    {
      mistake: 'Competing on Price',
      description: 'Lowering prices to compete with other barbers',
      warning: 'Price competition erodes profit margins and devalues your services.',
      solution: 'Differentiate through quality, experience, and relationship building.',
      impact: 'Race to the bottom that hurts the entire industry'
    },
    {
      mistake: 'Inconsistent Pricing',
      description: 'Charging different prices for the same service',
      warning: 'Inconsistency confuses clients and damages trust.',
      solution: 'Establish clear pricing structure and stick to it consistently.',
      impact: 'Can lead to client confusion and reduced loyalty'
    },
    {
      mistake: 'Undervaluing Expertise',
      description: 'Not charging appropriately for skill level and experience',
      warning: 'Underpricing signals lower quality and limits business growth.',
      solution: 'Price confidently based on your expertise and client value.',
      impact: 'Limits business growth and professional development'
    },
    {
      mistake: 'No Price Increases',
      description: 'Keeping prices static for years without adjustments',
      warning: 'Inflation and business growth require periodic price adjustments.',
      solution: 'Review and adjust pricing annually based on value and market conditions.',
      impact: 'Erodes real income and business profitability over time'
    }
  ];

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="text-2xl mr-3">⚠️</div>
        <h2 className="text-xl font-bold text-red-900">Common Pricing Mistakes to Avoid</h2>
      </div>

      <div className="space-y-3">
        {commonMistakes.map((item, index) => (
          <div key={index} className="border border-red-200 rounded-lg bg-white">
            <button
              onClick={() => setExpandedMistake(expandedMistake === index ? null : index)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-red-50 transition-colors"
            >
              <div>
                <h3 className="font-semibold text-red-900">{item.mistake}</h3>
                <p className="text-sm text-red-700">{item.description}</p>
              </div>
              <span className="text-red-600">
                {expandedMistake === index ? '−' : '+'}
              </span>
            </button>

            {expandedMistake === index && (
              <div className="px-4 pb-4 border-t border-red-200">
                <div className="space-y-3 mt-3">
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">Why This Hurts Your Business:</h4>
                    <p className="text-sm text-red-700">{item.warning}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">6FB Solution:</h4>
                    <p className="text-sm text-red-700">{item.solution}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">Business Impact:</h4>
                    <p className="text-sm text-red-700">{item.impact}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Pricing Psychology Tips
export const PricingPsychologyTips: React.FC = () => {
  const tips = [
    {
      tip: 'Price Anchoring',
      description: 'Present your premium services first to establish a high value anchor',
      icon: '⚓',
      example: 'Show $200 Master Experience before $65 Standard Cut'
    },
    {
      tip: 'Confidence in Communication',
      description: 'Present prices confidently without apology or hesitation',
      icon: '💪',
      example: 'Our signature cut is $65 (not just $65 or only $65)'
    },
    {
      tip: 'Value Justification',
      description: 'Always explain the value behind your pricing',
      icon: '🎯',
      example: 'This includes consultation, precision cutting, and styling guidance'
    },
    {
      tip: 'Bundling Benefits',
      description: 'Package services to increase perceived value and revenue',
      icon: '📦',
      example: 'Cut + Beard + Hot Towel for $80 (vs $90 separately)'
    },
    {
      tip: 'Scarcity and Exclusivity',
      description: 'Limited availability can justify premium pricing',
      icon: '⏰',
      example: 'Only 3 Master Experience slots available per week'
    }
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="text-2xl mr-3">🧠</div>
        <h2 className="text-xl font-bold text-blue-900">Pricing Psychology Tips</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tips.map((tip, index) => (
          <div key={index} className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-xl">{tip.icon}</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">{tip.tip}</h3>
                <p className="text-sm text-blue-700 mb-2">{tip.description}</p>
                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Example: {tip.example}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pricing Implementation Checklist
export const PricingImplementationChecklist: React.FC = () => {
  const [checkedItems, setCheckedItems] = useState<{[key: number]: boolean}>({});

  const checklistItems = [
    {
      category: 'Foundation',
      items: [
        'Analyze current pricing against 6FB benchmarks',
        'Identify target tier and market positioning',
        'Calculate current profit margins for each service',
        'Review competitor pricing in your market'
      ]
    },
    {
      category: 'Strategy Development',
      items: [
        'Choose appropriate pricing strategy for each service',
        'Develop value communication messaging',
        'Create service packages and bundles',
        'Plan pricing increase implementation timeline'
      ]
    },
    {
      category: 'Communication',
      items: [
        'Update all marketing materials with new pricing',
        'Prepare value justification explanations',
        'Train staff on new pricing communication',
        'Create pricing menu for client viewing'
      ]
    },
    {
      category: 'Implementation',
      items: [
        'Implement pricing changes gradually',
        'Monitor client response and booking patterns',
        'Adjust services based on pricing feedback',
        'Track revenue and profit margin improvements'
      ]
    },
    {
      category: 'Optimization',
      items: [
        'Regularly review and adjust pricing',
        'Analyze pricing performance metrics',
        'Identify upselling opportunities',
        'Plan seasonal pricing adjustments'
      ]
    }
  ];

  const handleItemCheck = (categoryIndex: number, itemIndex: number) => {
    const key = categoryIndex * 100 + itemIndex;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getCompletionPercentage = () => {
    const totalItems = checklistItems.reduce((sum, category) => sum + category.items.length, 0);
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;
    return Math.round((checkedCount / totalItems) * 100);
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="text-2xl mr-3">✅</div>
          <h2 className="text-xl font-bold text-green-900">Pricing Implementation Checklist</h2>
        </div>
        <div className="text-sm text-green-700">
          {getCompletionPercentage()}% Complete
        </div>
      </div>

      <div className="mb-4">
        <div className="bg-green-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getCompletionPercentage()}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {checklistItems.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <h3 className="font-semibold text-green-900 mb-3 text-lg">
              {category.category}
            </h3>
            <div className="space-y-2">
              {category.items.map((item, itemIndex) => {
                const key = categoryIndex * 100 + itemIndex;
                const isChecked = checkedItems[key] || false;
                
                return (
                  <div key={itemIndex} className="flex items-center space-x-3">
                    <button
                      onClick={() => handleItemCheck(categoryIndex, itemIndex)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isChecked 
                          ? 'bg-green-600 border-green-600 text-white' 
                          : 'border-green-400 hover:border-green-600'
                      }`}
                    >
                      {isChecked && <span className="text-xs">✓</span>}
                    </button>
                    <span className={`text-sm ${isChecked ? 'line-through text-green-600' : 'text-green-800'}`}>
                      {item}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Quick Reference Guide
export const QuickReferenceGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'formulas' | 'tips'>('tiers');

  const tierInfo = {
    [SixFBTier.STARTER]: {
      priceRange: '$25-50',
      margin: '75-80%',
      focus: 'Foundation services with quality execution',
      examples: 'Essential Haircut, Precision Beard Trim'
    },
    [SixFBTier.PROFESSIONAL]: {
      priceRange: '$45-85',
      margin: '65-70%',
      focus: 'Enhanced services with consultation',
      examples: 'Signature Cut & Style, Complete Grooming'
    },
    [SixFBTier.PREMIUM]: {
      priceRange: '$75-160',
      margin: '60-70%',
      focus: 'Luxury services with premium experience',
      examples: 'Executive Grooming, Classic Straight Razor'
    },
    [SixFBTier.LUXURY]: {
      priceRange: '$150-280',
      margin: '55-60%',
      focus: 'Ultimate experience with master craftsmanship',
      examples: 'Master Craftsman Experience'
    }
  };

  const formulas = [
    {
      name: 'Profit Margin',
      formula: '(Price - Cost) / Price × 100',
      example: '($65 - $20) / $65 × 100 = 69%'
    },
    {
      name: 'Revenue per Hour',
      formula: 'Service Price / (Duration / 60)',
      example: '$65 / (60 / 60) = $65/hour'
    },
    {
      name: 'Break-even Price',
      formula: 'Total Costs / (1 - Desired Margin)',
      example: '$20 / (1 - 0.70) = $67 minimum'
    },
    {
      name: 'Package Discount',
      formula: 'Individual Total × (1 - Discount %)',
      example: '$90 × (1 - 0.15) = $77 package price'
    }
  ];

  const quickTips = [
    'Always lead with value, not price',
    'Increase prices gradually (10-15% annually)',
    'Bundle services for higher transaction value',
    'Use odd-number pricing ($65, not $60)',
    'Offer premium options to justify standard pricing',
    'Track profit margins, not just revenue',
    'Review pricing quarterly, adjust annually',
    'Communicate increases with advance notice'
  ];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="text-2xl mr-3">📚</div>
        <h2 className="text-xl font-bold text-gray-900">Quick Reference Guide</h2>
      </div>

      <div className="flex space-x-1 mb-4">
        {[
          { key: 'tiers', label: 'Tiers' },
          { key: 'formulas', label: 'Formulas' },
          { key: 'tips', label: 'Tips' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg p-4 border">
        {activeTab === 'tiers' && (
          <div className="space-y-4">
            {Object.entries(tierInfo).map(([tier, info]) => (
              <div key={tier} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h3 className="font-semibold text-gray-900 mb-2 capitalize">{tier} Tier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Price Range:</span>
                    <span className="ml-2 font-medium">{info.priceRange}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Target Margin:</span>
                    <span className="ml-2 font-medium">{info.margin}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-600">Focus:</span>
                    <span className="ml-2">{info.focus}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-gray-600">Examples:</span>
                    <span className="ml-2 italic">{info.examples}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="space-y-4">
            {formulas.map((formula, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h3 className="font-semibold text-gray-900 mb-2">{formula.name}</h3>
                <div className="text-sm">
                  <div className="font-mono bg-gray-100 px-3 py-2 rounded mb-2">
                    {formula.formula}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">Example:</span> {formula.example}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-2">
            {quickTips.map((tip, index) => (
              <div key={index} className="flex items-start">
                <span className="text-blue-500 mr-2 mt-1">•</span>
                <span className="text-gray-700">{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Export all components
export default {
  EducationalCard,
  PricingStrategyGuide,
  PricingMistakesWarning,
  PricingPsychologyTips,
  PricingImplementationChecklist,
  QuickReferenceGuide
};