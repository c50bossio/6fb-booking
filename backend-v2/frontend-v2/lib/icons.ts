// Optimized icons module - single source of truth for all icons
// Tree-shaken imports to reduce bundle size

// Only import icons that are actually used across the app
export {
  // Common icons
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  
  // Navigation icons
  HomeIcon,
  CalendarDaysIcon,
  UsersIcon,
  Cog6ToothIcon as SettingsIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BellIcon,
  
  // Action icons
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon as SearchIcon,
  FunnelIcon as FilterIcon,
  ArrowDownTrayIcon as DownloadIcon,
  
  // Status icons
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  
  // Business icons
  BanknotesIcon,
  CreditCardIcon,
  GiftIcon,
  TrophyIcon,
  
} from '@heroicons/react/24/outline'

// Use solid variants for filled states
export {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
} from '@heroicons/react/24/solid'

// Re-export common lucide icons that aren't available in heroicons
export {
  RefreshCw,
  Download,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  Gift,
} from 'lucide-react'