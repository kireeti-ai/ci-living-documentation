import re

class TSParser:
    RX_FUNCTION = re.compile(r'(?:const|function)\s+(\w+)\s*=?\s*\(', re.MULTILINE)
    RX_HOOK = re.compile(r'\b(use[A-Z]\w+)', re.MULTILINE)
    RX_COMPONENT = re.compile(r'export\s+(?:default\s+)?(?:const|function|class)\s+([A-Z]\w+)', re.MULTILINE)
    RX_IMPORT = re.compile(r'import\s+.*?\s+from\s+[\'"](.+?)[\'"]', re.MULTILINE)
    # Express API route patterns
    RX_EXPRESS_ROUTE = re.compile(r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]', re.MULTILINE)

    @staticmethod
    def analyze(content):
        features = {
            "functions": TSParser.RX_FUNCTION.findall(content),
            "react_components": TSParser.RX_COMPONENT.findall(content),
            "hooks": list(set(TSParser.RX_HOOK.findall(content))),
            "dependencies": TSParser.RX_IMPORT.findall(content),
            "api_endpoints": []
        }

        # Detect Express routes
        for match in TSParser.RX_EXPRESS_ROUTE.finditer(content):
            features["api_endpoints"].append({
                "verb": match.group(1).upper(),
                "route": match.group(2),
                "line": content[:match.start()].count('\n') + 1
            })

        return features