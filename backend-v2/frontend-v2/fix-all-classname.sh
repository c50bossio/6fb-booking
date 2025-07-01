#!/bin/bash

echo "Fixing all className syntax errors..."

# Find all files with malformed className and fix them
find . -name "*.tsx" -type f -exec grep -l 'className= ' {} \; | while read file; do
  echo "Fixing: $file"
  # Fix pattern: className= bg-white dark:bg-gray-800 text-gray-900 dark:text-white"...rest..."
  sed -i '' 's/className= bg-white dark:bg-gray-800 text-gray-900 dark:text-white"\([^"]*\)"/className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white \1"/g' "$file"
  
  # Fix any other malformed className patterns
  sed -i '' 's/className= \([^"]\)/className="\1/g' "$file"
done

echo "Done! All className errors should be fixed."