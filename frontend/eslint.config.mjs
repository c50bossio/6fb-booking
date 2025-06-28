import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "6fb": await import("../eslint-plugin-6fb/lib/index.js"),
    },
    rules: {
      // Custom rules to prevent duplicate components and bad patterns
      "6fb/no-duplicate-component-names": "error",
      "6fb/no-prefixed-components": ["error", {
        forbiddenPrefixes: ["Enhanced", "Simple", "Demo", "Test", "Mock", "Temp", "Old", "New"],
        allowInTests: true,
        allowInDemos: true,
      }],
      "6fb/no-multiple-implementations": "error",
      "6fb/single-source-of-truth": ["error", {
        keyComponents: [
          "AuthProvider",
          "ThemeProvider",
          "Calendar",
          "BookingFlow",
          "PaymentForm",
          "Dashboard",
          "Navigation",
          "Layout",
        ],
        canonicalPaths: {
          AuthProvider: "src/components/AuthProvider",
          ThemeProvider: "src/contexts/ThemeContext",
          Calendar: "src/components/calendar/UnifiedCalendar",
          BookingFlow: "src/components/booking/BookingFlow",
          PaymentForm: "src/components/payments/PaymentForm",
        },
      }],
      "6fb/limit-directory-components": ["warn", {
        max: 10,
        directories: {
          "src/components": 15,
          "src/components/modals": 10,
          "src/components/booking": 10,
          "src/components/calendar": 8,
          "src/components/payments": 8,
        },
      }],
      "6fb/no-copy-paste-code": ["warn", {
        minLines: 5,
        threshold: 0.8,
      }],
    },
  },
];

export default eslintConfig;
