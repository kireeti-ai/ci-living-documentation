import ast
import re


class PythonParser:
    """Parser for Python files using AST with fallback extraction."""

    @staticmethod
    def _decorator_to_str(node: ast.AST) -> str:
        try:
            return ast.unparse(node)
        except Exception:
            return ""

    @staticmethod
    def analyze(content: str) -> dict:
        features = {
            "functions": [],
            "classes": [],
            "decorators": []
        }

        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    features["functions"].append(node.name)
                    for dec in node.decorator_list:
                        dec_name = PythonParser._decorator_to_str(dec)
                        if dec_name:
                            features["decorators"].append(dec_name)
                elif isinstance(node, ast.ClassDef):
                    features["classes"].append(node.name)
                    for dec in node.decorator_list:
                        dec_name = PythonParser._decorator_to_str(dec)
                        if dec_name:
                            features["decorators"].append(dec_name)
        except SyntaxError:
            features["functions"] = re.findall(r'^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(', content, re.MULTILINE)
            features["classes"] = re.findall(r'^\s*class\s+([A-Za-z_]\w*)\s*[\(:]', content, re.MULTILINE)
            features["decorators"] = re.findall(r'^\s*@([A-Za-z_][\w\.]*)', content, re.MULTILINE)

        features["functions"] = list(dict.fromkeys(features["functions"]))
        features["classes"] = list(dict.fromkeys(features["classes"]))
        features["decorators"] = list(dict.fromkeys(features["decorators"]))
        return features
