#!/usr/bin/env python3
"""
Tradier MCP Server

A Model Context Protocol server for Tradier API integration.
Provides trading and market data capabilities to Claude.

Author: Claude
Created: 2025-07-03
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin
import aiohttp
from dotenv import load_dotenv

# MCP imports
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.types import (
    Resource, Tool, TextContent, ImageContent, EmbeddedResource,
    LoggingLevel
)
import mcp.types as types
from mcp.server.stdio import stdio_server

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('tradier-mcp')

class TradierMCPServer:
    """Tradier MCP Server for trading and market data"""
    
    def __init__(self):
        self.api_token = os.getenv('TRADIER_API_TOKEN')
        self.account_id = os.getenv('TRADIER_ACCOUNT_ID')
        self.environment = os.getenv('TRADIER_ENVIRONMENT', 'sandbox')
        self.paper_trading = os.getenv('PAPER_TRADING_ONLY', 'true').lower() == 'true'
        
        # Set base URL based on environment
        if self.environment.lower() == 'production':
            self.base_url = os.getenv('TRADIER_API_BASE_URL', 'https://api.tradier.com/v1')
        else:
            self.base_url = os.getenv('TRADIER_SANDBOX_BASE_URL', 'https://sandbox.tradier.com/v1')
        
        # Validate configuration
        if not self.api_token:
            raise ValueError("TRADIER_API_TOKEN is required")
        
        # Rate limiting
        self.rate_limit_per_minute = int(os.getenv('API_RATE_LIMIT_PER_MINUTE', '120'))
        self.request_timeout = int(os.getenv('API_REQUEST_TIMEOUT', '30'))
        
        logger.info(f"Initialized Tradier MCP Server - Environment: {self.environment}")
        logger.info(f"Paper Trading Mode: {self.paper_trading}")
        
    async def make_request(self, method: str, endpoint: str, params: Optional[Dict] = None, 
                          data: Optional[Dict] = None) -> Dict:
        """Make authenticated request to Tradier API"""
        
        url = urljoin(self.base_url + '/', endpoint.lstrip('/'))
        headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Accept': 'application/json'
        }
        
        if method.upper() == 'POST' and data:
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.request_timeout)) as session:
                async with session.request(
                    method=method.upper(),
                    url=url,
                    headers=headers,
                    params=params,
                    data=data
                ) as response:
                    response_data = await response.json()
                    
                    if response.status >= 400:
                        logger.error(f"API Error {response.status}: {response_data}")
                        raise Exception(f"Tradier API Error {response.status}: {response_data}")
                    
                    return response_data
                    
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            raise

    async def get_quote(self, symbols: str) -> Dict:
        """Get real-time quotes for symbols"""
        endpoint = '/markets/quotes'
        params = {'symbols': symbols, 'greeks': 'false'}
        return await self.make_request('GET', endpoint, params=params)

    async def get_market_calendar(self, month: Optional[int] = None, year: Optional[int] = None) -> Dict:
        """Get market calendar"""
        endpoint = '/markets/calendar'
        params = {}
        if month:
            params['month'] = month
        if year:
            params['year'] = year
        return await self.make_request('GET', endpoint, params=params)

    async def get_account_profile(self) -> Dict:
        """Get account profile information"""
        if not self.account_id:
            raise ValueError("Account ID is required for account operations")
        
        endpoint = f'/accounts/{self.account_id}/profile'
        return await self.make_request('GET', endpoint)

    async def get_account_balances(self) -> Dict:
        """Get account balances"""
        if not self.account_id:
            raise ValueError("Account ID is required for account operations")
        
        endpoint = f'/accounts/{self.account_id}/balances'
        return await self.make_request('GET', endpoint)

    async def get_positions(self) -> Dict:
        """Get current positions"""
        if not self.account_id:
            raise ValueError("Account ID is required for account operations")
        
        endpoint = f'/accounts/{self.account_id}/positions'
        return await self.make_request('GET', endpoint)

    async def get_orders(self, page: Optional[int] = None) -> Dict:
        """Get orders"""
        if not self.account_id:
            raise ValueError("Account ID is required for account operations")
        
        endpoint = f'/accounts/{self.account_id}/orders'
        params = {}
        if page:
            params['page'] = page
        return await self.make_request('GET', endpoint, params=params)

    async def get_historical_quotes(self, symbol: str, interval: str = '1min', 
                                  start: Optional[str] = None, end: Optional[str] = None) -> Dict:
        """Get historical quotes"""
        endpoint = f'/markets/history'
        params = {
            'symbol': symbol,
            'interval': interval
        }
        if start:
            params['start'] = start
        if end:
            params['end'] = end
        return await self.make_request('GET', endpoint, params=params)

    async def get_options_chain(self, symbol: str, expiration: Optional[str] = None) -> Dict:
        """Get options chain"""
        endpoint = f'/markets/options/chains'
        params = {'symbol': symbol, 'greeks': 'false'}
        if expiration:
            params['expiration'] = expiration
        return await self.make_request('GET', endpoint, params=params)

    async def search_companies(self, query: str) -> Dict:
        """Search for companies"""
        endpoint = '/markets/search'
        params = {'q': query, 'indexes': 'false'}
        return await self.make_request('GET', endpoint, params=params)

    async def get_company_profile(self, symbol: str) -> Dict:
        """Get company profile"""
        endpoint = f'/markets/fundamentals/company'
        params = {'symbols': symbol}
        return await self.make_request('GET', endpoint, params=params)

# Initialize the MCP server
server = Server("tradier-mcp")

# Create Tradier client instance
tradier_client = TradierMCPServer()

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """List available Tradier tools"""
    return [
        Tool(
            name="get_quote",
            description="Get real-time stock quotes for one or more symbols",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbols": {
                        "type": "string",
                        "description": "Comma-separated list of stock symbols (e.g., 'AAPL,MSFT,GOOGL')"
                    }
                },
                "required": ["symbols"]
            }
        ),
        Tool(
            name="get_market_calendar",
            description="Get market calendar information including holidays and trading hours",
            inputSchema={
                "type": "object",
                "properties": {
                    "month": {
                        "type": "integer",
                        "description": "Month (1-12, optional)"
                    },
                    "year": {
                        "type": "integer", 
                        "description": "Year (optional)"
                    }
                }
            }
        ),
        Tool(
            name="get_account_profile",
            description="Get account profile information",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="get_account_balances",
            description="Get current account balances and buying power",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="get_positions",
            description="Get current portfolio positions",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="get_orders",
            description="Get order history",
            inputSchema={
                "type": "object",
                "properties": {
                    "page": {
                        "type": "integer",
                        "description": "Page number for pagination (optional)"
                    }
                }
            }
        ),
        Tool(
            name="get_historical_quotes",
            description="Get historical price data for a symbol",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol (e.g., 'AAPL')"
                    },
                    "interval": {
                        "type": "string",
                        "description": "Time interval (1min, 5min, 15min, daily, weekly, monthly)",
                        "default": "daily"
                    },
                    "start": {
                        "type": "string",
                        "description": "Start date (YYYY-MM-DD format, optional)"
                    },
                    "end": {
                        "type": "string", 
                        "description": "End date (YYYY-MM-DD format, optional)"
                    }
                },
                "required": ["symbol"]
            }
        ),
        Tool(
            name="get_options_chain",
            description="Get options chain for a symbol",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Underlying stock symbol (e.g., 'AAPL')"
                    },
                    "expiration": {
                        "type": "string",
                        "description": "Expiration date (YYYY-MM-DD format, optional)"
                    }
                },
                "required": ["symbol"]
            }
        ),
        Tool(
            name="search_companies",
            description="Search for companies by name or symbol",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (company name or partial symbol)"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="get_company_profile",
            description="Get detailed company profile and fundamentals",
            inputSchema={
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol (e.g., 'AAPL')"
                    }
                },
                "required": ["symbol"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle tool calls"""
    
    try:
        if name == "get_quote":
            result = await tradier_client.get_quote(arguments["symbols"])
            
        elif name == "get_market_calendar":
            result = await tradier_client.get_market_calendar(
                arguments.get("month"), 
                arguments.get("year")
            )
            
        elif name == "get_account_profile":
            result = await tradier_client.get_account_profile()
            
        elif name == "get_account_balances":
            result = await tradier_client.get_account_balances()
            
        elif name == "get_positions":
            result = await tradier_client.get_positions()
            
        elif name == "get_orders":
            result = await tradier_client.get_orders(arguments.get("page"))
            
        elif name == "get_historical_quotes":
            result = await tradier_client.get_historical_quotes(
                arguments["symbol"],
                arguments.get("interval", "daily"),
                arguments.get("start"),
                arguments.get("end")
            )
            
        elif name == "get_options_chain":
            result = await tradier_client.get_options_chain(
                arguments["symbol"],
                arguments.get("expiration")
            )
            
        elif name == "search_companies":
            result = await tradier_client.search_companies(arguments["query"])
            
        elif name == "get_company_profile":
            result = await tradier_client.get_company_profile(arguments["symbol"])
            
        else:
            raise ValueError(f"Unknown tool: {name}")
        
        # Format the response
        formatted_result = json.dumps(result, indent=2)
        
        return [
            types.TextContent(
                type="text",
                text=f"Tradier API Response:\n\n{formatted_result}"
            )
        ]
        
    except Exception as e:
        logger.error(f"Tool call failed: {str(e)}")
        return [
            types.TextContent(
                type="text", 
                text=f"Error: {str(e)}"
            )
        ]

async def main():
    """Main entry point"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="tradier-mcp",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
