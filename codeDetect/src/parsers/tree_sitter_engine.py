"""
Tree-sitter based parsing engine for multi-language AST analysis.
"""

import os
from typing import Dict, List, Optional, Any

# Try to import tree-sitter, fall back to regex if unavailable
try:
    import tree_sitter_languages
    from tree_sitter import Parser, Language, Node
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False
    print("Warning: tree-sitter not installed. Falling back to regex parsing.")


class TreeSitterEngine:
    """
    Tree-sitter based AST parsing engine.
    Provides language-agnostic parsing with syntax tolerance.
    """

    # Language mapping: file extension -> tree-sitter language name
    LANGUAGE_MAP = {
        '.java': 'java',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.py': 'python',
        '.go': 'go',
        '.rs': 'rust',
        '.rb': 'ruby',
        '.c': 'c',
        '.cpp': 'cpp',
        '.cs': 'c_sharp',
        '.php': 'php',
    }

    def __init__(self):
        self.parser = Parser() if TREE_SITTER_AVAILABLE else None
        self._languages_cache: Dict[str, Language] = {}

    def _get_language(self, extension: str) -> Optional[Language]:
        """Get tree-sitter language for file extension."""
        if not TREE_SITTER_AVAILABLE:
            return None

        lang_name = self.LANGUAGE_MAP.get(extension)
        if not lang_name:
            return None

        if lang_name not in self._languages_cache:
            try:
                self._languages_cache[lang_name] = tree_sitter_languages.get_language(lang_name)
            except Exception as e:
                print(f"Warning: Could not load language {lang_name}: {e}")
                return None

        return self._languages_cache[lang_name]

    def parse(self, code: str, extension: str) -> Dict[str, Any]:
        """
        Parse source code and extract features.

        Args:
            code: Source code string
            extension: File extension (e.g., '.java')

        Returns:
            Dictionary containing extracted features and metadata
        """
        result = {
            "syntax_error": False,
            "error_nodes": [],
            "features": {},
            "ast_available": TREE_SITTER_AVAILABLE
        }

        if not TREE_SITTER_AVAILABLE or not code:
            return result

        language = self._get_language(extension)
        if not language:
            return result

        try:
            self.parser.set_language(language)
            tree = self.parser.parse(bytes(code, 'utf-8'))

            # Check for errors but continue
            if tree.root_node.has_error:
                result["syntax_error"] = True
                result["error_nodes"] = self._collect_error_nodes(tree.root_node)
                print(f"Warning: Syntax errors detected. Partial analysis will be performed.")

            # Extract features based on language
            lang_name = self.LANGUAGE_MAP.get(extension, '')

            if lang_name == 'java':
                result["features"] = self._extract_java_features(tree.root_node, code)
            elif lang_name in ['javascript', 'typescript', 'tsx']:
                result["features"] = self._extract_js_features(tree.root_node, code)
            elif lang_name == 'python':
                result["features"] = self._extract_python_features(tree.root_node, code)
            else:
                result["features"] = self._extract_generic_features(tree.root_node, code)

        except Exception as e:
            print(f"Parsing error: {e}")
            result["syntax_error"] = True

        return result

    def _collect_error_nodes(self, node: 'Node', errors: List = None) -> List[Dict]:
        """Collect all ERROR nodes in the tree."""
        if errors is None:
            errors = []

        if node.type == 'ERROR' or node.is_missing:
            errors.append({
                "type": "ERROR" if node.type == 'ERROR' else "MISSING",
                "start_line": node.start_point[0] + 1,
                "end_line": node.end_point[0] + 1,
                "start_col": node.start_point[1],
                "end_col": node.end_point[1]
            })

        for child in node.children:
            self._collect_error_nodes(child, errors)

        return errors

    def _get_node_text(self, node: 'Node', code: str) -> str:
        """Extract text for a node."""
        return code[node.start_byte:node.end_byte]

    def _extract_java_features(self, root: 'Node', code: str) -> Dict[str, Any]:
        """Extract Java classes, methods, and Spring annotations."""
        features = {
            "classes": [],
            "methods": [],
            "constructors": [],
            "annotations": [],
            "api_endpoints": [],
            "schema_annotations": [],
            "imports": [],
            "comments": [],
            "complexity_nodes": 0
        }

        self._traverse_java(root, code, features)
        return features

    def _traverse_java(self, node: 'Node', code: str, features: Dict):
        """Recursively traverse Java AST."""

        # Class declarations
        if node.type == 'class_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                features["classes"].append(self._get_node_text(name_node, code))

        # Method declarations
        elif node.type == 'method_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                features["methods"].append(self._get_node_text(name_node, code))

        # Constructor declarations
        elif node.type == 'constructor_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                features["constructors"].append(self._get_node_text(name_node, code))

        # Annotations (Spring)
        elif node.type in ['marker_annotation', 'annotation']:
            name_node = node.child_by_field_name('name')
            if name_node:
                ann_name = self._get_node_text(name_node, code)
                features["annotations"].append(f"@{ann_name}")

                # Check for API annotations
                if ann_name in ['GetMapping', 'PostMapping', 'PutMapping',
                               'DeleteMapping', 'PatchMapping', 'RequestMapping']:
                    route = self._extract_annotation_value(node, code)
                    features["api_endpoints"].append({
                        "verb": ann_name.replace('Mapping', '').upper() or 'REQUEST',
                        "route": route,
                        "line": node.start_point[0] + 1
                    })

                # Check for schema annotations
                if ann_name in ['Entity', 'Table', 'Column', 'Id',
                               'OneToMany', 'ManyToOne', 'ManyToMany']:
                    features["schema_annotations"].append(ann_name)

        # Import declarations
        elif node.type == 'import_declaration':
            features["imports"].append(self._get_node_text(node, code).strip())

        # Comments
        elif node.type in ['line_comment', 'block_comment']:
            features["comments"].append(self._get_node_text(node, code).strip())

        # Complexity nodes
        elif node.type in ['if_statement', 'for_statement', 'while_statement',
                          'do_statement', 'switch_expression', 'try_statement',
                          'catch_clause', 'ternary_expression']:
            features["complexity_nodes"] += 1

        # Recurse
        for child in node.children:
            self._traverse_java(child, code, features)

    def _extract_annotation_value(self, node: 'Node', code: str) -> str:
        """Extract value from annotation arguments."""
        for child in node.children:
            if child.type == 'annotation_argument_list':
                for arg in child.children:
                    if arg.type == 'string_literal':
                        return self._get_node_text(arg, code).strip('"\'')
                    elif arg.type == 'element_value_pair':
                        for val in arg.children:
                            if val.type == 'string_literal':
                                return self._get_node_text(val, code).strip('"\'')
        return ""

    def _extract_js_features(self, root: 'Node', code: str) -> Dict[str, Any]:
        """Extract JS/TS functions, exports, and React components."""
        features = {
            "functions": [],
            "classes": [],
            "exports": [],
            "react_components": [],
            "hooks": [],
            "imports": [],
            "api_routes": [],
            "comments": [],
            "complexity_nodes": 0
        }

        self._traverse_js(root, code, features)
        return features

    def _traverse_js(self, node: 'Node', code: str, features: Dict):
        """Recursively traverse JS/TS AST."""

        # Function declarations
        if node.type == 'function_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                func_name = self._get_node_text(name_node, code)
                features["functions"].append(func_name)

                # Check if React component (PascalCase + returns JSX)
                if func_name[0].isupper() and self._contains_jsx(node):
                    features["react_components"].append(func_name)

        # Arrow functions (const Fn = () => {})
        elif node.type == 'lexical_declaration':
            for child in node.children:
                if child.type == 'variable_declarator':
                    name_node = child.child_by_field_name('name')
                    value_node = child.child_by_field_name('value')

                    if name_node and value_node:
                        func_name = self._get_node_text(name_node, code)

                        if value_node.type == 'arrow_function':
                            features["functions"].append(func_name)

                            # Check React component
                            if func_name[0].isupper() and self._contains_jsx(value_node):
                                features["react_components"].append(func_name)

        # Class declarations
        elif node.type == 'class_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                features["classes"].append(self._get_node_text(name_node, code))

        # Export statements
        elif node.type == 'export_statement':
            features["exports"].append(self._get_node_text(node, code)[:100] + "...")

        # Import statements
        elif node.type == 'import_statement':
            source = None
            for child in node.children:
                if child.type == 'string':
                    source = self._get_node_text(child, code).strip('"\'')
            if source:
                features["imports"].append(source)

        # React hooks
        elif node.type == 'call_expression':
            func = node.child_by_field_name('function')
            if func and func.type == 'identifier':
                func_name = self._get_node_text(func, code)
                if func_name.startswith('use') and func_name[3:4].isupper():
                    if func_name not in features["hooks"]:
                        features["hooks"].append(func_name)

        # Comments
        elif node.type == 'comment':
            features["comments"].append(self._get_node_text(node, code).strip())

        # Complexity nodes
        elif node.type in ['if_statement', 'for_statement', 'for_in_statement',
                          'while_statement', 'do_statement', 'switch_statement',
                          'try_statement', 'catch_clause', 'ternary_expression']:
            features["complexity_nodes"] += 1

        # Recurse
        for child in node.children:
            self._traverse_js(child, code, features)

    def _contains_jsx(self, node: 'Node') -> bool:
        """Check if node contains JSX elements."""
        if node.type in ['jsx_element', 'jsx_self_closing_element', 'jsx_fragment']:
            return True
        for child in node.children:
            if self._contains_jsx(child):
                return True
        return False

    def _extract_python_features(self, root: 'Node', code: str) -> Dict[str, Any]:
        """Extract Python functions, classes, and decorators."""
        features = {
            "functions": [],
            "classes": [],
            "decorators": [],
            "imports": [],
            "api_routes": [],
            "docstrings": [],
            "comments": [],
            "complexity_nodes": 0
        }

        self._traverse_python(root, code, features)
        return features

    def _traverse_python(self, node: 'Node', code: str, features: Dict):
        """Recursively traverse Python AST."""

        # Function definitions
        if node.type == 'function_definition':
            name_node = node.child_by_field_name('name')
            if name_node:
                features["functions"].append(self._get_node_text(name_node, code))

            # Extract docstring
            body = node.child_by_field_name('body')
            if body and body.children:
                first_stmt = body.children[0]
                if first_stmt.type == 'expression_statement':
                    for child in first_stmt.children:
                        if child.type == 'string':
                            features["docstrings"].append({
                                "type": "function",
                                "text": self._get_node_text(child, code)[:200]
                            })

        # Class definitions
        elif node.type == 'class_definition':
            name_node = node.child_by_field_name('name')
            if name_node:
                features["classes"].append(self._get_node_text(name_node, code))

        # Decorators
        elif node.type == 'decorator':
            dec_text = self._get_node_text(node, code)
            features["decorators"].append(dec_text)

            # Check for API routes
            if any(pattern in dec_text for pattern in ['@app.route', '@router.', '@api.']):
                route = self._extract_decorator_route(dec_text)
                features["api_routes"].append({
                    "decorator": dec_text,
                    "route": route,
                    "line": node.start_point[0] + 1
                })

        # Import statements
        elif node.type in ['import_statement', 'import_from_statement']:
            features["imports"].append(self._get_node_text(node, code).strip())

        # Comments
        elif node.type == 'comment':
            features["comments"].append(self._get_node_text(node, code).strip())

        # Complexity nodes
        elif node.type in ['if_statement', 'elif_clause', 'for_statement',
                          'while_statement', 'try_statement', 'except_clause',
                          'with_statement', 'conditional_expression',
                          'list_comprehension', 'dictionary_comprehension']:
            features["complexity_nodes"] += 1

        # Recurse
        for child in node.children:
            self._traverse_python(child, code, features)

    def _extract_decorator_route(self, decorator: str) -> str:
        """Extract route path from decorator."""
        import re
        match = re.search(r'["\']([^"\']+)["\']', decorator)
        return match.group(1) if match else ""

    def _extract_generic_features(self, root: 'Node', code: str) -> Dict[str, Any]:
        """Extract generic features for unsupported languages."""
        return {
            "node_count": self._count_nodes(root),
            "depth": self._tree_depth(root)
        }

    def _count_nodes(self, node: 'Node') -> int:
        """Count total nodes in tree."""
        count = 1
        for child in node.children:
            count += self._count_nodes(child)
        return count

    def _tree_depth(self, node: 'Node', depth: int = 0) -> int:
        """Calculate maximum tree depth."""
        max_depth = depth
        for child in node.children:
            child_depth = self._tree_depth(child, depth + 1)
            max_depth = max(max_depth, child_depth)
        return max_depth


# Singleton instance for easy access
engine = TreeSitterEngine()


def parse_code(code: str, extension: str) -> Dict[str, Any]:
    """
    Convenience function for parsing code.

    Args:
        code: Source code string
        extension: File extension (e.g., '.java')

    Returns:
        Parsed features dictionary
    """
    return engine.parse(code, extension)
