# 🔧 Backend Integration Examples

## 🎯 Overview

This guide provides comprehensive examples for integrating with the Hybrid Payment System from backend services, scripts, and other applications. Examples include Python, Node.js, and curl-based integrations.

## 🐍 Python Integration

### Complete Python Client

```python
# hybrid_payment_client.py
import requests
import json
from typing import Optional, Dict, List, Any
from datetime import datetime
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class HybridPaymentClient:
    """
    Python client for the BookedBarber Hybrid Payment System API.
    
    Provides methods for payment processing, external processor management,
    commission collection, and analytics retrieval.
    """
    
    def __init__(self, base_url: str, auth_token: str, timeout: int = 30):
        """
        Initialize the client.
        
        Args:
            base_url: API base URL (e.g., 'https://api.bookedbarber.com/api/v1')
            auth_token: JWT authentication token
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json',
            'User-Agent': 'HybridPaymentClient/1.0'
        })
    
    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make authenticated API request."""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            # Handle empty responses
            if response.status_code == 204:
                return {}
            
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            error_data = {}
            try:
                error_data = response.json()
            except:
                pass
            
            raise HybridPaymentError(
                message=error_data.get('error', {}).get('message', str(e)),
                status_code=response.status_code,
                error_code=error_data.get('error', {}).get('code'),
                details=error_data.get('error', {}).get('details')
            )
        except requests.exceptions.RequestException as e:
            raise HybridPaymentError(f"Request failed: {str(e)}")
    
    # Payment Processing Methods
    
    def process_payment(self, appointment_id: int, amount: Decimal, 
                       currency: str = "USD", payment_method_data: Optional[Dict] = None,
                       client_preference: Optional[str] = None, 
                       metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process a payment using hybrid routing.
        
        Args:
            appointment_id: ID of the appointment
            amount: Payment amount
            currency: Currency code (default: USD)
            payment_method_data: Payment method information
            client_preference: Client's payment preference ('platform' or 'external')
            metadata: Additional payment metadata
            
        Returns:
            Payment result dictionary
        """
        data = {
            "appointment_id": appointment_id,
            "amount": float(amount),
            "currency": currency
        }
        
        if payment_method_data:
            data["payment_method_data"] = payment_method_data
        if client_preference:
            data["client_preference"] = client_preference
        if metadata:
            data["metadata"] = metadata
        
        return self._request("POST", "/hybrid-payments/process", data)
    
    def get_payment_routing(self, appointment_id: int, amount: Decimal,
                           currency: str = "USD", 
                           client_preference: Optional[str] = None) -> Dict[str, Any]:
        """
        Get payment routing information without processing.
        
        Args:
            appointment_id: ID of the appointment
            amount: Payment amount
            currency: Currency code
            client_preference: Client's payment preference
            
        Returns:
            Routing information dictionary
        """
        data = {
            "appointment_id": appointment_id,
            "amount": float(amount),
            "currency": currency
        }
        
        if client_preference:
            data["client_preference"] = client_preference
        
        return self._request("POST", "/hybrid-payments/route", data)
    
    def get_payment_options(self, barber_id: Optional[int] = None,
                           appointment_id: Optional[int] = None,
                           amount: Optional[Decimal] = None) -> Dict[str, Any]:
        """
        Get available payment options.
        
        Args:
            barber_id: Specific barber ID (None for current user)
            appointment_id: Appointment ID for context
            amount: Amount for fee calculations
            
        Returns:
            Payment options dictionary
        """
        endpoint = f"/hybrid-payments/options/{barber_id}" if barber_id else "/hybrid-payments/my-options"
        
        params = {}
        if appointment_id:
            params["appointment_id"] = appointment_id
        if amount:
            params["amount"] = float(amount)
        
        return self._request("GET", endpoint, params=params)
    
    def get_routing_statistics(self, barber_id: int, days: int = 30) -> Dict[str, Any]:
        """
        Get payment routing statistics.
        
        Args:
            barber_id: Barber ID
            days: Number of days to analyze
            
        Returns:
            Routing statistics dictionary
        """
        params = {"days": days}
        return self._request("GET", f"/hybrid-payments/routing-stats/{barber_id}", params=params)
    
    # External Payment Processor Methods
    
    def get_external_connections(self) -> Dict[str, Any]:
        """Get all external payment processor connections."""
        return self._request("GET", "/external-payments/connections")
    
    def create_external_connection(self, processor_type: str, account_id: str,
                                  account_name: str, connection_config: Dict[str, Any],
                                  webhook_notifications: bool = True) -> Dict[str, Any]:
        """
        Create a new external payment processor connection.
        
        Args:
            processor_type: Processor type ('stripe', 'square', 'paypal', etc.)
            account_id: External account identifier
            account_name: Display name for the account
            connection_config: Processor-specific configuration
            webhook_notifications: Enable webhook notifications
            
        Returns:
            Created connection information
        """
        data = {
            "processor_type": processor_type,
            "account_id": account_id,
            "account_name": account_name,
            "connection_config": connection_config,
            "webhook_notifications": webhook_notifications
        }
        
        return self._request("POST", "/external-payments/connections", data)
    
    def get_external_connection(self, connection_id: int) -> Dict[str, Any]:
        """Get details for a specific external connection."""
        return self._request("GET", f"/external-payments/connections/{connection_id}")
    
    def update_external_connection(self, connection_id: int, 
                                  updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing external connection.
        
        Args:
            connection_id: Connection ID
            updates: Updates to apply
            
        Returns:
            Updated connection information
        """
        return self._request("PUT", f"/external-payments/connections/{connection_id}", updates)
    
    def delete_external_connection(self, connection_id: int) -> Dict[str, Any]:
        """Delete an external payment processor connection."""
        return self._request("DELETE", f"/external-payments/connections/{connection_id}")
    
    def sync_external_transactions(self, connection_id: int, 
                                  since: Optional[datetime] = None,
                                  force: bool = False) -> Dict[str, Any]:
        """
        Manually sync transactions from external processor.
        
        Args:
            connection_id: Connection ID
            since: Sync transactions since this timestamp
            force: Force full resync
            
        Returns:
            Sync result information
        """
        params = {"force": force}
        if since:
            params["since"] = since.isoformat()
        
        return self._request("POST", f"/external-payments/connections/{connection_id}/sync", params=params)
    
    def get_external_transactions(self, connection_id: Optional[int] = None,
                                 status: Optional[str] = None,
                                 since: Optional[datetime] = None,
                                 until: Optional[datetime] = None,
                                 limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """
        Get external transactions with filtering.
        
        Args:
            connection_id: Filter by connection ID
            status: Filter by status
            since: Transactions since this date
            until: Transactions until this date
            limit: Maximum results
            offset: Pagination offset
            
        Returns:
            Transactions list and metadata
        """
        params = {"limit": limit, "offset": offset}
        
        if connection_id:
            params["connection_id"] = connection_id
        if status:
            params["status"] = status
        if since:
            params["since"] = since.isoformat()
        if until:
            params["until"] = until.isoformat()
        
        return self._request("GET", "/external-payments/transactions", params=params)
    
    # Platform Collections Methods
    
    def get_my_collections(self, status: Optional[str] = None,
                          since: Optional[datetime] = None,
                          until: Optional[datetime] = None,
                          limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """
        Get commission collections for current barber.
        
        Args:
            status: Filter by status
            since: Collections since this date
            until: Collections until this date
            limit: Maximum results
            offset: Pagination offset
            
        Returns:
            Collections list and summary
        """
        params = {"limit": limit, "offset": offset}
        
        if status:
            params["status"] = status
        if since:
            params["since"] = since.isoformat()
        if until:
            params["until"] = until.isoformat()
        
        return self._request("GET", "/platform-collections/my-collections", params=params)
    
    def get_collection(self, collection_id: int) -> Dict[str, Any]:
        """Get details for a specific collection."""
        return self._request("GET", f"/platform-collections/collections/{collection_id}")
    
    def retry_collection(self, collection_id: int, collection_method: str = "stripe_connect",
                        retry_reason: Optional[str] = None) -> Dict[str, Any]:
        """
        Retry a failed collection.
        
        Args:
            collection_id: Collection ID
            collection_method: Collection method
            retry_reason: Reason for retry
            
        Returns:
            Retry result information
        """
        data = {"collection_method": collection_method}
        if retry_reason:
            data["retry_reason"] = retry_reason
        
        return self._request("POST", f"/platform-collections/collections/{collection_id}/retry", data)
    
    def get_collections_summary(self, period: str = "30_days") -> Dict[str, Any]:
        """
        Get commission collection summary.
        
        Args:
            period: Summary period ('7_days', '30_days', '90_days', '1_year')
            
        Returns:
            Collection summary
        """
        params = {"period": period}
        return self._request("GET", "/platform-collections/summary", params=params)
    
    # Analytics Methods
    
    def get_analytics_dashboard(self) -> Dict[str, Any]:
        """Get real-time dashboard data."""
        return self._request("GET", "/unified-payment-analytics/dashboard")
    
    def get_unified_analytics(self, period: str = "30_days",
                             include_projections: bool = False,
                             include_six_figure_insights: bool = True) -> Dict[str, Any]:
        """
        Get comprehensive unified analytics.
        
        Args:
            period: Analytics period
            include_projections: Include revenue projections
            include_six_figure_insights: Include Six Figure Barber insights
            
        Returns:
            Unified analytics data
        """
        params = {
            "period": period,
            "include_projections": include_projections,
            "include_six_figure_insights": include_six_figure_insights
        }
        
        return self._request("GET", "/unified-payment-analytics/analytics", params=params)
    
    def get_revenue_optimization(self) -> Dict[str, Any]:
        """Get revenue optimization insights and recommendations."""
        return self._request("GET", "/unified-payment-analytics/revenue-optimization")
    
    def get_six_figure_insights(self) -> Dict[str, Any]:
        """Get Six Figure Barber methodology insights."""
        return self._request("GET", "/unified-payment-analytics/six-figure-insights")


class HybridPaymentError(Exception):
    """Exception raised for Hybrid Payment API errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None,
                 error_code: Optional[str] = None, details: Optional[Dict] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
    
    def __str__(self):
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


# Usage Examples

if __name__ == "__main__":
    # Initialize client
    client = HybridPaymentClient(
        base_url="https://api.bookedbarber.com/api/v1",
        auth_token="your_jwt_token_here"
    )
    
    try:
        # Get payment options
        options = client.get_payment_options()
        print(f"Payment mode: {options['payment_mode']}")
        print(f"Available methods: {len(options['available_methods'])}")
        
        # Get analytics dashboard
        dashboard = client.get_analytics_dashboard()
        print(f"Today's revenue: ${dashboard['today']['total_volume']}")
        
        # Process a payment
        result = client.process_payment(
            appointment_id=123,
            amount=Decimal('75.00'),
            client_preference='external',
            metadata={'source': 'api_client'}
        )
        print(f"Payment processed: {result['payment_id']}")
        
    except HybridPaymentError as e:
        print(f"API Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
```

### Payment Processing Script

```python
# process_batch_payments.py
#!/usr/bin/env python3
"""
Batch payment processing script for the Hybrid Payment System.
Processes multiple appointments with intelligent routing.
"""

import csv
import json
import argparse
from decimal import Decimal
from datetime import datetime
from hybrid_payment_client import HybridPaymentClient, HybridPaymentError

def process_batch_payments(client: HybridPaymentClient, csv_file: str, 
                          dry_run: bool = False) -> Dict[str, Any]:
    """
    Process batch payments from CSV file.
    
    CSV format: appointment_id,amount,currency,client_preference,metadata
    """
    results = {
        'processed': [],
        'failed': [],
        'total_amount': Decimal('0'),
        'total_fees': Decimal('0'),
        'summary': {}
    }
    
    with open(csv_file, 'r') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            appointment_id = int(row['appointment_id'])
            amount = Decimal(row['amount'])
            currency = row.get('currency', 'USD')
            client_preference = row.get('client_preference')
            metadata = json.loads(row.get('metadata', '{}'))
            
            # Add batch processing metadata
            metadata.update({
                'batch_processed': True,
                'batch_timestamp': datetime.now().isoformat(),
                'dry_run': dry_run
            })
            
            try:
                if dry_run:
                    # Get routing information without processing
                    result = client.get_payment_routing(
                        appointment_id=appointment_id,
                        amount=amount,
                        currency=currency,
                        client_preference=client_preference
                    )
                    
                    # Simulate successful processing
                    result.update({
                        'appointment_id': appointment_id,
                        'amount': float(amount),
                        'status': 'simulated',
                        'dry_run': True
                    })
                else:
                    # Process actual payment
                    result = client.process_payment(
                        appointment_id=appointment_id,
                        amount=amount,
                        currency=currency,
                        client_preference=client_preference,
                        metadata=metadata
                    )
                
                results['processed'].append(result)
                results['total_amount'] += amount
                results['total_fees'] += Decimal(str(result.get('processing_fee', 0)))
                
                print(f"✅ Processed appointment {appointment_id}: ${amount} via {result.get('routing_decision', 'unknown')}")
                
            except HybridPaymentError as e:
                error_info = {
                    'appointment_id': appointment_id,
                    'amount': float(amount),
                    'error': str(e),
                    'error_code': e.error_code,
                    'timestamp': datetime.now().isoformat()
                }
                results['failed'].append(error_info)
                
                print(f"❌ Failed appointment {appointment_id}: {e}")
            
            except Exception as e:
                error_info = {
                    'appointment_id': appointment_id,
                    'amount': float(amount),
                    'error': f"Unexpected error: {str(e)}",
                    'timestamp': datetime.now().isoformat()
                }
                results['failed'].append(error_info)
                
                print(f"💥 Unexpected error for appointment {appointment_id}: {e}")
    
    # Generate summary
    results['summary'] = {
        'total_processed': len(results['processed']),
        'total_failed': len(results['failed']),
        'success_rate': len(results['processed']) / (len(results['processed']) + len(results['failed'])) * 100,
        'total_amount': float(results['total_amount']),
        'total_fees': float(results['total_fees']),
        'effective_rate': float(results['total_fees'] / results['total_amount'] * 100) if results['total_amount'] > 0 else 0
    }
    
    return results

def generate_report(results: Dict[str, Any], output_file: str):
    """Generate detailed report of batch processing results."""
    with open(output_file, 'w') as file:
        file.write("HYBRID PAYMENT BATCH PROCESSING REPORT\n")
        file.write("=" * 50 + "\n\n")
        
        # Summary
        summary = results['summary']
        file.write(f"Summary:\n")
        file.write(f"  Total processed: {summary['total_processed']}\n")
        file.write(f"  Total failed: {summary['total_failed']}\n")
        file.write(f"  Success rate: {summary['success_rate']:.1f}%\n")
        file.write(f"  Total amount: ${summary['total_amount']:.2f}\n")
        file.write(f"  Total fees: ${summary['total_fees']:.2f}\n")
        file.write(f"  Effective rate: {summary['effective_rate']:.2f}%\n\n")
        
        # Successful payments
        if results['processed']:
            file.write("Successful Payments:\n")
            file.write("-" * 20 + "\n")
            for payment in results['processed']:
                file.write(f"  Appointment {payment['appointment_id']}: ")
                file.write(f"${payment['amount']:.2f} via {payment.get('routing_decision', 'unknown')}\n")
        
        # Failed payments
        if results['failed']:
            file.write("\nFailed Payments:\n")
            file.write("-" * 15 + "\n")
            for failure in results['failed']:
                file.write(f"  Appointment {failure['appointment_id']}: {failure['error']}\n")
    
    print(f"Report saved to {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Batch payment processing for Hybrid Payment System')
    parser.add_argument('csv_file', help='CSV file with payment data')
    parser.add_argument('--api-url', default='http://localhost:8000/api/v1', help='API base URL')
    parser.add_argument('--token', required=True, help='JWT authentication token')
    parser.add_argument('--dry-run', action='store_true', help='Test mode - no actual payments processed')
    parser.add_argument('--report', default='batch_report.txt', help='Output report file')
    
    args = parser.parse_args()
    
    # Initialize client
    client = HybridPaymentClient(
        base_url=args.api_url,
        auth_token=args.token
    )
    
    print(f"Processing payments from {args.csv_file}")
    if args.dry_run:
        print("DRY RUN MODE - No actual payments will be processed")
    
    # Process payments
    results = process_batch_payments(client, args.csv_file, args.dry_run)
    
    # Generate report
    generate_report(results, args.report)
    
    # Print summary
    summary = results['summary']
    print(f"\n📊 BATCH PROCESSING COMPLETE")
    print(f"✅ Processed: {summary['total_processed']}")
    print(f"❌ Failed: {summary['total_failed']}")
    print(f"💰 Total: ${summary['total_amount']:.2f}")
    print(f"📈 Success rate: {summary['success_rate']:.1f}%")

if __name__ == "__main__":
    main()
```

### Analytics Report Generator

```python
# generate_analytics_report.py
#!/usr/bin/env python3
"""
Generate comprehensive analytics reports for the Hybrid Payment System.
"""

import argparse
import json
from datetime import datetime, timedelta
from hybrid_payment_client import HybridPaymentClient
import matplotlib.pyplot as plt
import pandas as pd

class AnalyticsReportGenerator:
    """Generate analytics reports with charts and insights."""
    
    def __init__(self, client: HybridPaymentClient):
        self.client = client
        
    def generate_payment_performance_report(self, period: str = "30_days") -> Dict[str, Any]:
        """Generate payment performance report."""
        # Get unified analytics
        analytics = self.client.get_unified_analytics(
            period=period,
            include_projections=True,
            include_six_figure_insights=True
        )
        
        # Get routing statistics
        routing_stats = self.client.get_routing_statistics(
            barber_id=analytics.get('barber_id', 1),  # Assuming current user
            days=int(period.split('_')[0]) if '_' in period else 30
        )
        
        # Get revenue optimization insights
        optimization = self.client.get_revenue_optimization()
        
        report = {
            'period': period,
            'generated_at': datetime.now().isoformat(),
            'analytics': analytics,
            'routing_stats': routing_stats,
            'optimization': optimization,
            'insights': self._generate_insights(analytics, routing_stats, optimization)
        }
        
        return report
    
    def _generate_insights(self, analytics: Dict, routing_stats: Dict, 
                          optimization: Dict) -> List[str]:
        """Generate actionable insights from analytics data."""
        insights = []
        
        # Payment mode analysis
        centralized = analytics.get('centralized_payments', {})
        decentralized = analytics.get('decentralized_payments', {})
        
        if centralized.get('total_volume', 0) > decentralized.get('total_volume', 0):
            insights.append(
                f"Centralized payments account for {centralized.get('total_volume', 0) / (centralized.get('total_volume', 0) + decentralized.get('total_volume', 0)) * 100:.1f}% of volume. "
                f"Consider increasing external processor usage to reduce fees."
            )
        
        # Success rate analysis
        if routing_stats.get('success_rates', {}).get('external', 0) < 95:
            insights.append(
                f"External processor success rate is {routing_stats.get('success_rates', {}).get('external', 0):.1f}%. "
                f"Review external connections and consider fallback configuration."
            )
        
        # Six Figure Barber progress
        six_figure = analytics.get('six_figure_insights', {})
        if six_figure.get('progress_percentage', 0) < 80:
            insights.append(
                f"Currently at {six_figure.get('progress_percentage', 0):.1f}% of Six Figure Barber target. "
                f"Need ${six_figure.get('gap_to_target', 0):,.2f} more monthly revenue to reach goal."
            )
        
        # Fee optimization
        potential_savings = optimization.get('potential_monthly_increase', 0)
        if potential_savings > 50:
            insights.append(
                f"Potential monthly savings of ${potential_savings:.2f} identified through payment mode optimization."
            )
        
        return insights
    
    def create_charts(self, analytics: Dict, output_dir: str = "."):
        """Create visualization charts from analytics data."""
        # Payment mode distribution pie chart
        centralized_volume = analytics.get('centralized_payments', {}).get('total_volume', 0)
        decentralized_volume = analytics.get('decentralized_payments', {}).get('total_volume', 0)
        
        if centralized_volume + decentralized_volume > 0:
            plt.figure(figsize=(10, 6))
            
            # Pie chart for payment mode distribution
            plt.subplot(1, 2, 1)
            labels = ['Centralized', 'Decentralized']
            sizes = [centralized_volume, decentralized_volume]
            colors = ['#FF6B6B', '#4ECDC4']
            
            plt.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
            plt.title('Payment Volume by Mode')
            
            # Bar chart for success rates
            plt.subplot(1, 2, 2)
            success_rates = [
                analytics.get('centralized_payments', {}).get('success_rate', 0),
                analytics.get('decentralized_payments', {}).get('success_rate', 0)
            ]
            
            plt.bar(labels, success_rates, color=colors)
            plt.title('Success Rates by Mode')
            plt.ylabel('Success Rate (%)')
            plt.ylim(0, 100)
            
            plt.tight_layout()
            plt.savefig(f"{output_dir}/payment_analysis.png", dpi=300, bbox_inches='tight')
            plt.close()
        
        # Six Figure Barber progress chart
        six_figure = analytics.get('six_figure_insights', {})
        if six_figure:
            plt.figure(figsize=(10, 4))
            
            current_revenue = six_figure.get('current_monthly_revenue', 0)
            target_revenue = six_figure.get('target_monthly_revenue', 8333.33)
            
            # Progress bar
            progress = six_figure.get('progress_percentage', 0)
            
            plt.barh(['Progress to $100K'], [progress], color='#4ECDC4', height=0.3)
            plt.barh(['Progress to $100K'], [100 - progress], left=[progress], color='#E0E0E0', height=0.3)
            
            plt.xlim(0, 100)
            plt.xlabel('Progress (%)')
            plt.title(f'Six Figure Barber Progress: ${current_revenue:,.0f} / ${target_revenue:,.0f} monthly')
            
            # Add text annotation
            plt.text(progress / 2, 0, f'{progress:.1f}%', ha='center', va='center', fontweight='bold')
            
            plt.tight_layout()
            plt.savefig(f"{output_dir}/six_figure_progress.png", dpi=300, bbox_inches='tight')
            plt.close()
    
    def export_data_csv(self, analytics: Dict, filename: str):
        """Export analytics data to CSV for external analysis."""
        # Prepare data for export
        data = []
        
        # Centralized payments data
        centralized = analytics.get('centralized_payments', {})
        data.append({
            'payment_mode': 'centralized',
            'total_transactions': centralized.get('total_transactions', 0),
            'total_volume': centralized.get('total_volume', 0),
            'net_earnings': centralized.get('net_earnings', 0),
            'success_rate': centralized.get('success_rate', 0),
            'average_transaction': centralized.get('average_transaction', 0),
            'processing_fees': centralized.get('processing_fees', 0)
        })
        
        # Decentralized payments data
        decentralized = analytics.get('decentralized_payments', {})
        data.append({
            'payment_mode': 'decentralized',
            'total_transactions': decentralized.get('total_transactions', 0),
            'total_volume': decentralized.get('total_volume', 0),
            'net_earnings': 0,  # Not directly tracked for external
            'success_rate': decentralized.get('success_rate', 0),
            'average_transaction': decentralized.get('average_transaction', 0),
            'processing_fees': decentralized.get('external_processor_fees', 0)
        })
        
        # Create DataFrame and export
        df = pd.DataFrame(data)
        df.to_csv(filename, index=False)
        print(f"Analytics data exported to {filename}")

def main():
    parser = argparse.ArgumentParser(description='Generate analytics reports for Hybrid Payment System')
    parser.add_argument('--api-url', default='http://localhost:8000/api/v1', help='API base URL')
    parser.add_argument('--token', required=True, help='JWT authentication token')
    parser.add_argument('--period', default='30_days', help='Analytics period')
    parser.add_argument('--output-dir', default='.', help='Output directory for reports')
    parser.add_argument('--format', choices=['json', 'charts', 'csv', 'all'], default='all', help='Output format')
    
    args = parser.parse_args()
    
    # Initialize client
    client = HybridPaymentClient(
        base_url=args.api_url,
        auth_token=args.token
    )
    
    # Generate report
    generator = AnalyticsReportGenerator(client)
    
    print(f"Generating analytics report for period: {args.period}")
    
    try:
        report = generator.generate_payment_performance_report(args.period)
        
        # Output in requested formats
        if args.format in ['json', 'all']:
            report_file = f"{args.output_dir}/analytics_report_{args.period}.json"
            with open(report_file, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            print(f"JSON report saved to {report_file}")
        
        if args.format in ['charts', 'all']:
            generator.create_charts(report['analytics'], args.output_dir)
            print(f"Charts saved to {args.output_dir}")
        
        if args.format in ['csv', 'all']:
            csv_file = f"{args.output_dir}/analytics_data_{args.period}.csv"
            generator.export_data_csv(report['analytics'], csv_file)
        
        # Print key insights
        print(f"\n📊 KEY INSIGHTS:")
        for insight in report['insights']:
            print(f"  • {insight}")
        
        # Print summary
        combined = report['analytics'].get('combined_metrics', {})
        print(f"\n📈 SUMMARY:")
        print(f"  Total transactions: {combined.get('total_transactions', 0):,}")
        print(f"  Total volume: ${combined.get('total_volume', 0):,.2f}")
        print(f"  Net earnings: ${combined.get('total_net_earnings', 0):,.2f}")
        print(f"  Success rate: {combined.get('weighted_success_rate', 0):.1f}%")
        
    except Exception as e:
        print(f"Error generating report: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
```

## 🟢 Node.js Integration

### Node.js Client Library

```javascript
// hybrid-payment-client.js
const axios = require('axios');

class HybridPaymentClient {
    /**
     * Node.js client for the BookedBarber Hybrid Payment System API.
     */
    constructor(baseUrl, authToken, timeout = 30000) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.authToken = authToken;
        
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: timeout,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'HybridPaymentClient-NodeJS/1.0'
            }
        });
        
        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.response) {
                    const errorData = error.response.data?.error || {};
                    throw new HybridPaymentError(
                        errorData.message || error.message,
                        error.response.status,
                        errorData.code,
                        errorData.details
                    );
                }
                throw new HybridPaymentError(error.message);
            }
        );
    }
    
    // Payment Processing Methods
    
    async processPayment(appointmentId, amount, options = {}) {
        const data = {
            appointment_id: appointmentId,
            amount: parseFloat(amount),
            currency: options.currency || 'USD',
            ...options
        };
        
        const response = await this.client.post('/hybrid-payments/process', data);
        return response.data;
    }
    
    async getPaymentRouting(appointmentId, amount, options = {}) {
        const data = {
            appointment_id: appointmentId,
            amount: parseFloat(amount),
            currency: options.currency || 'USD',
            ...options
        };
        
        const response = await this.client.post('/hybrid-payments/route', data);
        return response.data;
    }
    
    async getPaymentOptions(barberId = null, appointmentId = null, amount = null) {
        const endpoint = barberId 
            ? `/hybrid-payments/options/${barberId}`
            : '/hybrid-payments/my-options';
        
        const params = {};
        if (appointmentId) params.appointment_id = appointmentId;
        if (amount) params.amount = parseFloat(amount);
        
        const response = await this.client.get(endpoint, { params });
        return response.data;
    }
    
    async getRoutingStatistics(barberId, days = 30) {
        const response = await this.client.get(
            `/hybrid-payments/routing-stats/${barberId}`,
            { params: { days } }
        );
        return response.data;
    }
    
    // External Payment Processor Methods
    
    async getExternalConnections() {
        const response = await this.client.get('/external-payments/connections');
        return response.data;
    }
    
    async createExternalConnection(processorType, accountId, accountName, connectionConfig, webhookNotifications = true) {
        const data = {
            processor_type: processorType,
            account_id: accountId,
            account_name: accountName,
            connection_config: connectionConfig,
            webhook_notifications: webhookNotifications
        };
        
        const response = await this.client.post('/external-payments/connections', data);
        return response.data;
    }
    
    async getExternalConnection(connectionId) {
        const response = await this.client.get(`/external-payments/connections/${connectionId}`);
        return response.data;
    }
    
    async updateExternalConnection(connectionId, updates) {
        const response = await this.client.put(`/external-payments/connections/${connectionId}`, updates);
        return response.data;
    }
    
    async deleteExternalConnection(connectionId) {
        const response = await this.client.delete(`/external-payments/connections/${connectionId}`);
        return response.data;
    }
    
    async syncExternalTransactions(connectionId, since = null, force = false) {
        const params = { force };
        if (since) {
            params.since = since instanceof Date ? since.toISOString() : since;
        }
        
        const response = await this.client.post(
            `/external-payments/connections/${connectionId}/sync`,
            null,
            { params }
        );
        return response.data;
    }
    
    async getExternalTransactions(options = {}) {
        const params = {
            limit: options.limit || 50,
            offset: options.offset || 0
        };
        
        if (options.connectionId) params.connection_id = options.connectionId;
        if (options.status) params.status = options.status;
        if (options.since) {
            params.since = options.since instanceof Date ? options.since.toISOString() : options.since;
        }
        if (options.until) {
            params.until = options.until instanceof Date ? options.until.toISOString() : options.until;
        }
        
        const response = await this.client.get('/external-payments/transactions', { params });
        return response.data;
    }
    
    // Platform Collections Methods
    
    async getMyCollections(options = {}) {
        const params = {
            limit: options.limit || 50,
            offset: options.offset || 0
        };
        
        if (options.status) params.status = options.status;
        if (options.since) {
            params.since = options.since instanceof Date ? options.since.toISOString() : options.since;
        }
        if (options.until) {
            params.until = options.until instanceof Date ? options.until.toISOString() : options.until;
        }
        
        const response = await this.client.get('/platform-collections/my-collections', { params });
        return response.data;
    }
    
    async getCollection(collectionId) {
        const response = await this.client.get(`/platform-collections/collections/${collectionId}`);
        return response.data;
    }
    
    async retryCollection(collectionId, collectionMethod = 'stripe_connect', retryReason = null) {
        const data = { collection_method: collectionMethod };
        if (retryReason) data.retry_reason = retryReason;
        
        const response = await this.client.post(
            `/platform-collections/collections/${collectionId}/retry`,
            data
        );
        return response.data;
    }
    
    async getCollectionsSummary(period = '30_days') {
        const response = await this.client.get('/platform-collections/summary', {
            params: { period }
        });
        return response.data;
    }
    
    // Analytics Methods
    
    async getAnalyticsDashboard() {
        const response = await this.client.get('/unified-payment-analytics/dashboard');
        return response.data;
    }
    
    async getUnifiedAnalytics(period = '30_days', includeProjections = false, includeSixFigureInsights = true) {
        const params = {
            period,
            include_projections: includeProjections,
            include_six_figure_insights: includeSixFigureInsights
        };
        
        const response = await this.client.get('/unified-payment-analytics/analytics', { params });
        return response.data;
    }
    
    async getRevenueOptimization() {
        const response = await this.client.get('/unified-payment-analytics/revenue-optimization');
        return response.data;
    }
    
    async getSixFigureInsights() {
        const response = await this.client.get('/unified-payment-analytics/six-figure-insights');
        return response.data;
    }
}

class HybridPaymentError extends Error {
    constructor(message, statusCode = null, errorCode = null, details = null) {
        super(message);
        this.name = 'HybridPaymentError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details || {};
    }
}

module.exports = { HybridPaymentClient, HybridPaymentError };
```

### Express.js Integration Example

```javascript
// express-integration.js
const express = require('express');
const { HybridPaymentClient, HybridPaymentError } = require('./hybrid-payment-client');

const app = express();
app.use(express.json());

// Initialize hybrid payment client
const paymentClient = new HybridPaymentClient(
    process.env.HYBRID_PAYMENT_API_URL || 'http://localhost:8000/api/v1',
    process.env.HYBRID_PAYMENT_AUTH_TOKEN
);

// Middleware for authentication
const authenticateUser = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Authentication token required' });
    }
    
    // Verify token and set user context
    // Implementation depends on your auth system
    req.user = { id: 1, role: 'barber' }; // Mock user
    next();
};

// Payment processing endpoint
app.post('/api/appointments/:id/payment', authenticateUser, async (req, res) => {
    try {
        const appointmentId = parseInt(req.params.id);
        const { amount, currency, payment_method_data, client_preference } = req.body;
        
        // Process payment through hybrid system
        const result = await paymentClient.processPayment(appointmentId, amount, {
            currency,
            payment_method_data,
            client_preference,
            metadata: {
                user_id: req.user.id,
                source: 'express_api',
                timestamp: new Date().toISOString()
            }
        });
        
        res.json({
            success: true,
            payment: result
        });
        
    } catch (error) {
        if (error instanceof HybridPaymentError) {
            res.status(error.statusCode || 400).json({
                success: false,
                error: {
                    message: error.message,
                    code: error.errorCode,
                    details: error.details
                }
            });
        } else {
            console.error('Unexpected payment error:', error);
            res.status(500).json({
                success: false,
                error: { message: 'Internal server error' }
            });
        }
    }
});

// Get payment options endpoint
app.get('/api/barbers/:id/payment-options', authenticateUser, async (req, res) => {
    try {
        const barberId = parseInt(req.params.id);
        const { appointment_id, amount } = req.query;
        
        // Check authorization
        if (req.user.id !== barberId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: { message: 'Access denied' }
            });
        }
        
        const options = await paymentClient.getPaymentOptions(
            barberId,
            appointment_id ? parseInt(appointment_id) : null,
            amount ? parseFloat(amount) : null
        );
        
        res.json({
            success: true,
            options
        });
        
    } catch (error) {
        console.error('Error getting payment options:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to get payment options' }
        });
    }
});

// Analytics dashboard endpoint
app.get('/api/analytics/dashboard', authenticateUser, async (req, res) => {
    try {
        const dashboard = await paymentClient.getAnalyticsDashboard();
        
        res.json({
            success: true,
            dashboard
        });
        
    } catch (error) {
        console.error('Error getting analytics dashboard:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to get analytics dashboard' }
        });
    }
});

// External processor webhook handler
app.post('/api/webhooks/:processor/:connectionId', async (req, res) => {
    try {
        const { processor, connectionId } = req.params;
        const webhookData = req.body;
        const signature = req.headers['x-square-signature'] || req.headers['stripe-signature'];
        
        console.log(`Received ${processor} webhook for connection ${connectionId}`);
        
        // Verify webhook signature (implementation depends on processor)
        // For production, implement proper signature verification
        
        // Process webhook data
        // You might want to:
        // 1. Trigger transaction sync
        // 2. Update connection status
        // 3. Send notifications
        // 4. Update analytics cache
        
        // Trigger transaction sync
        await paymentClient.syncExternalTransactions(parseInt(connectionId));
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Background job for syncing external transactions
const syncExternalTransactions = async () => {
    try {
        console.log('Starting external transaction sync...');
        
        const connections = await paymentClient.getExternalConnections();
        
        for (const connection of connections.connections) {
            if (connection.status === 'connected') {
                try {
                    const result = await paymentClient.syncExternalTransactions(connection.id);
                    console.log(`Synced ${result.transactions_synced} transactions for ${connection.processor_type}`);
                } catch (error) {
                    console.error(`Sync failed for connection ${connection.id}:`, error.message);
                }
            }
        }
        
        console.log('External transaction sync completed');
        
    } catch (error) {
        console.error('External transaction sync error:', error);
    }
};

// Run sync every 15 minutes
setInterval(syncExternalTransactions, 15 * 60 * 1000);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'hybrid-payment-integration'
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Run initial sync
    setTimeout(syncExternalTransactions, 5000);
});

module.exports = app;
```

## 🐚 Shell Script Integration

### Bash Monitoring Script

```bash
#!/bin/bash
# hybrid-payment-monitor.sh
# Monitoring script for Hybrid Payment System

set -euo pipefail

# Configuration
API_URL="${HYBRID_PAYMENT_API_URL:-http://localhost:8000/api/v1}"
AUTH_TOKEN="${HYBRID_PAYMENT_AUTH_TOKEN:-}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@bookedbarber.com}"
LOG_FILE="/var/log/hybrid-payment-monitor.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if required tools are available
check_dependencies() {
    local missing_deps=()
    
    for cmd in curl jq; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

# Make API request
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    
    local curl_opts=(
        -X "$method"
        -H "Authorization: Bearer $AUTH_TOKEN"
        -H "Content-Type: application/json"
        -w "%{http_code}"
        -s
        --max-time 30
    )
    
    if [[ -n "$data" ]]; then
        curl_opts+=(-d "$data")
    fi
    
    local response
    response=$(curl "${curl_opts[@]}" "$API_URL$endpoint")
    
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        echo "$body"
        return 0
    else
        error "API request failed: $method $endpoint (HTTP $http_code)"
        if [[ -n "$body" ]]; then
            echo "$body" | jq -r '.error.message // "Unknown error"' 2>/dev/null || echo "$body"
        fi
        return 1
    fi
}

# Check API health
check_api_health() {
    log "Checking API health..."
    
    if response=$(api_request GET "/health" 2>/dev/null); then
        success "API is healthy"
        return 0
    else
        error "API health check failed"
        return 1
    fi
}

# Check payment processing
check_payment_processing() {
    log "Checking payment processing..."
    
    # Test payment routing (dry run)
    local test_data='{"appointment_id": 1, "amount": 50.00, "currency": "USD"}'
    
    if response=$(api_request POST "/hybrid-payments/route" "$test_data" 2>/dev/null); then
        local routing_decision
        routing_decision=$(echo "$response" | jq -r '.routing_decision // "unknown"')
        success "Payment routing working (decision: $routing_decision)"
        return 0
    else
        error "Payment routing test failed"
        return 1
    fi
}

# Check external connections
check_external_connections() {
    log "Checking external payment processor connections..."
    
    if response=$(api_request GET "/external-payments/connections" 2>/dev/null); then
        local total_connections
        local connected_count
        
        total_connections=$(echo "$response" | jq -r '.total_connections // 0')
        connected_count=$(echo "$response" | jq -r '[.connections[] | select(.status == "connected")] | length')
        
        if [[ "$total_connections" -eq 0 ]]; then
            warning "No external payment processor connections configured"
        elif [[ "$connected_count" -lt "$total_connections" ]]; then
            warning "$connected_count/$total_connections external connections are healthy"
            
            # List failed connections
            echo "$response" | jq -r '.connections[] | select(.status != "connected") | "  - \(.processor_type): \(.status)"'
        else
            success "All $total_connections external connections are healthy"
        fi
        
        return 0
    else
        error "Failed to check external connections"
        return 1
    fi
}

# Check commission collections
check_commission_collections() {
    log "Checking commission collections..."
    
    if response=$(api_request GET "/platform-collections/summary?period=7_days" 2>/dev/null); then
        local failed_amount
        local pending_amount
        
        failed_amount=$(echo "$response" | jq -r '.collection_summary.failed_amount // 0')
        pending_amount=$(echo "$response" | jq -r '.collection_summary.pending_amount // 0')
        
        if [[ $(echo "$failed_amount > 100" | bc -l 2>/dev/null || echo 0) -eq 1 ]]; then
            warning "High failed collection amount: \$$failed_amount"
        fi
        
        if [[ $(echo "$pending_amount > 500" | bc -l 2>/dev/null || echo 0) -eq 1 ]]; then
            warning "High pending collection amount: \$$pending_amount"
        fi
        
        success "Commission collections status checked"
        return 0
    else
        error "Failed to check commission collections"
        return 1
    fi
}

# Check analytics dashboard
check_analytics() {
    log "Checking analytics dashboard..."
    
    if response=$(api_request GET "/unified-payment-analytics/dashboard" 2>/dev/null); then
        local today_transactions
        local today_volume
        
        today_transactions=$(echo "$response" | jq -r '.today.total_transactions // 0')
        today_volume=$(echo "$response" | jq -r '.today.total_volume // 0')
        
        success "Analytics dashboard accessible (today: $today_transactions transactions, \$$today_volume volume)"
        return 0
    else
        error "Analytics dashboard check failed"
        return 1
    fi
}

# Send alert email
send_alert() {
    local subject="$1"
    local message="$2"
    
    if command -v mail &> /dev/null && [[ -n "$ALERT_EMAIL" ]]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log "Alert sent to $ALERT_EMAIL"
    else
        warning "Cannot send alert: mail command not available or email not configured"
    fi
}

# Main monitoring function
run_monitoring() {
    local checks=(
        "API Health:check_api_health"
        "Payment Processing:check_payment_processing"
        "External Connections:check_external_connections"
        "Commission Collections:check_commission_collections"
        "Analytics:check_analytics"
    )
    
    local failed_checks=()
    local total_checks=${#checks[@]}
    local passed_checks=0
    
    log "Starting hybrid payment system monitoring..."
    
    for check in "${checks[@]}"; do
        local check_name="${check%:*}"
        local check_function="${check#*:}"
        
        if $check_function; then
            ((passed_checks++))
        else
            failed_checks+=("$check_name")
        fi
    done
    
    log "Monitoring completed: $passed_checks/$total_checks checks passed"
    
    if [[ ${#failed_checks[@]} -gt 0 ]]; then
        local alert_subject="Hybrid Payment System Alert"
        local alert_message="The following checks failed:
        
$(printf '%s\n' "${failed_checks[@]}")

Please check the system immediately.

Timestamp: $(date)
Server: $(hostname)"
        
        error "Failed checks: ${failed_checks[*]}"
        send_alert "$alert_subject" "$alert_message"
        return 1
    else
        success "All monitoring checks passed"
        return 0
    fi
}

# Performance monitoring
monitor_performance() {
    log "Running performance monitoring..."
    
    local start_time
    local end_time
    local duration
    
    # Test API response time
    start_time=$(date +%s%N)
    if api_request GET "/hybrid-payments/my-options" >/dev/null 2>&1; then
        end_time=$(date +%s%N)
        duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [[ $duration -gt 5000 ]]; then
            warning "Slow API response: ${duration}ms"
        else
            success "API response time: ${duration}ms"
        fi
    else
        error "Performance test failed"
    fi
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -h, --help              Show this help message
    -a, --api-url URL      Set API base URL
    -t, --token TOKEN      Set authentication token
    -e, --email EMAIL      Set alert email address
    -p, --performance      Run performance monitoring
    -v, --verbose          Enable verbose output

Examples:
    $0                              # Run standard monitoring
    $0 --performance               # Run with performance monitoring
    $0 --api-url http://staging-api.com/api/v1 --token xyz123
    
Environment Variables:
    HYBRID_PAYMENT_API_URL     API base URL
    HYBRID_PAYMENT_AUTH_TOKEN  Authentication token
    ALERT_EMAIL               Email for alerts
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -a|--api-url)
            API_URL="$2"
            shift 2
            ;;
        -t|--token)
            AUTH_TOKEN="$2"
            shift 2
            ;;
        -e|--email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        -p|--performance)
            PERFORMANCE_MODE=true
            shift
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate configuration
if [[ -z "$AUTH_TOKEN" ]]; then
    error "Authentication token is required"
    echo "Set HYBRID_PAYMENT_AUTH_TOKEN environment variable or use --token option"
    exit 1
fi

# Main execution
main() {
    check_dependencies
    
    if run_monitoring; then
        if [[ "${PERFORMANCE_MODE:-false}" == "true" ]]; then
            monitor_performance
        fi
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"
```

### Webhook Processing Script

```bash
#!/bin/bash
# webhook-processor.sh
# Process and validate webhooks from external payment processors

set -euo pipefail

WEBHOOK_LOG="/var/log/webhook-processor.log"
WEBHOOK_DATA_DIR="/var/lib/webhook-data"
API_URL="${HYBRID_PAYMENT_API_URL:-http://localhost:8000/api/v1}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$WEBHOOK_LOG"
}

# Create webhook data directory
mkdir -p "$WEBHOOK_DATA_DIR"

# Process Square webhook
process_square_webhook() {
    local connection_id="$1"
    local webhook_data="$2"
    local signature="$3"
    
    log "Processing Square webhook for connection $connection_id"
    
    # Save webhook data for debugging
    local webhook_file="$WEBHOOK_DATA_DIR/square_${connection_id}_$(date +%s).json"
    echo "$webhook_data" > "$webhook_file"
    
    # Verify signature (implementation depends on your secret)
    # For production, implement proper Square signature verification
    
    # Extract event type
    local event_type
    event_type=$(echo "$webhook_data" | jq -r '.type // "unknown"')
    
    case "$event_type" in
        "payment.created"|"payment.updated")
            log "Processing payment event: $event_type"
            
            # Trigger transaction sync
            if curl -s -X POST \
                -H "Authorization: Bearer $HYBRID_PAYMENT_AUTH_TOKEN" \
                "$API_URL/external-payments/connections/$connection_id/sync" \
                > /dev/null; then
                log "Transaction sync triggered successfully"
            else
                log "Failed to trigger transaction sync"
            fi
            ;;
        *)
            log "Unhandled event type: $event_type"
            ;;
    esac
}

# Process Stripe webhook
process_stripe_webhook() {
    local connection_id="$1"
    local webhook_data="$2"
    local signature="$3"
    
    log "Processing Stripe webhook for connection $connection_id"
    
    # Save webhook data
    local webhook_file="$WEBHOOK_DATA_DIR/stripe_${connection_id}_$(date +%s).json"
    echo "$webhook_data" > "$webhook_file"
    
    # Extract event type
    local event_type
    event_type=$(echo "$webhook_data" | jq -r '.type // "unknown"')
    
    case "$event_type" in
        "payment_intent.succeeded"|"payment_intent.payment_failed")
            log "Processing payment intent event: $event_type"
            
            # Trigger transaction sync
            curl -s -X POST \
                -H "Authorization: Bearer $HYBRID_PAYMENT_AUTH_TOKEN" \
                "$API_URL/external-payments/connections/$connection_id/sync" \
                > /dev/null || log "Failed to trigger transaction sync"
            ;;
        *)
            log "Unhandled event type: $event_type"
            ;;
    esac
}

# Main webhook processor
if [[ $# -lt 3 ]]; then
    echo "Usage: $0 <processor> <connection_id> <webhook_data> [signature]"
    exit 1
fi

PROCESSOR="$1"
CONNECTION_ID="$2"
WEBHOOK_DATA="$3"
SIGNATURE="${4:-}"

case "$PROCESSOR" in
    "square")
        process_square_webhook "$CONNECTION_ID" "$WEBHOOK_DATA" "$SIGNATURE"
        ;;
    "stripe")
        process_stripe_webhook "$CONNECTION_ID" "$WEBHOOK_DATA" "$SIGNATURE"
        ;;
    *)
        log "Unknown processor: $PROCESSOR"
        exit 1
        ;;
esac

log "Webhook processing completed for $PROCESSOR connection $CONNECTION_ID"
```

## 📊 Analytics Integration Examples

### Data Export Script

```python
# export_analytics_data.py
#!/usr/bin/env python3
"""
Export analytics data for external reporting and analysis.
"""

import argparse
import csv
import json
from datetime import datetime, timedelta
from hybrid_payment_client import HybridPaymentClient

def export_payment_data(client: HybridPaymentClient, start_date: datetime, 
                       end_date: datetime, output_file: str):
    """Export payment data to CSV."""
    
    # Get external transactions
    transactions = client.get_external_transactions({
        'since': start_date,
        'until': end_date,
        'limit': 1000
    })
    
    # Get unified analytics for the period
    period_days = (end_date - start_date).days
    analytics = client.get_unified_analytics(f"{period_days}_days")
    
    # Prepare CSV data
    csv_data = []
    
    # Add transaction records
    for transaction in transactions.get('transactions', []):
        csv_data.append({
            'date': transaction['processed_at'][:10],
            'type': 'external_transaction',
            'processor': transaction['processor_type'],
            'amount': transaction['amount'],
            'currency': transaction['currency'],
            'status': transaction['status'],
            'fees': transaction.get('processor_fees', 0),
            'appointment_id': transaction.get('appointment_id', ''),
            'barber_id': transaction['barber_id']
        })
    
    # Add centralized payments data (if available from analytics)
    centralized = analytics.get('centralized_payments', {})
    if centralized.get('total_transactions', 0) > 0:
        # This is aggregated data, so we create summary records
        csv_data.append({
            'date': end_date.strftime('%Y-%m-%d'),
            'type': 'centralized_summary',
            'processor': 'stripe_platform',
            'amount': centralized['total_volume'],
            'currency': 'USD',
            'status': 'completed',
            'fees': centralized.get('processing_fees', 0),
            'appointment_id': '',
            'barber_id': 'all'
        })
    
    # Write to CSV
    with open(output_file, 'w', newline='') as csvfile:
        fieldnames = ['date', 'type', 'processor', 'amount', 'currency', 
                     'status', 'fees', 'appointment_id', 'barber_id']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        for row in csv_data:
            writer.writerow(row)
    
    print(f"Exported {len(csv_data)} records to {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Export hybrid payment analytics data')
    parser.add_argument('--api-url', default='http://localhost:8000/api/v1')
    parser.add_argument('--token', required=True)
    parser.add_argument('--start-date', required=True, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', required=True, help='End date (YYYY-MM-DD)')
    parser.add_argument('--output', default='payment_data.csv', help='Output CSV file')
    
    args = parser.parse_args()
    
    # Parse dates
    start_date = datetime.strptime(args.start_date, '%Y-%m-%d')
    end_date = datetime.strptime(args.end_date, '%Y-%m-%d')
    
    # Initialize client
    client = HybridPaymentClient(args.api_url, args.token)
    
    # Export data
    export_payment_data(client, start_date, end_date, args.output)

if __name__ == "__main__":
    main()
```

---

This comprehensive backend integration guide provides examples for Python, Node.js, and shell script integrations with the Hybrid Payment System. The examples cover payment processing, monitoring, webhook handling, analytics, and data export, providing a complete toolkit for backend integration.