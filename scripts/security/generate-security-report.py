#!/usr/bin/env python3
"""
Security Report Generator
Generates HTML security report from aggregated scan results
"""

import json
import sys
from datetime import datetime
from typing import Dict, Any

def generate_html_report(assessment_data: Dict[str, Any]) -> str:
    """Generate HTML security report from assessment data"""
    
    summary = assessment_data.get('summary', {})
    findings = assessment_data.get('findings', [])
    critical_findings = assessment_data.get('critical_findings', [])
    recommendations = assessment_data.get('recommendations', [])
    
    html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Scan Report - BookedBarber V2</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #34495e;
            margin-top: 30px;
        }}
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .summary-card {{
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
            border: 1px solid #e9ecef;
        }}
        .summary-card h3 {{
            margin: 0 0 10px 0;
            color: #495057;
        }}
        .summary-card .count {{
            font-size: 2em;
            font-weight: bold;
        }}
        .critical {{ color: #dc3545; }}
        .high {{ color: #fd7e14; }}
        .medium {{ color: #ffc107; }}
        .low {{ color: #28a745; }}
        .info {{ color: #17a2b8; }}
        .risk-level {{
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
        }}
        .risk-critical {{ background-color: #dc3545; color: white; }}
        .risk-high {{ background-color: #fd7e14; color: white; }}
        .risk-medium {{ background-color: #ffc107; color: #333; }}
        .risk-low {{ background-color: #28a745; color: white; }}
        .risk-minimal {{ background-color: #6c757d; color: white; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }}
        th {{
            background-color: #f8f9fa;
            font-weight: 600;
        }}
        tr:hover {{
            background-color: #f8f9fa;
        }}
        .recommendation {{
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 10px 0;
        }}
        .recommendation h4 {{
            margin: 0 0 5px 0;
            color: #1976d2;
        }}
        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            text-align: center;
            color: #6c757d;
        }}
        .tools-used {{
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 10px 0;
        }}
        .tool-badge {{
            background-color: #e9ecef;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Security Scan Report</h1>
        
        <div style="margin: 20px 0;">
            <p><strong>Project:</strong> BookedBarber V2</p>
            <p><strong>Scan Date:</strong> {summary.get('scan_timestamp', datetime.now().isoformat())}</p>
            <p><strong>Overall Risk Level:</strong> 
                <span class="risk-level risk-{summary.get('overall_risk', 'UNKNOWN').lower()}">{summary.get('overall_risk', 'UNKNOWN')}</span>
            </p>
            <p><strong>Total Findings:</strong> {summary.get('total_findings', 0)}</p>
        </div>

        <h2>Summary</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Critical</h3>
                <div class="count critical">{summary.get('critical', 0)}</div>
            </div>
            <div class="summary-card">
                <h3>High</h3>
                <div class="count high">{summary.get('high', 0)}</div>
            </div>
            <div class="summary-card">
                <h3>Medium</h3>
                <div class="count medium">{summary.get('medium', 0)}</div>
            </div>
            <div class="summary-card">
                <h3>Low</h3>
                <div class="count low">{summary.get('low', 0)}</div>
            </div>
            <div class="summary-card">
                <h3>Info</h3>
                <div class="count info">{summary.get('info', 0)}</div>
            </div>
        </div>

        <h2>Security Tools Used</h2>
        <div class="tools-used">
            {' '.join([f'<span class="tool-badge">{tool}</span>' for tool in summary.get('tools_used', [])])}
        </div>

        <h2>Findings by Category</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Critical</th>
                    <th>High</th>
                    <th>Medium</th>
                    <th>Low</th>
                    <th>Info</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Dependencies</td>
                    <td class="critical">{assessment_data.get('dependencies', {}).get('critical', 0)}</td>
                    <td class="high">{assessment_data.get('dependencies', {}).get('high', 0)}</td>
                    <td class="medium">{assessment_data.get('dependencies', {}).get('medium', 0)}</td>
                    <td class="low">{assessment_data.get('dependencies', {}).get('low', 0)}</td>
                    <td class="info">{assessment_data.get('dependencies', {}).get('info', 0)}</td>
                </tr>
                <tr>
                    <td>Code Analysis</td>
                    <td class="critical">{assessment_data.get('code', {}).get('critical', 0)}</td>
                    <td class="high">{assessment_data.get('code', {}).get('high', 0)}</td>
                    <td class="medium">{assessment_data.get('code', {}).get('medium', 0)}</td>
                    <td class="low">{assessment_data.get('code', {}).get('low', 0)}</td>
                    <td class="info">{assessment_data.get('code', {}).get('info', 0)}</td>
                </tr>
                <tr>
                    <td>Containers</td>
                    <td class="critical">{assessment_data.get('containers', {}).get('critical', 0)}</td>
                    <td class="high">{assessment_data.get('containers', {}).get('high', 0)}</td>
                    <td class="medium">{assessment_data.get('containers', {}).get('medium', 0)}</td>
                    <td class="low">{assessment_data.get('containers', {}).get('low', 0)}</td>
                    <td class="info">{assessment_data.get('containers', {}).get('info', 0)}</td>
                </tr>
                <tr>
                    <td>Secrets</td>
                    <td class="critical">{assessment_data.get('secrets', {}).get('critical', 0)}</td>
                    <td class="high">{assessment_data.get('secrets', {}).get('high', 0)}</td>
                    <td class="medium">{assessment_data.get('secrets', {}).get('medium', 0)}</td>
                    <td class="low">{assessment_data.get('secrets', {}).get('low', 0)}</td>
                    <td class="info">{assessment_data.get('secrets', {}).get('info', 0)}</td>
                </tr>
                <tr>
                    <td>Compliance</td>
                    <td class="critical">{assessment_data.get('compliance', {}).get('critical', 0)}</td>
                    <td class="high">{assessment_data.get('compliance', {}).get('high', 0)}</td>
                    <td class="medium">{assessment_data.get('compliance', {}).get('medium', 0)}</td>
                    <td class="low">{assessment_data.get('compliance', {}).get('low', 0)}</td>
                    <td class="info">{assessment_data.get('compliance', {}).get('info', 0)}</td>
                </tr>
            </tbody>
        </table>

        {f'''
        <h2>⚠️ Critical Findings</h2>
        <ul>
            {''.join([f'<li>{finding}</li>' for finding in critical_findings])}
        </ul>
        ''' if critical_findings else ''}

        <h2>📋 Recommendations</h2>
        {' '.join([f'''
        <div class="recommendation">
            <h4>{rec.get('category', 'General')} - Priority: {rec.get('priority', 'MEDIUM')}</h4>
            <p><strong>{rec.get('recommendation', '')}</strong></p>
            <p>{rec.get('details', '')}</p>
        </div>
        ''' for rec in recommendations])}

        <div class="footer">
            <p>Generated by BookedBarber V2 Security Scanner</p>
            <p>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>
"""
    
    return html_template

def main():
    """Main execution function"""
    if len(sys.argv) != 2:
        print("Usage: python3 generate-security-report.py <assessment-json-file>", file=sys.stderr)
        sys.exit(1)
    
    assessment_file = sys.argv[1]
    
    try:
        with open(assessment_file, 'r') as f:
            assessment_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error reading assessment file: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Generate HTML report
    html_report = generate_html_report(assessment_data)
    
    # Output to stdout
    print(html_report)

if __name__ == "__main__":
    main()