'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Calendar,
  User,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Scissors,
  Users,
  CreditCard,
  Star
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Barbershop Business Blog - Tips, Trends & Industry Insights | Six Figure Barber',
  description: 'Stay updated with the latest barbershop business trends, marketing tips, booking strategies, and industry insights. Expert advice for growing your barbershop business.',
  keywords: 'barbershop blog, barber business tips, salon marketing, appointment booking, barbershop trends, barber industry news, business growth, barber education',
  openGraph: {
    title: 'Barbershop Business Blog - Expert Tips & Industry Insights',
    description: 'Discover expert tips and insights for growing your barbershop business with our comprehensive blog.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barbershop Business Blog - Six Figure Barber',
    description: 'Expert tips, trends, and insights for barbershop business success.',
  },
};

const blogCategories = [
  { name: 'All Posts', slug: 'all', icon: BookOpen, count: 24 },
  { name: 'Business Growth', slug: 'business', icon: TrendingUp, count: 8 },
  { name: 'Industry Trends', slug: 'trends', icon: Scissors, count: 6 },
  { name: 'Client Management', slug: 'clients', icon: Users, count: 5 },
  { name: 'Payment & Finance', slug: 'finance', icon: CreditCard, count: 3 },
  { name: 'Success Stories', slug: 'success', icon: Star, count: 2 }
];

const blogPosts = [
  {
    id: 1,
    title: 'How to Reduce No-Shows by 80% with Smart Booking Strategies',
    slug: 'reduce-no-shows-booking-strategies',
    excerpt: 'Learn proven strategies to dramatically reduce client no-shows and maximize your booking efficiency with automated reminders and deposit systems.',
    category: 'business',
    categoryName: 'Business Growth',
    author: 'Marcus Johnson',
    publishedAt: '2024-06-20',
    readTime: '5 min read',
    image: '/images/blog/booking-strategies.jpg',
    featured: true,
    tags: ['booking', 'no-shows', 'automation', 'revenue']
  },
  {
    id: 2,
    title: 'The Complete Guide to Barbershop Payment Processing in 2024',
    slug: 'barbershop-payment-processing-guide',
    excerpt: 'Everything you need to know about modern payment processing for barbershops, from contactless payments to subscription services.',
    category: 'finance',
    categoryName: 'Payment & Finance',
    author: 'Sarah Williams',
    publishedAt: '2024-06-18',
    readTime: '8 min read',
    image: '/images/blog/payment-processing.jpg',
    featured: false,
    tags: ['payments', 'technology', 'pos systems']
  },
  {
    id: 3,
    title: '5 Marketing Trends Every Barbershop Owner Should Know',
    slug: 'barbershop-marketing-trends-2024',
    excerpt: 'Stay ahead of the competition with these essential marketing trends that are transforming the barbershop industry.',
    category: 'trends',
    categoryName: 'Industry Trends',
    author: 'David Chen',
    publishedAt: '2024-06-15',
    readTime: '6 min read',
    image: '/images/blog/marketing-trends.jpg',
    featured: true,
    tags: ['marketing', 'social media', 'branding']
  },
  {
    id: 4,
    title: 'Building Client Loyalty: A Step-by-Step Guide for Barbershops',
    slug: 'building-client-loyalty-barbershops',
    excerpt: 'Discover how to turn first-time clients into loyal customers with personalized service and strategic follow-up.',
    category: 'clients',
    categoryName: 'Client Management',
    author: 'Lisa Rodriguez',
    publishedAt: '2024-06-12',
    readTime: '7 min read',
    image: '/images/blog/client-loyalty.jpg',
    featured: false,
    tags: ['client retention', 'loyalty programs', 'customer service']
  },
  {
    id: 5,
    title: 'From $30K to $150K: How One Barber Transformed Their Business',
    slug: 'barber-success-story-150k',
    excerpt: 'A real success story of how one barber used strategic planning and the right tools to quintuple their annual revenue.',
    category: 'success',
    categoryName: 'Success Stories',
    author: 'Marcus Johnson',
    publishedAt: '2024-06-10',
    readTime: '10 min read',
    image: '/images/blog/success-story.jpg',
    featured: true,
    tags: ['success story', 'revenue growth', 'case study']
  },
  {
    id: 6,
    title: 'The Psychology of Barbershop Pricing: How to Price for Profit',
    slug: 'barbershop-pricing-psychology',
    excerpt: 'Understanding the psychology behind pricing can help you increase your average ticket and improve profitability.',
    category: 'business',
    categoryName: 'Business Growth',
    author: 'Sarah Williams',
    publishedAt: '2024-06-08',
    readTime: '9 min read',
    image: '/images/blog/pricing-psychology.jpg',
    featured: false,
    tags: ['pricing', 'psychology', 'profit margins']
  }
];

// Schema markup for blog
const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Six Figure Barber Blog",
  "description": "Expert tips and insights for barbershop business success",
  "url": "https://sixfigurebarber.com/blog",
  "publisher": {
    "@type": "Organization",
    "name": "Six Figure Barber",
    "logo": {
      "@type": "ImageObject",
      "url": "https://sixfigurebarber.com/logo.png"
    }
  },
  "blogPost": blogPosts.map(post => ({
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "url": `https://sixfigurebarber.com/blog/${post.slug}`,
    "datePublished": post.publishedAt,
    "author": {
      "@type": "Person",
      "name": post.author
    },
    "image": `https://sixfigurebarber.com${post.image}`
  }))
};

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPosts = blogPosts.filter(post => post.featured);

  return (
    <>
      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="relative py-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <Badge className="mb-6 bg-purple-100 text-purple-800 hover:bg-purple-200">
              Latest Industry Insights
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Barbershop Business
              <span className="text-blue-600 block">Blog & Resources</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Stay ahead of the game with expert tips, industry trends, and actionable strategies
              to grow your barbershop business and increase revenue.
            </p>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Featured Posts */}
        {searchQuery === '' && selectedCategory === 'all' && (
          <section className="py-16 px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredPosts.map((post) => (
                  <Card key={post.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="relative">
                      <div className="bg-gray-200 h-48 rounded-t-lg flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <BookOpen className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm">Featured Article Image</p>
                        </div>
                      </div>
                      <Badge className="absolute top-4 left-4 bg-blue-600 text-white">
                        Featured
                      </Badge>
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary">{post.categoryName}</Badge>
                        <span className="text-gray-500 text-sm">{post.readTime}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-500 text-sm">
                          <User className="h-4 w-4 mr-1" />
                          <span>{post.author}</span>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/blog/${post.slug}`} className="flex items-center">
                            Read More <ArrowRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Categories and Posts */}
        <section className="py-20 bg-gray-50 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Categories Sidebar */}
              <div className="lg:col-span-1">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Categories</h3>
                <div className="space-y-2">
                  {blogCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.slug}
                        onClick={() => setSelectedCategory(category.slug)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                          selectedCategory === category.slug
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-white hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 mr-3" />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {category.count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Blog Posts */}
              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedCategory === 'all' ? 'All Articles' :
                     blogCategories.find(cat => cat.slug === selectedCategory)?.name}
                  </h3>
                  <span className="text-gray-500">
                    {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {filteredPosts.length === 0 ? (
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-12 text-center">
                      <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                      <p className="text-gray-600">Try adjusting your search or category filter.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-8">
                    {filteredPosts.map((post) => (
                      <Card key={post.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-0">
                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                              <div className="bg-gray-200 h-48 md:h-full rounded-l-lg flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <BookOpen className="h-8 w-8 mx-auto mb-2" />
                                  <p className="text-sm">Article Image</p>
                                </div>
                              </div>
                            </div>
                            <div className="md:col-span-2 p-6">
                              <div className="flex items-center gap-2 mb-3">
                                <Badge variant="secondary">{post.categoryName}</Badge>
                                <span className="text-gray-500 text-sm">{post.readTime}</span>
                                {post.featured && (
                                  <Badge className="bg-blue-600 text-white">Featured</Badge>
                                )}
                              </div>
                              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                <Link href={`/blog/${post.slug}`} className="hover:text-blue-600 transition-colors">
                                  {post.title}
                                </Link>
                              </h3>
                              <p className="text-gray-600 mb-4">{post.excerpt}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-gray-500 text-sm">
                                  <User className="h-4 w-4 mr-1" />
                                  <span>{post.author}</span>
                                  <Calendar className="h-4 w-4 ml-4 mr-1" />
                                  <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/blog/${post.slug}`} className="flex items-center">
                                    Read Article <ArrowRight className="h-4 w-4 ml-1" />
                                  </Link>
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-4">
                                {post.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-16 bg-blue-600 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Stay Updated</h2>
            <p className="text-xl text-blue-100 mb-8">
              Get the latest barbershop business tips and industry insights delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1 bg-white"
              />
              <Button className="bg-white text-blue-600 hover:bg-gray-100">
                Subscribe
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
