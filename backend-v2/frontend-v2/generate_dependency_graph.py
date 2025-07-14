#!/usr/bin/env python3
"""
Generate Visual Component Dependency Graph
==========================================

Creates visual representations of component dependencies for better understanding
of the component architecture and consolidation opportunities.
"""

import json
from pathlib import Path
from collections import defaultdict
import re

def generate_dependency_graph_data():
    """Generate data for dependency graph visualization"""
    
    # Load the detailed analysis
    report_path = Path("project_component_analysis.json")
    if not report_path.exists():
        print("❌ project_component_analysis.json not found. Run analyze_project_components.py first.")
        return
    
    with open(report_path, 'r') as f:
        data = json.load(f)
    
    components = data['detailed_components']
    
    # Create nodes and edges for visualization
    nodes = []
    edges = []
    
    # Color mapping by category
    color_map = {
        'ui-component': '#3B82F6',      # Blue
        'feature-component': '#10B981',  # Green
        'page': '#F59E0B',              # Orange
        'layout': '#EF4444',            # Red
        'hook': '#8B5CF6',              # Purple
        'utility': '#6B7280',           # Gray
        'context': '#EC4899',           # Pink
        'other': '#374151'              # Dark gray
    }
    
    # Size mapping by usage count
    def get_node_size(usage_count):
        if usage_count > 50:
            return 20
        elif usage_count > 10:
            return 15
        elif usage_count > 5:
            return 12
        elif usage_count > 0:
            return 10
        else:
            return 6
    
    # Create nodes
    for name, comp_data in components.items():
        size = get_node_size(comp_data['usage_count'])
        color = color_map.get(comp_data['category'], color_map['other'])
        
        # Mark duplicate candidates with special styling
        if comp_data['is_duplicate_candidate']:
            color = '#DC2626'  # Red for duplicates
            
        # Mark unused components
        if comp_data['usage_count'] == 0:
            color = '#9CA3AF'  # Light gray for unused
        
        nodes.append({
            'id': name,
            'label': name,
            'size': size,
            'color': color,
            'category': comp_data['category'],
            'usage_count': comp_data['usage_count'],
            'size_lines': comp_data['size_lines'],
            'is_duplicate': comp_data['is_duplicate_candidate'],
            'path': comp_data['path']
        })
    
    # Create edges for internal dependencies
    for name, comp_data in components.items():
        for dep in comp_data['internal_dependencies']:
            if dep in components:  # Only include internal dependencies
                edges.append({
                    'source': name,
                    'target': dep,
                    'weight': 1
                })
    
    # Generate graph data
    graph_data = {
        'nodes': nodes,
        'edges': edges,
        'statistics': {
            'total_components': len(nodes),
            'total_dependencies': len(edges),
            'duplicate_candidates': sum(1 for n in nodes if n['is_duplicate']),
            'unused_components': sum(1 for n in nodes if n['usage_count'] == 0),
            'categories': {cat: sum(1 for n in nodes if n['category'] == cat) 
                          for cat in set(n['category'] for n in nodes)}
        }
    }
    
    return graph_data

def create_html_visualization(graph_data):
    """Create an interactive HTML visualization"""
    
    html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>Component Dependency Graph - BookedBarber V2</title>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background-color: #f8fafc;
        }
        #graph { 
            width: 100%; 
            height: 800px; 
            border: 1px solid #e2e8f0;
            background-color: white;
            border-radius: 8px;
        }
        .controls {
            margin-bottom: 20px;
            padding: 15px;
            background-color: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .legend {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 10px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        .stats {
            margin-top: 20px;
            padding: 15px;
            background-color: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .stats h3 {
            margin-top: 0;
            color: #1f2937;
        }
        .filter-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        .filter-btn {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .filter-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }
        .info-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            display: none;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
        }
        h2 {
            color: #374151;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <h1>📊 Component Dependency Graph - BookedBarber V2</h1>
    
    <div class="controls">
        <h2>Filters & Controls</h2>
        <div class="filter-controls">
            <button class="filter-btn active" onclick="showAll()">Show All</button>
            <button class="filter-btn" onclick="showDuplicates()">Duplicates Only</button>
            <button class="filter-btn" onclick="showUnused()">Unused Only</button>
            <button class="filter-btn" onclick="showMostUsed()">Most Used</button>
            <button class="filter-btn" onclick="showCalendarComponents()">Calendar Components</button>
            <button class="filter-btn" onclick="showUIComponents()">UI Components</button>
        </div>
        
        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background-color: #3B82F6;"></div>
                <span>UI Components</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #10B981;"></div>
                <span>Feature Components</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #F59E0B;"></div>
                <span>Pages</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #DC2626;"></div>
                <span>Duplicate Candidates</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #9CA3AF;"></div>
                <span>Unused Components</span>
            </div>
        </div>
    </div>
    
    <div id="graph"></div>
    
    <div id="info-panel" class="info-panel">
        <h3 id="component-name"></h3>
        <p><strong>Category:</strong> <span id="component-category"></span></p>
        <p><strong>Usage Count:</strong> <span id="component-usage"></span></p>
        <p><strong>Size:</strong> <span id="component-size"></span> lines</p>
        <p><strong>Path:</strong> <span id="component-path"></span></p>
        <p><strong>Duplicate Candidate:</strong> <span id="component-duplicate"></span></p>
        <div id="similar-components"></div>
    </div>
    
    <div class="stats">
        <h3>📈 Graph Statistics</h3>
        <p><strong>Total Components:</strong> {total_components}</p>
        <p><strong>Total Dependencies:</strong> {total_dependencies}</p>
        <p><strong>Duplicate Candidates:</strong> {duplicate_candidates}</p>
        <p><strong>Unused Components:</strong> {unused_components}</p>
        
        <h4>Category Breakdown:</h4>
        <ul>
            {category_list}
        </ul>
    </div>

    <script>
        // Graph data
        const graphData = {graph_data_json};
        
        // Vis.js configuration
        const nodes = new vis.DataSet(graphData.nodes);
        const edges = new vis.DataSet(graphData.edges);
        
        const container = document.getElementById('graph');
        const data = {{ nodes: nodes, edges: edges }};
        
        const options = {{
            physics: {{
                enabled: true,
                stabilization: {{ iterations: 100 }},
                barnesHut: {{
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 95,
                    springConstant: 0.04,
                    damping: 0.09
                }}
            }},
            interaction: {{
                hover: true,
                tooltipDelay: 300
            }},
            nodes: {{
                borderWidth: 2,
                shadow: true,
                font: {{ size: 12 }}
            }},
            edges: {{
                color: {{ color: '#848484', highlight: '#3B82F6' }},
                width: 1,
                arrows: {{ to: {{ enabled: true, scaleFactor: 0.5 }} }}
            }}
        }};
        
        const network = new vis.Network(container, data, options);
        
        // Event handlers
        network.on('click', function(params) {{
            if (params.nodes.length > 0) {{
                const nodeId = params.nodes[0];
                const nodeData = graphData.nodes.find(n => n.id === nodeId);
                showComponentInfo(nodeData);
            }}
        }});
        
        function showComponentInfo(nodeData) {{
            document.getElementById('component-name').textContent = nodeData.label;
            document.getElementById('component-category').textContent = nodeData.category;
            document.getElementById('component-usage').textContent = nodeData.usage_count;
            document.getElementById('component-size').textContent = nodeData.size_lines;
            document.getElementById('component-path').textContent = nodeData.path;
            document.getElementById('component-duplicate').textContent = nodeData.is_duplicate ? 'Yes' : 'No';
            
            document.getElementById('info-panel').style.display = 'block';
        }}
        
        // Filter functions
        function showAll() {{
            nodes.clear();
            nodes.add(graphData.nodes);
            edges.clear();
            edges.add(graphData.edges);
            updateActiveButton(event.target);
        }}
        
        function showDuplicates() {{
            const duplicateNodes = graphData.nodes.filter(n => n.is_duplicate);
            nodes.clear();
            nodes.add(duplicateNodes);
            
            const duplicateNodeIds = new Set(duplicateNodes.map(n => n.id));
            const duplicateEdges = graphData.edges.filter(e => 
                duplicateNodeIds.has(e.source) && duplicateNodeIds.has(e.target)
            );
            edges.clear();
            edges.add(duplicateEdges);
            updateActiveButton(event.target);
        }}
        
        function showUnused() {{
            const unusedNodes = graphData.nodes.filter(n => n.usage_count === 0);
            nodes.clear();
            nodes.add(unusedNodes);
            edges.clear();
            updateActiveButton(event.target);
        }}
        
        function showMostUsed() {{
            const mostUsedNodes = graphData.nodes.filter(n => n.usage_count > 5);
            nodes.clear();
            nodes.add(mostUsedNodes);
            
            const mostUsedNodeIds = new Set(mostUsedNodes.map(n => n.id));
            const mostUsedEdges = graphData.edges.filter(e => 
                mostUsedNodeIds.has(e.source) && mostUsedNodeIds.has(e.target)
            );
            edges.clear();
            edges.add(mostUsedEdges);
            updateActiveButton(event.target);
        }}
        
        function showCalendarComponents() {{
            const calendarNodes = graphData.nodes.filter(n => 
                n.label.toLowerCase().includes('calendar') || 
                n.label.toLowerCase().includes('date')
            );
            nodes.clear();
            nodes.add(calendarNodes);
            
            const calendarNodeIds = new Set(calendarNodes.map(n => n.id));
            const calendarEdges = graphData.edges.filter(e => 
                calendarNodeIds.has(e.source) && calendarNodeIds.has(e.target)
            );
            edges.clear();
            edges.add(calendarEdges);
            updateActiveButton(event.target);
        }}
        
        function showUIComponents() {{
            const uiNodes = graphData.nodes.filter(n => n.category === 'ui-component');
            nodes.clear();
            nodes.add(uiNodes);
            
            const uiNodeIds = new Set(uiNodes.map(n => n.id));
            const uiEdges = graphData.edges.filter(e => 
                uiNodeIds.has(e.source) && uiNodeIds.has(e.target)
            );
            edges.clear();
            edges.add(uiEdges);
            updateActiveButton(event.target);
        }}
        
        function updateActiveButton(clickedButton) {{
            document.querySelectorAll('.filter-btn').forEach(btn => 
                btn.classList.remove('active')
            );
            clickedButton.classList.add('active');
        }}
        
        // Hide info panel when clicking elsewhere
        document.addEventListener('click', function(event) {{
            if (!event.target.closest('#info-panel') && !event.target.closest('#graph')) {{
                document.getElementById('info-panel').style.display = 'none';
            }}
        }});
    </script>
</body>
</html>
    """
    
    # Format category list
    categories = graph_data['statistics']['categories']
    category_list = '\n'.join([
        f"<li>{cat.replace('-', ' ').title()}: {count} components</li>"
        for cat, count in categories.items()
    ])
    
    # Fill in the template
    html_content = html_template.replace('{graph_data_json}', json.dumps(graph_data))
    html_content = html_content.replace('{total_components}', str(graph_data['statistics']['total_components']))
    html_content = html_content.replace('{total_dependencies}', str(graph_data['statistics']['total_dependencies']))
    html_content = html_content.replace('{duplicate_candidates}', str(graph_data['statistics']['duplicate_candidates']))
    html_content = html_content.replace('{unused_components}', str(graph_data['statistics']['unused_components']))
    html_content = html_content.replace('{category_list}', category_list)
    
    return html_content

def create_mermaid_diagram():
    """Create a simplified Mermaid diagram for documentation"""
    
    # Load the analysis data
    report_path = Path("project_component_analysis.json")
    if not report_path.exists():
        return None
    
    with open(report_path, 'r') as f:
        data = json.load(f)
    
    components = data['detailed_components']
    
    # Focus on most used components and their relationships
    most_used = sorted(
        [(name, comp['usage_count']) for name, comp in components.items()],
        key=lambda x: x[1],
        reverse=True
    )[:20]  # Top 20 most used
    
    most_used_names = {name for name, _ in most_used}
    
    # Create simplified diagram
    mermaid_lines = ["graph TD"]
    
    # Add nodes with categories
    for name, usage_count in most_used:
        comp_data = components[name]
        category = comp_data['category'].replace('-', '_')
        
        if comp_data['is_duplicate_candidate']:
            style = f"{name}[{name}<br/>DUPLICATE<br/>{usage_count} uses]"
            mermaid_lines.append(f"    {style}")
            mermaid_lines.append(f"    class {name} duplicate")
        elif usage_count == 0:
            style = f"{name}[{name}<br/>UNUSED]"
            mermaid_lines.append(f"    {style}")
            mermaid_lines.append(f"    class {name} unused")
        else:
            style = f"{name}[{name}<br/>{usage_count} uses]"
            mermaid_lines.append(f"    {style}")
            mermaid_lines.append(f"    class {name} {category}")
    
    # Add relationships between most used components
    for name in most_used_names:
        comp_data = components[name]
        for dep in comp_data['internal_dependencies']:
            if dep in most_used_names:
                mermaid_lines.append(f"    {name} --> {dep}")
    
    # Add styling
    mermaid_lines.extend([
        "",
        "    classDef ui_component fill:#3B82F6,stroke:#1E40AF,color:#ffffff",
        "    classDef feature_component fill:#10B981,stroke:#047857,color:#ffffff", 
        "    classDef page fill:#F59E0B,stroke:#D97706,color:#ffffff",
        "    classDef duplicate fill:#DC2626,stroke:#B91C1C,color:#ffffff",
        "    classDef unused fill:#9CA3AF,stroke:#6B7280,color:#ffffff",
        "    classDef other fill:#374151,stroke:#1F2937,color:#ffffff"
    ])
    
    return '\n'.join(mermaid_lines)

def main():
    """Generate all visualization outputs"""
    print("🎨 Generating Component Dependency Visualizations...")
    
    # Generate graph data
    graph_data = generate_dependency_graph_data()
    if not graph_data:
        return
    
    # Create interactive HTML visualization
    html_content = create_html_visualization(graph_data)
    html_path = Path("component_dependency_graph.html")
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ Interactive graph saved to: {html_path}")
    
    # Create Mermaid diagram
    mermaid_content = create_mermaid_diagram()
    if mermaid_content:
        mermaid_path = Path("component_dependency_diagram.mmd")
        with open(mermaid_path, 'w', encoding='utf-8') as f:
            f.write(mermaid_content)
        print(f"✅ Mermaid diagram saved to: {mermaid_path}")
    
    # Save graph data for other tools
    graph_data_path = Path("component_dependency_graph_data.json")
    with open(graph_data_path, 'w', encoding='utf-8') as f:
        json.dump(graph_data, f, indent=2)
    
    print(f"✅ Graph data saved to: {graph_data_path}")
    
    print("\n🚀 Visualization Summary:")
    print(f"📊 Total Nodes: {graph_data['statistics']['total_components']}")
    print(f"🔗 Total Edges: {graph_data['statistics']['total_dependencies']}")
    print(f"🔴 Duplicate Candidates: {graph_data['statistics']['duplicate_candidates']}")
    print(f"💀 Unused Components: {graph_data['statistics']['unused_components']}")
    print(f"\n📂 Open {html_path} in your browser to explore the interactive graph!")

if __name__ == "__main__":
    main()