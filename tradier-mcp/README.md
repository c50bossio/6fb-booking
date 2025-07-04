# Tradier MCP Server

A Model Context Protocol (MCP) server for Tradier API integration, providing trading and market data capabilities to Claude.

## Quick Setup

1. **Create a new directory outside of this project:**
   ```bash
   mkdir ~/tradier-mcp-project
   cd ~/tradier-mcp-project
   ```

2. **Copy all files from this `tradier-mcp` folder to your new directory**

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure your API credentials:**
   - Edit `.env` file
   - Add your Tradier API token
   - Set your account ID
   - Choose sandbox/production environment

5. **Add to Claude Desktop:**
   - Copy the configuration from `claude-desktop-config.json`
   - Add it to your `~/.config/claude-desktop/config.json`

6. **Test the setup:**
   ```bash
   python test_tradier_mcp.py
   ```

## Features

- 📈 **Market Data**: Real-time quotes, historical data, market hours
- 💼 **Account Management**: Account info, balances, positions
- 📊 **Trading**: Place orders, manage positions (with safety controls)
- 🔍 **Research**: Company profiles, fundamentals, options chains
- 📋 **Portfolio**: Track positions, P&L, performance

## Security

- All API credentials stored locally in `.env`
- Rate limiting built-in
- Trading safety controls
- Paper trading mode by default

## Usage with Claude

After setup, you can ask Claude things like:
- "Get a quote for AAPL"
- "Show my account balance"
- "What are the market hours today?"
- "Get options chain for SPY"

## Files Structure

```
tradier-mcp-project/
├── .env                    # Your API credentials (edit this)
├── requirements.txt        # Python dependencies
├── tradier_mcp_server.py   # Main MCP server
├── test_tradier_mcp.py     # Test script
├── claude-desktop-config.json  # Claude configuration
└── README.md              # This file
```

---

**⚠️ Important:** Never commit the `.env` file to version control. Keep your API credentials secure!
