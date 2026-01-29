import re

class JSParser:
    """
    US-8: Detects React Components and Hooks.
    """

    # React Patterns
    RX_COMPONENT = re.compile(r'function\s+[A-Z][a-zA-Z0-9]*\s*\(|const\s+[A-Z][a-zA-Z0-9]*\s*=\s*\([^\)]*\)\s*=>', re.MULTILINE)
    RX_HOOK = re.compile(r'\buse[A-Z][a-zA-Z0-9]*\b', re.MULTILINE)
    RX_JSX_USAGE = re.compile(r'<[A-Z][a-zA-Z0-9]*', re.MULTILINE)
    RX_FUNCTION = re.compile(r'(?:const|function)\s+(\w+)\s*=?\s*\(', re.MULTILINE)

    # Express API route patterns
    RX_EXPRESS_ROUTE = re.compile(r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]', re.MULTILINE)
    RX_IMPORT = re.compile(r'(?:import|require)\s+.*?[\'"](.+?)[\'"]', re.MULTILINE)

    @staticmethod
    def analyze(content):
        # Detect React components
        react_components = []
        if JSParser.RX_COMPONENT.search(content):
            react_components.append("REACT_COMPONENT")

        # Add API endpoints detection
        api_endpoints = []
        for match in JSParser.RX_EXPRESS_ROUTE.finditer(content):
            api_endpoints.append({
                "verb": match.group(1).upper(),
                "route": match.group(2),
                "line": content[:match.start()].count('\n') + 1
            })

        # Return structured format matching TSParser
        return {
            "functions": JSParser.RX_FUNCTION.findall(content),
            "react_components": react_components,
            "hooks": list(set(JSParser.RX_HOOK.findall(content))),
            "dependencies": JSParser.RX_IMPORT.findall(content),
            "api_endpoints": api_endpoints
        }