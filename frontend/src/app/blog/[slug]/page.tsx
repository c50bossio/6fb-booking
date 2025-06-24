import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Share2,
  BookOpen,
  Tag,
  ChevronRight,
  TrendingUp,
  MessageCircle,
  ThumbsUp
} from 'lucide-react';

// This would typically come from a CMS or database
const blogPosts = [
  {
    id: 1,
    title: 'How to Reduce No-Shows by 80% with Smart Booking Strategies',
    slug: 'reduce-no-shows-booking-strategies',
    excerpt: 'Learn proven strategies to dramatically reduce client no-shows and maximize your booking efficiency with automated reminders and deposit systems.',
    content: `
      <p>No-shows are one of the biggest challenges facing barbershops today. On average, barbershops lose 15-20% of their potential revenue due to clients who book appointments but don't show up. But what if I told you that you could reduce no-shows by up to 80% with the right strategies?</p>

      <h2>The Real Cost of No-Shows</h2>
      <p>Before we dive into solutions, let's understand the true impact. A no-show doesn't just mean losing the cost of one service. It means:</p>
      <ul>
        <li>Lost revenue from the missed appointment</li>
        <li>Potential lost revenue from walk-ins you had to turn away</li>
        <li>Wasted time that could have been used productively</li>
        <li>Frustrated staff and reduced morale</li>
      </ul>

      <h2>Strategy 1: Implement a Deposit System</h2>
      <p>One of the most effective ways to reduce no-shows is to require a small deposit when booking. This creates a financial commitment from the client and significantly reduces the likelihood they'll skip their appointment.</p>

      <blockquote>
        <p>"After implementing a $10 deposit system, our no-show rate dropped from 18% to just 3%." - Marcus Thompson, Owner of Downtown Cuts</p>
      </blockquote>

      <h2>Strategy 2: Automated Reminder System</h2>
      <p>A well-timed reminder system can dramatically improve show rates. The key is to send reminders at strategic intervals:</p>
      <ul>
        <li>24-48 hours before the appointment (initial reminder)</li>
        <li>2-4 hours before the appointment (final reminder)</li>
        <li>Include easy rescheduling options in every reminder</li>
      </ul>

      <h2>Strategy 3: Personalized Communication</h2>
      <p>Generic reminders are easy to ignore. Personalized messages that include the client's name, service details, and even their barber's name create a stronger connection and commitment.</p>

      <h2>Strategy 4: Make Rescheduling Easy</h2>
      <p>Sometimes clients want to reschedule but find it too difficult or inconvenient. By making rescheduling as easy as clicking a link, you convert potential no-shows into rescheduled appointments.</p>

      <h2>Implementing These Strategies</h2>
      <p>The good news is that modern booking platforms like Six Figure Barber make implementing these strategies simple. With automated reminders, easy deposit collection, and one-click rescheduling, you can start reducing no-shows immediately.</p>

      <h2>Measuring Success</h2>
      <p>Track your no-show rate weekly and adjust your strategies based on the results. Most barbershops see significant improvement within the first month of implementation.</p>

      <p>Remember, reducing no-shows isn't just about preventing lost revenue – it's about creating a more predictable, profitable business that both you and your clients can rely on.</p>
    `,
    category: 'business',
    categoryName: 'Business Growth',
    author: 'Marcus Johnson',
    authorBio: 'Former barber turned tech entrepreneur with 15+ years in the industry.',
    publishedAt: '2024-06-20',
    updatedAt: '2024-06-20',
    readTime: '5 min read',
    image: '/images/blog/booking-strategies.jpg',
    featured: true,
    tags: ['booking', 'no-shows', 'automation', 'revenue'],
    relatedPosts: [2, 3, 6]
  },
  {
    id: 2,
    title: 'The Complete Guide to Barbershop Payment Processing in 2024',
    slug: 'barbershop-payment-processing-guide',
    excerpt: 'Everything you need to know about modern payment processing for barbershops, from contactless payments to subscription services.',
    content: `
      <p>The payment landscape for barbershops has evolved dramatically in recent years. From cash-only operations to sophisticated digital payment systems, barbershops need to adapt to meet customer expectations and improve their bottom line.</p>

      <h2>The Evolution of Barbershop Payments</h2>
      <p>Traditional barbershops relied heavily on cash transactions, but today's customers expect multiple payment options including:</p>
      <ul>
        <li>Credit and debit cards</li>
        <li>Mobile payments (Apple Pay, Google Pay)</li>
        <li>Contactless payments</li>
        <li>Online payment processing</li>
        <li>Subscription-based services</li>
      </ul>

      <h2>Key Features to Look For</h2>
      <p>When choosing a payment processor for your barbershop, prioritize these essential features...</p>
    `,
    category: 'finance',
    categoryName: 'Payment & Finance',
    author: 'Sarah Williams',
    authorBio: 'Software architect specializing in scalable booking systems and payment processing.',
    publishedAt: '2024-06-18',
    updatedAt: '2024-06-18',
    readTime: '8 min read',
    image: '/images/blog/payment-processing.jpg',
    featured: false,
    tags: ['payments', 'technology', 'pos systems'],
    relatedPosts: [1, 4, 5]
  }
  // More posts would be here...
];

const relatedPosts = [
  {
    id: 3,
    title: '5 Marketing Trends Every Barbershop Owner Should Know',
    slug: 'barbershop-marketing-trends-2024',
    categoryName: 'Industry Trends',
    readTime: '6 min read'
  },
  {
    id: 4,
    title: 'Building Client Loyalty: A Step-by-Step Guide for Barbershops',
    slug: 'building-client-loyalty-barbershops',
    categoryName: 'Client Management',
    readTime: '7 min read'
  },
  {
    id: 6,
    title: 'The Psychology of Barbershop Pricing: How to Price for Profit',
    slug: 'barbershop-pricing-psychology',
    categoryName: 'Business Growth',
    readTime: '9 min read'
  }
];

interface BlogPostPageProps {
  params: {
    slug: string;
  };
}

// This function generates metadata for each blog post
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = blogPosts.find(p => p.slug === params.slug);

  if (!post) {
    return {
      title: 'Post Not Found | Six Figure Barber Blog',
      description: 'The requested blog post could not be found.'
    };
  }

  return {
    title: `${post.title} | Six Figure Barber Blog`,
    description: post.excerpt,
    keywords: post.tags.join(', ') + ', barbershop, barber business, industry tips',
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  };
}

// This function generates static params for all blog posts
export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = blogPosts.find(p => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  // Schema markup for the blog post
  const blogPostSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "image": `https://sixfigurebarber.com${post.image}`,
    "author": {
      "@type": "Person",
      "name": post.author,
      "description": post.authorBio
    },
    "publisher": {
      "@type": "Organization",
      "name": "Six Figure Barber",
      "logo": {
        "@type": "ImageObject",
        "url": "https://sixfigurebarber.com/logo.png"
      }
    },
    "datePublished": post.publishedAt,
    "dateModified": post.updatedAt,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://sixfigurebarber.com/blog/${post.slug}`
    },
    "keywords": post.tags.join(", "),
    "articleSection": post.categoryName,
    "wordCount": post.content.replace(/<[^>]*>/g, '').split(' ').length,
    "timeRequired": `PT${post.readTime.replace(' min read', '')}M`
  };

  return (
    <>
      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostSchema) }}
      />

      <article className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-gray-50 to-white py-12 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
              <Link href="/" className="hover:text-blue-600">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/blog" className="hover:text-blue-600">Blog</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900">{post.categoryName}</span>
            </nav>

            {/* Back to Blog */}
            <Button asChild variant="outline" size="sm" className="mb-8">
              <Link href="/blog" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Link>
            </Button>

            {/* Article Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-blue-100 text-blue-800">{post.categoryName}</Badge>
                {post.featured && (
                  <Badge className="bg-purple-100 text-purple-800">Featured</Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {post.title}
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {post.excerpt}
              </p>

              {/* Article Meta */}
              <div className="flex flex-wrap items-center gap-6 text-gray-500">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>{post.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900">{post.author}</p>
                    <p className="text-sm">{post.authorBio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="text-sm">{new Date(post.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="text-sm">{post.readTime}</span>
                  </div>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex items-center gap-4 mt-6">
                <span className="text-sm font-medium text-gray-700">Share:</span>
                <Button variant="outline" size="sm" className="flex items-center">
                  <Share2 className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button variant="outline" size="sm" className="flex items-center">
                  <Share2 className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
                <Button variant="outline" size="sm" className="flex items-center">
                  <Share2 className="h-4 w-4 mr-2" />
                  Facebook
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Image */}
        <section className="px-4 mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BookOpen className="h-16 w-16 mx-auto mb-4" />
                <p className="font-medium">Article Featured Image</p>
                <p className="text-sm">Placeholder for {post.title}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Article Content */}
        <section className="px-4 mb-16">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-4 gap-12">
              {/* Main Content */}
              <div className="lg:col-span-3">
                <div
                  className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-ul:text-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:italic"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Article Tags */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="flex items-center">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Author Bio */}
                <Card className="mt-12">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-lg">
                          {post.author.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">About {post.author}</h3>
                        <p className="text-gray-600 mb-4">{post.authorBio}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Follow</Button>
                          <Button variant="outline" size="sm">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-8">
                  {/* Article Actions */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Article Actions</h3>
                      <div className="space-y-3">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Like Article
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Save for Later
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share Article
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Table of Contents */}
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-4">Table of Contents</h3>
                      <nav className="space-y-2 text-sm">
                        <a href="#" className="block text-blue-600 hover:text-blue-800">
                          The Real Cost of No-Shows
                        </a>
                        <a href="#" className="block text-gray-600 hover:text-blue-600">
                          Strategy 1: Implement a Deposit System
                        </a>
                        <a href="#" className="block text-gray-600 hover:text-blue-600">
                          Strategy 2: Automated Reminder System
                        </a>
                        <a href="#" className="block text-gray-600 hover:text-blue-600">
                          Strategy 3: Personalized Communication
                        </a>
                        <a href="#" className="block text-gray-600 hover:text-blue-600">
                          Strategy 4: Make Rescheduling Easy
                        </a>
                        <a href="#" className="block text-gray-600 hover:text-blue-600">
                          Implementing These Strategies
                        </a>
                      </nav>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related Posts */}
        <section className="py-16 bg-gray-50 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <Card key={relatedPost.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <div className="bg-gray-200 h-48 rounded-t-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <BookOpen className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Related Article</p>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-3">{relatedPost.categoryName}</Badge>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                      <Link href={`/blog/${relatedPost.slug}`} className="hover:text-blue-600">
                        {relatedPost.title}
                      </Link>
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{relatedPost.readTime}</span>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/blog/${relatedPost.slug}`}>Read More</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-blue-600 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Implement These Strategies?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Our platform makes it easy to reduce no-shows and grow your barbershop business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Link href="/contact">Schedule Demo</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/services">View Features</Link>
              </Button>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}
