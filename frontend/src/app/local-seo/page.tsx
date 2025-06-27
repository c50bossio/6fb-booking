'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPinIcon,
  StarIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  EyeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import * as localSeoApi from '@/lib/api/local-seo';

interface GoogleBusinessProfile {
  id: number;
  business_name: string;
  business_description: string;
  business_phone: string;
  business_address: string;
  is_verified: boolean;
  total_reviews: number;
  average_rating: number;
  monthly_views: number;
  monthly_searches: number;
  monthly_calls: number;
  monthly_directions: number;
}

interface SEOOptimization {
  id: number;
  optimization_category: string;
  optimization_item: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_ATTENTION';
  completion_percentage: number;
  impact_score: number;
  difficulty_score: number;
}

interface KeywordRanking {
  id: number;
  keyword: string;
  current_rank: number;
  previous_rank: number;
  search_volume: number;
  is_target_keyword: boolean;
}

export default function LocalSEOPage() {
  const [profile, setProfile] = useState<GoogleBusinessProfile | null>(null);
  const [optimizations, setOptimizations] = useState<SEOOptimization[]>([]);
  const [keywords, setKeywords] = useState<KeywordRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'optimizations' | 'keywords' | 'reviews'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API calls
      setProfile({
        id: 1,
        business_name: 'Elite Barbershop',
        business_description: 'Premium barbershop offering classic cuts and modern styles',
        business_phone: '(555) 123-4567',
        business_address: '123 Main St, City, State 12345',
        is_verified: true,
        total_reviews: 127,
        average_rating: 4.8,
        monthly_views: 2450,
        monthly_searches: 1250,
        monthly_calls: 89,
        monthly_directions: 156,
      });

      setOptimizations([
        {
          id: 1,
          optimization_category: 'Profile Completeness',
          optimization_item: 'Add business hours',
          status: 'COMPLETED',
          completion_percentage: 100,
          impact_score: 8,
          difficulty_score: 2,
        },
        {
          id: 2,
          optimization_category: 'Photos',
          optimization_item: 'Upload interior photos',
          status: 'IN_PROGRESS',
          completion_percentage: 60,
          impact_score: 9,
          difficulty_score: 3,
        },
        {
          id: 3,
          optimization_category: 'Reviews',
          optimization_item: 'Respond to recent reviews',
          status: 'NEEDS_ATTENTION',
          completion_percentage: 25,
          impact_score: 7,
          difficulty_score: 4,
        },
      ]);

      setKeywords([
        {
          id: 1,
          keyword: 'barbershop near me',
          current_rank: 3,
          previous_rank: 5,
          search_volume: 1200,
          is_target_keyword: true,
        },
        {
          id: 2,
          keyword: 'best barber city',
          current_rank: 7,
          previous_rank: 9,
          search_volume: 800,
          is_target_keyword: true,
        },
        {
          id: 3,
          keyword: 'mens haircut',
          current_rank: 12,
          previous_rank: 15,
          search_volume: 2100,
          is_target_keyword: false,
        },
      ]);
    } catch (error) {
      console.error('Failed to load SEO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'NEEDS_ATTENTION': return 'text-red-600 bg-red-100';
      case 'PENDING': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRankChangeIcon = (current: number, previous: number) => {
    if (current < previous) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (current > previous) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500 rotate-180" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Local SEO Management</h1>
        <p className="text-gray-600 mt-2">
          Optimize your Google Business Profile and local search presence
        </p>
      </div>

      {/* Profile Status Card */}
      {profile && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MapPinIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{profile.business_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {profile.is_verified ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    )}
                    <span className={`text-sm ${profile.is_verified ? 'text-green-600' : 'text-red-600'}`}>
                      {profile.is_verified ? 'Verified' : 'Not Verified'}
                    </span>
                  </div>
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <PencilIcon className="h-4 w-4" />
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <StarIcon className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-2xl font-bold text-gray-900">{profile.average_rating}</span>
                </div>
                <p className="text-sm text-gray-600">{profile.total_reviews} reviews</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <EyeIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold text-gray-900">{profile.monthly_views.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600">Monthly views</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <PhoneIcon className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-gray-900">{profile.monthly_calls}</span>
                </div>
                <p className="text-sm text-gray-600">Monthly calls</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <MapPinIcon className="h-5 w-5 text-purple-500" />
                  <span className="text-2xl font-bold text-gray-900">{profile.monthly_directions}</span>
                </div>
                <p className="text-sm text-gray-600">Directions requests</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'optimizations', name: 'Optimizations', icon: CheckCircleIcon },
              { id: 'keywords', name: 'Keywords', icon: MagnifyingGlassIcon },
              { id: 'reviews', name: 'Reviews', icon: ChatBubbleLeftRightIcon },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow">
        {activeTab === 'overview' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">SEO Overview</h3>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <GlobeAltIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Search Visibility</p>
                    <p className="text-2xl font-bold text-blue-900">78%</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-green-600 font-medium">Profile Complete</p>
                    <p className="text-2xl font-bold text-green-900">85%</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <StarIcon className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Review Score</p>
                    <p className="text-2xl font-bold text-purple-900">4.8/5</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-4">Recent Activity</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700">Business hours updated</span>
                  <span className="text-xs text-gray-500 ml-auto">2 hours ago</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <StarIcon className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-gray-700">New 5-star review received</span>
                  <span className="text-xs text-gray-500 ml-auto">1 day ago</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-sm text-gray-700">Keyword ranking improved for 'barbershop near me'</span>
                  <span className="text-xs text-gray-500 ml-auto">3 days ago</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'optimizations' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">SEO Optimizations</h3>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Add Task
              </button>
            </div>

            <div className="space-y-4">
              {optimizations.map((opt) => (
                <div key={opt.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{opt.optimization_item}</h4>
                      <p className="text-sm text-gray-600">{opt.optimization_category}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(opt.status)}`}>
                      {opt.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-900">{opt.completion_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${opt.completion_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Impact: <span className="font-medium">{opt.impact_score}/10</span></span>
                    <span>Difficulty: <span className="font-medium">{opt.difficulty_score}/10</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'keywords' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Keyword Rankings</h3>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Track Keyword
              </button>
            </div>

            <div className="space-y-4">
              {keywords.map((keyword) => (
                <div key={keyword.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{keyword.keyword}</h4>
                        {keyword.is_target_keyword && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full text-blue-600 bg-blue-100">
                            Target
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {keyword.search_volume.toLocaleString()} monthly searches
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-gray-900">#{keyword.current_rank}</span>
                          {getRankChangeIcon(keyword.current_rank, keyword.previous_rank)}
                        </div>
                        <p className="text-xs text-gray-500">
                          Previous: #{keyword.previous_rank}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Review Management</h3>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Review Templates
              </button>
            </div>

            <div className="text-center py-12">
              <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Review management coming soon</p>
              <p className="text-gray-400">Automated review responses and sentiment analysis</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
