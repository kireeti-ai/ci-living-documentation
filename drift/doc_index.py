import os
import re
from typing import Set


def extract_symbols_from_markdown(directory: str) -> Set[str]:
    """
    Walk a directory recursively, read all .md files, and extract symbols
    enclosed in backticks.
    
    Args:
        directory: Path to the directory to scan
        
    Returns:
        Set of unique symbol names found in backticks
    """
    symbols: Set[str] = set()
    
    if not os.path.isdir(directory):
        return symbols
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if not file.endswith('.md'):
                continue
            
            file_path = os.path.join(root, file)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except (IOError, UnicodeDecodeError):
                continue
            
            matches = re.findall(r'`([^`]+)`', content)
            
            for match in matches:
                symbol = match.strip()
                if symbol:
                    symbols.add(symbol)
    
    return symbols