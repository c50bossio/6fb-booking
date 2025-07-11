#!/usr/bin/env python3
"""
Find route conflicts in Next.js app directory
Identifies pages that resolve to the same path
"""

import os
from collections import defaultdict
from pathlib import Path

def find_route_conflicts(app_dir):
    """Find conflicting routes in Next.js app directory"""
    
    # Find all page.tsx files
    page_files = []
    for root, dirs, files in os.walk(app_dir):
        if 'page.tsx' in files:
            page_files.append(os.path.join(root, 'page.tsx'))
    
    # Convert file paths to routes
    routes = defaultdict(list)
    
    for page_file in page_files:
        # Get relative path from app directory
        rel_path = os.path.relpath(page_file, app_dir)
        
        # Remove /page.tsx suffix
        route_path = rel_path.replace('/page.tsx', '')
        
        # Handle route groups by removing (auth), (public), etc.
        route_parts = route_path.split('/')
        clean_parts = []
        for part in route_parts:
            # Skip route groups (parts in parentheses)
            if not (part.startswith('(') and part.endswith(')')):
                clean_parts.append(part)
        
        # Reconstruct the route
        if clean_parts == ['.']:
            final_route = '/'
        else:
            final_route = '/' + '/'.join(clean_parts)
        
        routes[final_route].append(page_file)
    
    # Find conflicts
    conflicts = {}
    for route, files in routes.items():
        if len(files) > 1:
            conflicts[route] = files
    
    return conflicts, routes

def main():
    app_dir = '/Users/bossio/6fb-booking/backend-v2/frontend-v2/app'
    
    print("NEXT.JS ROUTE CONFLICT ANALYSIS")
    print("=" * 50)
    
    conflicts, all_routes = find_route_conflicts(app_dir)
    
    if conflicts:
        print(f"\n🚨 FOUND {len(conflicts)} ROUTE CONFLICTS:")
        print("-" * 50)
        
        for route, files in conflicts.items():
            print(f"\nRoute: {route}")
            print(f"Conflicting files:")
            for file in files:
                print(f"  - {file}")
        
        print(f"\n📋 RESOLUTION REQUIRED:")
        print("-" * 50)
        for route, files in conflicts.items():
            print(f"\nConflict for {route}:")
            print("Options:")
            print("1. Move one of the pages to a different directory")
            print("2. Use route groups consistently")
            print("3. Delete duplicate/unused pages")
            print("Files to review:")
            for file in files:
                print(f"  - {file}")
                
    else:
        print("\n✅ NO ROUTE CONFLICTS FOUND")
    
    print(f"\n📊 TOTAL ROUTES: {len(all_routes)}")
    
    # Show some sample routes for verification
    print(f"\n📝 SAMPLE ROUTES:")
    print("-" * 30)
    for route in sorted(list(all_routes.keys()))[:20]:
        print(f"  {route}")
    
    if len(all_routes) > 20:
        print(f"  ... and {len(all_routes) - 20} more")

if __name__ == "__main__":
    main()