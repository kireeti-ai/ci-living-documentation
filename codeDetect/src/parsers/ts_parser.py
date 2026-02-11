import re

class TSParser:
    """Parser for JavaScript/TypeScript files - extracts functions/classes/API endpoints."""

    RX_FUNCTION = re.compile(r'\bfunction\s+([A-Za-z_]\w*)\s*\(', re.MULTILINE)
    RX_ARROW_FUNCTION = re.compile(
        r'\b(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>',
        re.MULTILINE
    )
    RX_CLASS = re.compile(r'\bclass\s+([A-Za-z_]\w*)\b', re.MULTILINE)
    RX_EXPORT_FUNCTION = re.compile(r'\bexport\s+(?:default\s+)?function\s+([A-Za-z_]\w*)\s*\(', re.MULTILINE)
    RX_EXPORT_ARROW = re.compile(
        r'\bexport\s+(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>',
        re.MULTILINE
    )
    RX_EXPORT_CLASS = re.compile(r'\bexport\s+(?:default\s+)?class\s+([A-Za-z_]\w*)\b', re.MULTILINE)
    # Express API route patterns (US-13: API Impact)
    RX_EXPRESS_ROUTE = re.compile(r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]', re.MULTILINE)

    @staticmethod
    def _dedupe_order(items):
        seen = set()
        result = []
        for item in items:
            if item not in seen:
                seen.add(item)
                result.append(item)
        return result

    @staticmethod
    def analyze(content):
        functions = (
            TSParser.RX_FUNCTION.findall(content) +
            TSParser.RX_ARROW_FUNCTION.findall(content)
        )
        classes = TSParser.RX_CLASS.findall(content)
        exported_functions = (
            TSParser.RX_EXPORT_FUNCTION.findall(content) +
            TSParser.RX_EXPORT_ARROW.findall(content)
        )
        exported_classes = TSParser.RX_EXPORT_CLASS.findall(content)

        features = {
            "functions": TSParser._dedupe_order(functions),
            "classes": TSParser._dedupe_order(classes),
            "exported_functions": TSParser._dedupe_order(exported_functions),
            "exported_classes": TSParser._dedupe_order(exported_classes),
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
