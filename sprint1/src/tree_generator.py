#!/usr/bin/env python3
"""
Folder Tree Generator
Creates a hierarchical tree view of changed files
"""

def generate_tree(report):
    """
    Generate a hierarchical folder tree from the impact report
    
    Args:
        report (dict): Impact report containing changed files
    
    Returns:
        str: Tree representation of the file structure
    """
    # Support both normalized report and raw API response payload.
    if isinstance(report, dict) and "report" in report and isinstance(report.get("report"), dict):
        report = report["report"]

    # Extract all changed files
    files = [change.get("file", "unknown") for change in report.get("changes", [])]
    
    if not files:
        return "No files changed"
    
    # Build tree structure
    tree = {}
    for file_path in files:
        parts = file_path.split('/')
        current = tree
        for part in parts:
            if part not in current:
                current[part] = {}
            current = current[part]
    
    # Generate tree text representation
    def build_tree_text(node, prefix=""):
        """Recursively build tree text with ASCII-safe indentation."""
        lines = []
        items = sorted(node.items())
        
        for i, (name, children) in enumerate(items):
            is_last_item = (i == len(items) - 1)
            
            # Use ASCII connectors to avoid mojibake in non-UTF-8 terminals.
            connector = "`-- " if is_last_item else "|-- "
            lines.append(f"{prefix}{connector}{name}")
            
            # Recurse for children
            if children:
                extension = "    " if is_last_item else "|   "
                lines.extend(build_tree_text(children, prefix + extension))
        
        return lines
    
    # Start with repository root
    tree_lines = ["."]
    tree_lines.extend(build_tree_text(tree))
    
    return "\n".join(tree_lines)
