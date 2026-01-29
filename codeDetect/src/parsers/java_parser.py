import re

class JavaParser:
    RX_CLASS = re.compile(r'class\s+(\w+)', re.MULTILINE)
    RX_METHOD = re.compile(r'public\s+[\w<>\[\]]+\s+(\w+)\s*\(', re.MULTILINE)
    RX_ANNOTATION = re.compile(r'@(\w+)', re.MULTILINE)
    RX_COMMENT = re.compile(r'(//.*)', re.MULTILINE)
    RX_IMPORT = re.compile(r'import\s+[\w\.]+\.(\w+);', re.MULTILINE)
    RX_REQ_MAPPING = re.compile(r'@RequestMapping\s*\(\s*"([^"]+)"')
    RX_API_METHOD = re.compile(r'@(Post|Get|Put|Delete)Mapping\s*\(\s*"([^"]+)"')

    @staticmethod
    def analyze(content):
        features = {
            "classes": JavaParser.RX_CLASS.findall(content),
            "methods": JavaParser.RX_METHOD.findall(content),
            "annotations": [f"@{a}" for a in set(JavaParser.RX_ANNOTATION.findall(content))],
            "dependencies": JavaParser.RX_IMPORT.findall(content),
            "api_endpoints": [],
            "comments": [c.strip() for c in JavaParser.RX_COMMENT.findall(content)]
        }

        base_route = ""
        base_match = JavaParser.RX_REQ_MAPPING.search(content)
        if base_match:
            base_route = base_match.group(1)

        for match in JavaParser.RX_API_METHOD.finditer(content):
            features["api_endpoints"].append({
                "verb": match.group(1).upper(),
                "route": f"{base_route}{match.group(2)}",
                "line": content[:match.start()].count('\n') + 1
            })

        return features