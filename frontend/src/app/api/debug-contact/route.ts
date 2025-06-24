import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const contactPath = path.join(process.cwd(), 'src/app/contact/page.tsx');
    
    if (!fs.existsSync(contactPath)) {
      return NextResponse.json({ 
        error: 'Contact page not found',
        path: contactPath,
        cwd: process.cwd()
      });
    }
    
    const content = fs.readFileSync(contactPath, 'utf8');
    const lines = content.split('\n');
    
    return NextResponse.json({ 
      lines: lines.length,
      hasUseClient: content.includes('use client'),
      hasLucide: content.includes('lucide-react'),
      firstLine: lines[0],
      lineWithMetadata: lines.findIndex(line => line.includes('export const metadata')),
      first30Lines: lines.slice(0, 30).join('\n'),
      fileSize: content.length,
      path: contactPath
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}