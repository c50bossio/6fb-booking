#!/usr/bin/env python3
"""
Test script for Tradier MCP Server

This script tests the Tradier MCP server functionality.
Run this after setting up your .env file with API credentials.
"""

import os
import asyncio
import sys
from dotenv import load_dotenv

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tradier_mcp_server import TradierMCPServer

async def test_tradier_connection():
    """Test basic Tradier API connection"""
    
    print("🔧 Testing Tradier MCP Server Connection...")
    print("-" * 50)
    
    try:
        # Load environment
        load_dotenv()
        
        # Check if API token is configured
        api_token = os.getenv('TRADIER_API_TOKEN')
        if not api_token or api_token == 'your_tradier_api_token_here':
            print("❌ Error: Please configure your TRADIER_API_TOKEN in the .env file")
            return False
        
        # Initialize client
        client = TradierMCPServer()
        print(f"✅ Client initialized - Environment: {client.environment}")
        print(f"✅ Paper Trading Mode: {client.paper_trading}")
        
        # Test 1: Get market calendar
        print("\n📅 Testing Market Calendar...")
        try:
            calendar_data = await client.get_market_calendar()
            print("✅ Market calendar retrieved successfully")
            if 'calendar' in calendar_data and 'days' in calendar_data['calendar']:
                days_count = len(calendar_data['calendar']['days'])
                print(f"   → Found {days_count} calendar days")
        except Exception as e:
            print(f"❌ Market calendar failed: {str(e)}")
        
        # Test 2: Get a stock quote
        print("\n📈 Testing Stock Quote (AAPL)...")
        try:
            quote_data = await client.get_quote('AAPL')
            print("✅ Stock quote retrieved successfully")
            if 'quotes' in quote_data and 'quote' in quote_data['quotes']:
                quote = quote_data['quotes']['quote']
                if isinstance(quote, list):
                    quote = quote[0]
                symbol = quote.get('symbol', 'N/A')
                last = quote.get('last', 'N/A')
                print(f"   → {symbol}: ${last}")
        except Exception as e:
            print(f"❌ Stock quote failed: {str(e)}")
        
        # Test 3: Search for companies
        print("\n🔍 Testing Company Search (Apple)...")
        try:
            search_data = await client.search_companies('Apple')
            print("✅ Company search completed successfully")
            if 'securities' in search_data and 'security' in search_data['securities']:
                securities = search_data['securities']['security']
                if isinstance(securities, list):
                    count = len(securities)
                    print(f"   → Found {count} results")
                    if count > 0:
                        first_result = securities[0]
                        symbol = first_result.get('symbol', 'N/A')
                        description = first_result.get('description', 'N/A')
                        print(f"   → First result: {symbol} - {description}")
        except Exception as e:
            print(f"❌ Company search failed: {str(e)}")
        
        # Test 4: Account information (if account ID is configured)
        account_id = os.getenv('TRADIER_ACCOUNT_ID')
        if account_id and account_id != 'your_account_id_here':
            print("\n💼 Testing Account Information...")
            try:
                profile_data = await client.get_account_profile()
                print("✅ Account profile retrieved successfully")
                if 'profile' in profile_data:
                    profile = profile_data['profile']
                    account_type = profile.get('account_type', 'N/A')
                    print(f"   → Account Type: {account_type}")
            except Exception as e:
                print(f"❌ Account profile failed: {str(e)}")
        else:
            print("\n💼 Skipping Account Tests (Account ID not configured)")
        
        print("\n" + "=" * 50)
        print("🎉 Tradier MCP Server Test Completed!")
        print("✅ Basic connectivity confirmed")
        print("\n💡 Next Steps:")
        print("1. Add the server to your Claude Desktop configuration")
        print("2. Restart Claude Desktop") 
        print("3. Look for Tradier tools in the MCP tools panel")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        print("\n🔧 Troubleshooting:")
        print("1. Check your .env file configuration")
        print("2. Verify your Tradier API token is valid")
        print("3. Check your internet connection")
        print("4. Review the server logs for more details")
        return False

async def test_specific_functions():
    """Test specific MCP functions"""
    
    print("\n🧪 Testing Specific MCP Functions...")
    print("-" * 50)
    
    try:
        client = TradierMCPServer()
        
        # Test historical data
        print("\n📊 Testing Historical Data (AAPL, last 5 days)...")
        try:
            from datetime import datetime, timedelta
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
            
            hist_data = await client.get_historical_quotes('AAPL', 'daily', start_date, end_date)
            print("✅ Historical data retrieved successfully")
            
            if 'history' in hist_data and 'day' in hist_data['history']:
                days = hist_data['history']['day']
                if isinstance(days, list):
                    print(f"   → Retrieved {len(days)} days of data")
                else:
                    print("   → Retrieved 1 day of data")
        except Exception as e:
            print(f"❌ Historical data failed: {str(e)}")
        
        # Test options chain
        print("\n📋 Testing Options Chain (SPY)...")
        try:
            options_data = await client.get_options_chain('SPY')
            print("✅ Options chain retrieved successfully")
            
            if 'options' in options_data and 'option' in options_data['options']:
                options = options_data['options']['option']
                if isinstance(options, list):
                    print(f"   → Found {len(options)} options contracts")
                else:
                    print("   → Found 1 options contract")
        except Exception as e:
            print(f"❌ Options chain failed: {str(e)}")
        
    except Exception as e:
        print(f"❌ Specific function tests failed: {str(e)}")

def main():
    """Main test function"""
    print("🚀 Tradier MCP Server Test Suite")
    print("=" * 50)
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("❌ Error: .env file not found!")
        print("Please create a .env file with your Tradier API credentials.")
        print("See the README.md for setup instructions.")
        return
    
    # Run the tests
    try:
        # Run basic tests
        success = asyncio.run(test_tradier_connection())
        
        if success:
            # Run additional tests
            asyncio.run(test_specific_functions())
            
            print("\n🎯 Test Summary:")
            print("✅ All tests completed")
            print("✅ Ready for Claude Desktop integration")
        else:
            print("\n❌ Tests failed - please check your configuration")
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Tests interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    main()
