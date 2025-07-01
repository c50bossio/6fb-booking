#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// Patterns to replace
const replacements = [
  // Input fields
  {
    pattern: /className="([^"]*\s)?border border-gray-300(\s[^"]*)?"/g,
    replacement: (match, before = '', after = '') => {
      // Check if it already has dark mode classes
      if (match.includes('dark:')) return match;
      
      // Add dark mode border color
      return `className="${before}border border-gray-300 dark:border-gray-600${after}"`;
    },
    description: 'Add dark mode border colors to inputs'
  },
  
  // Labels
  {
    pattern: /className="([^"]*\s)?text-gray-700(\s[^"]*)?"/g,
    replacement: (match, before = '', after = '') => {
      // Check if it already has dark mode classes
      if (match.includes('dark:')) return match;
      
      // Add dark mode text color
      return `className="${before}text-gray-700 dark:text-gray-300${after}"`;
    },
    description: 'Add dark mode text colors to labels'
  },
  
  // Input backgrounds
  {
    pattern: /className="([^"]*border border-gray-300[^"]*?)"/g,
    replacement: (match) => {
      // Check if it already has bg classes
      if (match.includes('bg-white') || match.includes('dark:bg-')) return match;
      
      // Add background colors
      return match.replace('"', ' bg-white dark:bg-gray-800 text-gray-900 dark:text-white"');
    },
    description: 'Add background colors to input fields'
  },
  
  // Text areas
  {
    pattern: /<textarea([^>]*?)className="([^"]*?)"/g,
    replacement: (match, attrs, classes) => {
      // Check if it already has dark mode classes
      if (classes.includes('dark:')) return match;
      
      // Check if it has border-gray-300
      if (classes.includes('border-gray-300')) {
        const newClasses = classes
          .replace('border-gray-300', 'border-gray-300 dark:border-gray-600')
          .replace(/^/, 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white ');
        return `<textarea${attrs}className="${newClasses}"`;
      }
      return match;
    },
    description: 'Update textarea elements'
  }
];

// Function to update a file
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    let changeCount = 0;
    
    replacements.forEach(({ pattern, replacement }) => {
      const originalContent = content;
      content = content.replace(pattern, replacement);
      
      if (content !== originalContent) {
        hasChanges = true;
        // Count number of replacements
        const matches = originalContent.match(pattern);
        if (matches) changeCount += matches.length;
      }
    });
    
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`${colors.green}✓${colors.reset} Updated ${colors.blue}${path.relative(process.cwd(), filePath)}${colors.reset} (${changeCount} changes)`);
      return changeCount;
    }
    
    return 0;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Error processing ${filePath}:`, error.message);
    return 0;
  }
}

// Main function
async function main() {
  console.log(`${colors.yellow}🎨 Updating form elements with dark mode support...${colors.reset}\n`);
  
  // Find all TSX files
  const files = glob.sync('**/*.tsx', {
    ignore: ['node_modules/**', '.next/**', 'test/**', '**/*.test.tsx', '**/*.spec.tsx']
  });
  
  console.log(`Found ${files.length} TSX files to process\n`);
  
  let totalChanges = 0;
  let filesUpdated = 0;
  
  // Process each file
  files.forEach(file => {
    const changes = updateFile(file);
    if (changes > 0) {
      totalChanges += changes;
      filesUpdated++;
    }
  });
  
  console.log(`\n${colors.green}✅ Dark mode update complete!${colors.reset}`);
  console.log(`   Files updated: ${filesUpdated}`);
  console.log(`   Total changes: ${totalChanges}`);
  
  // Recommendations
  if (filesUpdated > 0) {
    console.log(`\n${colors.yellow}💡 Recommendations:${colors.reset}`);
    console.log('   1. Review the changes to ensure they look correct');
    console.log('   2. Test both light and dark modes');
    console.log('   3. Consider using the global .form-input and .form-label classes');
    console.log('   4. For complex forms, consider using the Input component from components/ui/Input.tsx');
  }
}

// Run the script
main().catch(console.error);