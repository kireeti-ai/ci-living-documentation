"""
US-4: Noise Filtering
US-5: Binary Safety

File filtering utilities for code change detection.
"""

import os
import mimetypes
import fnmatch
from typing import List, Dict, Optional
import yaml


class ConfigLoader:
    """
    Loads configuration from YAML file (US-4).
    """

    @staticmethod
    def load(config_path: str) -> Dict:
        """Load configuration from YAML file."""
        default_config = {
            "ignore_patterns": [],
            "critical_paths": [],
            "api_patterns": {},
            "schema_patterns": {}
        }

        if not config_path or not os.path.exists(config_path):
            return default_config

        try:
            with open(config_path, 'r') as f:
                loaded = yaml.safe_load(f)
                if loaded:
                    default_config.update(loaded)
        except Exception as e:
            print(f"Warning: Could not load config: {e}")

        return default_config


class FileFilter:
    """
    US-4: Noise Filtering
    US-5: Binary Safety

    Filters files based on patterns and safety checks.
    """

    IGNORED_EXTENSIONS = {
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
        '.pyc', '.pyo', '.pyd',
        '.log', '.tmp', '.temp',
        '.class', '.jar', '.war', '.ear',
        '.dll', '.exe', '.so', '.dylib',
        '.zip', '.gz', '.tar', '.rar', '.7z',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.woff', '.woff2', '.ttf', '.eot', '.otf',
        '.mp3', '.mp4', '.avi', '.mov', '.wav',
        '.db', '.sqlite', '.sqlite3'
    }

    IGNORED_FILES = {
        '.DS_Store',
        'Thumbs.db',
        '.gitignore',
        '.gitattributes',
        'package-lock.json',
        'yarn.lock',
        'Pipfile.lock',
        'poetry.lock'
    }

    IGNORED_DIRS = {
        'dist',
        '__pycache__',
        'node_modules',
        '.git',
        '.idea',
        '.vscode',
        '.settings',
        'target',
        'build',
        'bin',
        'obj',
        '.gradle',
        '.mvn',
        'venv',
        'env',
        '.env',
        'coverage',
        '.nyc_output',
        '.pytest_cache',
        '.tox',
        'htmlcov',
        'eggs',
        '.eggs'
    }

    ALLOWED_DATA_EXTS = {
        '.json', '.xml', '.yaml', '.yml',
        '.html', '.css', '.scss', '.less',
        '.md', '.txt', '.rst',
        '.sql',
        '.properties',
        '.gitignore', '.dockerignore',
        '.env', '.env.example',
        '.toml', '.ini', '.cfg'
    }

    @staticmethod
    def is_safe_to_read(file_path: str, additional_ignores: Optional[List[str]] = None) -> bool:
        """
        US-4 & US-5: Check if file is safe to read and should be analyzed.

        Args:
            file_path: Path to the file
            additional_ignores: Additional patterns from config.yaml

        Returns:
            True if file should be analyzed, False otherwise
        """
        filename = os.path.basename(file_path)

        # Check ignored files
        if filename in FileFilter.IGNORED_FILES:
            return False

        # Check extension
        ext = os.path.splitext(file_path)[1].lower()
        if ext in FileFilter.IGNORED_EXTENSIONS:
            return False

        # Check ignored directories
        parts = file_path.replace('\\', '/').split('/')
        if any(part in FileFilter.IGNORED_DIRS for part in parts):
            return False

        # Check additional ignore patterns from config (US-4)
        if additional_ignores:
            for pattern in additional_ignores:
                if fnmatch.fnmatch(file_path, pattern):
                    return False
                if fnmatch.fnmatch(filename, pattern):
                    return False
                # Handle directory patterns
                if pattern.endswith('/') and any(part == pattern.rstrip('/') for part in parts):
                    return False

        # Allow known data files
        if ext in FileFilter.ALLOWED_DATA_EXTS:
            return True

        # Check MIME type for unknown extensions
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type:
            if not mime_type.startswith('text'):
                # Allow specific source code files even if MIME is wrong
                source_exts = {'.java', '.js', '.ts', '.py', '.jsx', '.tsx',
                              '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.cs'}
                if ext not in source_exts:
                    return False

        return True

    @staticmethod
    def is_critical_file(file_path: str, critical_paths: Optional[List[str]] = None) -> bool:
        """
        Check if file is a critical configuration file.

        Args:
            file_path: Path to the file
            critical_paths: List of critical file patterns from config

        Returns:
            True if file is critical
        """
        filename = os.path.basename(file_path)

        # Default critical files
        default_critical = {
            'pom.xml', 'build.gradle', 'build.gradle.kts',
            'package.json', 'requirements.txt', 'setup.py', 'pyproject.toml',
            'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
            '.env', '.env.example', '.env.production',
            'application.properties', 'application.yml', 'application.yaml'
        }

        if filename in default_critical:
            return True

        # Check custom critical paths
        if critical_paths:
            for pattern in critical_paths:
                if fnmatch.fnmatch(file_path, pattern):
                    return True
                if fnmatch.fnmatch(filename, pattern):
                    return True

        # Check for migration/schema files
        if 'migration' in file_path.lower() or 'schema' in file_path.lower():
            return True

        return False

    @staticmethod
    def categorize_file(file_path: str) -> str:
        """
        Categorize file by type for reporting.

        Returns one of: 'source', 'config', 'test', 'doc', 'asset', 'other'
        """
        filename = os.path.basename(file_path).lower()
        ext = os.path.splitext(file_path)[1].lower()
        path_lower = file_path.lower()

        # Test files
        if 'test' in path_lower or 'spec' in path_lower:
            return 'test'

        # Documentation
        if ext in {'.md', '.rst', '.txt', '.adoc'} or 'doc' in path_lower:
            return 'doc'

        # Configuration
        if ext in {'.json', '.yaml', '.yml', '.xml', '.properties', '.toml', '.ini', '.env'}:
            return 'config'

        # Source code
        if ext in {'.java', '.js', '.ts', '.py', '.jsx', '.tsx', '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.cs'}:
            return 'source'

        # Styles
        if ext in {'.css', '.scss', '.less', '.sass'}:
            return 'style'

        # Assets
        if ext in FileFilter.IGNORED_EXTENSIONS:
            return 'asset'

        return 'other'