const fs = require('fs');
const path = require('path');

const contactPath = path.join(__dirname, '../src/app/contact/page.tsx');
const expectedContent = `// Contact page - server component
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us - 6FB Booking Platform',
  description: 'Get in touch with our support team',
}

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="text-gray-600 mb-4">
        For support, please email us at support@6fb.com
      </p>
      <p className="text-gray-600">
        We typically respond within 24 hours.
      </p>
    </div>
  )
}`;

console.log('🔍 Checking contact page...');
console.log('Script running from:', __dirname);
console.log('Contact page path:', contactPath);

// Always ensure directory exists
fs.mkdirSync(path.dirname(contactPath), { recursive: true });

if (!fs.existsSync(contactPath)) {
  console.log('⚠️  Contact page not found, creating...');
  fs.writeFileSync(contactPath, expectedContent);
  console.log('✅ Contact page created');
} else {
  const content = fs.readFileSync(contactPath, 'utf8');
  if (content.includes('use client') || content.includes('lucide-react')) {
    console.log('⚠️  Contact page has incorrect content (found "use client" or lucide imports), fixing...');
    fs.writeFileSync(contactPath, expectedContent);
    console.log('✅ Contact page corrected');
  } else if (content !== expectedContent) {
    console.log('⚠️  Contact page content differs from expected, but seems valid. Not changing.');
    console.log(`   Lines in file: ${content.split('\n').length}`);
    console.log(`   Has 'use client': ${content.includes('use client')}`);
    console.log(`   Has lucide imports: ${content.includes('lucide-react')}`);
  } else {
    console.log('✅ Contact page is correct');
  }
}
