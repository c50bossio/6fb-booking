# SuperClaude Quick Reference

## Common Commands
```bash
# Smart command suggestion
python .claude/superclaude-auto.py "your task"

# 6FB optimized command
python .claude/bookedbarber-superclaude.py "your task"

# Interactive mode
python .claude/bookedbarber-superclaude.py

# Run tests
python .claude/test-superclaude-integration.py --report
```

## Auto-Selected Commands by Context

| Context | Command | Persona |
|---------|---------|---------|
| Auth/Security | `/scan --security` | `--persona-security` |
| Performance | `/analyze --performance` | `--persona-performance` |
| UI Components | `/build --react --magic` | `--persona-frontend` |
| API Development | `/analyze --api` | `--persona-backend` |
| Database | `/analyze --database` | `--persona-backend` |
| Bug Fixing | `/troubleshoot --analyze` | `--persona-analyzer` |

## MCP Server Flags
- `--c7` = Context7 (documentation)
- `--seq` = Sequential (complex analysis)
- `--magic` = Magic (UI generation)
- `--pup` = Puppeteer (testing/automation)

## 6FB Business Impact
- **High (8-10)**: booking, payment, revenue
- **Medium (5-7)**: analytics, marketing, client
- **Low (1-4)**: docs, testing, logs
