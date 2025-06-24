// Server component for blog listing page
import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
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
};

const blogPosts = [
  {
    id: 1,
    title: 'How to Reduce No-Shows by 80% with Smart Booking Strategies',
    slug: 'reduce-no-shows-booking-strategies',
    excerpt: 'Learn proven strategies to dramatically reduce client no-shows and maximize your booking efficiency with automated reminders and deposit systems.',
    category: 'Business Growth',
    date: '2024-06-15',
    author: 'Michael Chen',
    readTime: '5 min read',
    featured: true,
    image: '/images/blog/no-shows.jpg'
  },
  {
    id: 2,
    title: 'The Complete Guide to Barber Shop Marketing in 2024',
    slug: 'barber-shop-marketing-guide-2024',
    excerpt: 'Discover the most effective marketing strategies for barbershops, from social media to local SEO and client retention programs.',
    category: 'Marketing',
    date: '2024-06-10',
    author: 'Sarah Williams',
    readTime: '8 min read',
    featured: true,
    image: '/images/blog/marketing.jpg'
  },
  {
    id: 3,
    title: 'Building Client Loyalty: The Psychology of Repeat Business',
    slug: 'building-client-loyalty-psychology',
    excerpt: 'Understanding what makes clients come back and how to create an experience that keeps them loyal to your barbershop.',
    category: 'Client Management',
    date: '2024-06-05',
    author: 'David Johnson',
    readTime: '6 min read',
    featured: false,
    image: '/images/blog/loyalty.jpg'
  }
];

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Six Figure Barber Blog</h1>
        <p className="text-xl text-gray-600 mb-8">
          Expert insights and strategies for growing your barbershop business
        </p>
      </div>

      {/* Featured Posts */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Featured Articles</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.filter(post => post.featured).map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <Badge className="mb-2">{post.category}</Badge>
                <h3 className="text-xl font-semibold mb-2">
                  <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                    {post.title}
                  </Link>
                </h3>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{post.date}</span>
                  </div>
                  <Link href={`/blog/${post.slug}`}>
                    <Button variant="link" size="sm" className="p-0">
                      Read More <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* All Posts */}
      <div>
        <h2 className="text-2xl font-bold mb-6">All Articles</h2>
        <div className="space-y-4">
          {blogPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge className="mb-2">{post.category}</Badge>
                    <h3 className="text-lg font-semibold mb-2">
                      <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-gray-600 mb-3">{post.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{post.date}</span>
                      </div>
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}