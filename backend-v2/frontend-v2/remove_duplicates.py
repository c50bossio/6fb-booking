#!/usr/bin/env python3

import re

# Read the api.ts file
with open('/Users/bossio/6fb-booking/backend-v2/frontend-v2/lib/api.ts', 'r') as f:
    content = f.read()

# Find all function declarations
function_pattern = r'export async function (\w+)\('
functions = re.findall(function_pattern, content)

# Find duplicates
seen = set()
duplicates = set()
for func in functions:
    if func in seen:
        duplicates.add(func)
    else:
        seen.add(func)

print(f"Found {len(duplicates)} duplicate functions: {duplicates}")

# For each duplicate, remove all occurrences except the first one
for func_name in duplicates:
    # Find all occurrences of this function
    pattern = rf'(// [^\n]*\n)?export async function {re.escape(func_name)}\([^{{]*\{{[^}}]*\}}[^}}]*\}}'
    matches = list(re.finditer(pattern, content, re.DOTALL))
    
    if len(matches) > 1:
        print(f"Removing {len(matches)-1} duplicate(s) of {func_name}")
        # Remove from the end to avoid affecting indices
        for match in reversed(matches[1:]):
            content = content[:match.start()] + content[match.end():]

# Write the cleaned content back
with open('/Users/bossio/6fb-booking/backend-v2/frontend-v2/lib/api.ts', 'w') as f:
    f.write(content)

print("Cleanup complete!")