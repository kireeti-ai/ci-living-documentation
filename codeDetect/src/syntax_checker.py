"""
US-11: Syntax Tolerance

Syntax checking module that validates source code without crashing on errors.
Supports multiple languages with graceful degradation.
"""

import ast
import re
from typing import Optional, Tuple


class SyntaxChecker:
    """
    US-11: Syntax Tolerance

    Checks for syntax errors in source code.
    Returns True if syntax is INVALID (error detected).
    Returns False if syntax is valid.

    Key principle: Never crash, always return a result.
    """

    @staticmethod
    def check(file_path: str, content: str) -> bool:
        """
        Check if file has syntax errors.

        Args:
            file_path: Path to the file (used to determine language)
            content: File content string

        Returns:
            True if syntax error detected, False if valid
        """
        if not content or not content.strip():
            return False  # Empty files are "valid"

        ext = file_path.lower().split('.')[-1] if '.' in file_path else ''

        if ext == 'py':
            return SyntaxChecker._check_python(content)
        elif ext == 'java':
            return SyntaxChecker._check_java(content)
        elif ext in ['js', 'jsx', 'ts', 'tsx']:
            return SyntaxChecker._check_javascript(content)
        elif ext == 'json':
            return SyntaxChecker._check_json(content)

        # Unknown language - assume valid
        return False

    @staticmethod
    def _check_python(content: str) -> bool:
        """Check Python syntax using AST parser."""
        try:
            ast.parse(content)
            return False  # No error
        except SyntaxError as e:
            return True   # Has error
        except Exception:
            return True   # Other parsing error

    @staticmethod
    def _check_java(content: str) -> bool:
        """
        Basic Java syntax check using heuristics.
        Note: Full Java parsing requires tree-sitter.
        """
        # Check for balanced braces
        if not SyntaxChecker._check_balanced(content, '{', '}'):
            return True

        # Check for balanced parentheses
        if not SyntaxChecker._check_balanced(content, '(', ')'):
            return True

        # Check for common syntax issues
        # Unclosed strings (very basic check)
        if content.count('"') % 2 != 0:
            # Could be escaped quotes, so just flag as potential issue
            pass

        return False

    @staticmethod
    def _check_javascript(content: str) -> bool:
        """
        Basic JavaScript/TypeScript syntax check.
        Note: Full JS/TS parsing requires tree-sitter.
        """
        # Check for balanced braces
        if not SyntaxChecker._check_balanced(content, '{', '}'):
            return True

        # Check for balanced brackets
        if not SyntaxChecker._check_balanced(content, '[', ']'):
            return True

        # Check for balanced parentheses
        if not SyntaxChecker._check_balanced(content, '(', ')'):
            return True

        # Check for template literal balance
        if content.count('`') % 2 != 0:
            return True

        return False

    @staticmethod
    def _check_json(content: str) -> bool:
        """Check JSON syntax."""
        import json
        try:
            json.loads(content)
            return False
        except json.JSONDecodeError:
            return True
        except Exception:
            return True

    @staticmethod
    def _check_balanced(content: str, open_char: str, close_char: str) -> bool:
        """
        Check if characters are balanced, accounting for strings and comments.
        """
        # Remove string contents to avoid false positives
        # This is a simplified version - won't handle all edge cases
        cleaned = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '""', content)
        cleaned = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", "''", cleaned)
        cleaned = re.sub(r'`[^`\\]*(?:\\.[^`\\]*)*`', '``', cleaned)

        # Remove comments
        cleaned = re.sub(r'//.*$', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)
        cleaned = re.sub(r'#.*$', '', cleaned, flags=re.MULTILINE)  # Python comments

        count = 0
        for char in cleaned:
            if char == open_char:
                count += 1
            elif char == close_char:
                count -= 1
            if count < 0:
                return False  # More closing than opening

        return count == 0

    @staticmethod
    def get_error_details(file_path: str, content: str) -> Optional[dict]:
        """
        Get detailed error information if syntax error exists.

        Returns:
            Dictionary with error details or None if no error
        """
        ext = file_path.lower().split('.')[-1] if '.' in file_path else ''

        if ext == 'py':
            try:
                ast.parse(content)
                return None
            except SyntaxError as e:
                return {
                    "type": "SyntaxError",
                    "message": str(e.msg) if hasattr(e, 'msg') else str(e),
                    "line": e.lineno,
                    "column": e.offset,
                    "text": e.text.strip() if e.text else None
                }

        if ext == 'json':
            import json
            try:
                json.loads(content)
                return None
            except json.JSONDecodeError as e:
                return {
                    "type": "JSONDecodeError",
                    "message": e.msg,
                    "line": e.lineno,
                    "column": e.colno
                }

        # For other languages, just return basic check result
        if SyntaxChecker.check(file_path, content):
            return {
                "type": "SyntaxError",
                "message": "Unbalanced brackets or other syntax issue detected",
                "line": None,
                "column": None
            }

        return None