import re

class TSParser:
    """Parser for JavaScript/TypeScript files - extracts functions and API endpoints."""

    RX_FUNCTION = re.compile(r'(?:const|function)\s+(\w+)\s*=?\s*\(', re.MULTILINE)
    # Express API route patterns (US-13: API Impact)
    RX_EXPRESS_ROUTE = re.compile(r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]', re.MULTILINE)

    @staticmethod
    def analyze(content):
        features = {
            "functions": TSParser.RX_FUNCTION.findall(content),
            "api_endpoints": []
        }

        # Detect Express routes (US-13: API Impact)
        for match in TSParser.RX_EXPRESS_ROUTE.finditer(content):
            features["api_endpoints"].append({
                "verb": match.group(1).upper(),
                "route": match.group(2),
                "line": content[:match.start()].count('\n') + 1
            })

        return features