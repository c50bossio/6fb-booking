const fs = require('fs');
const path = require('path');

// Files with className errors
const filesToFix = [
  'frontend-v2/components/BookingRulesList.tsx',
  'frontend-v2/components/BusinessHours.tsx',
  'frontend-v2/components/CalendarSync.tsx'
];

// Pattern to find malformed className attributes
const malformedPattern = /className=\s*bg-white dark:bg-gray-800 text-gray-900 dark:text-white"([^"]+)"/g;

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;
  
  // Fix malformed className attributes
  content = content.replace(malformedPattern, (match, classNames) => {
    return `className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${classNames}"`;
  });
  
  // Additional pattern for other malformed className
  content = content.replace(/className=\s*([^">\s][^">]*)"([^"]+)"/g, (match, prefix, suffix) => {
    return `className="${prefix} ${suffix}"`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed className attributes in: ${filePath}`);
  } else {
    console.log(`No changes needed in: ${filePath}`);
  }
});

console.log('\nDone! All className errors should be fixed.');