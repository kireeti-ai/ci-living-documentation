import re

class SchemaDetector:
    """
    Detects database schema changes in code.
    US-14: Schema Changes

    Supports:
    - Java JPA (@Entity annotations)
    - SQL DDL statements (CREATE/ALTER/DROP TABLE)
    - Mongoose schemas (mongoose.Schema, mongoose.model)
    - Django models (models.Model)
    """

    # Java JPA
    JAVA_ENTITY = re.compile(r'@Entity', re.MULTILINE)

    # SQL DDL
    SQL_DDL = re.compile(r'\b(CREATE|ALTER|DROP)\s+TABLE\b', re.IGNORECASE)

    # Mongoose (JavaScript/TypeScript)
    MONGOOSE_SCHEMA = re.compile(r'new\s+(?:mongoose\.)?Schema\s*\(', re.MULTILINE)
    MONGOOSE_MODEL = re.compile(r'mongoose\.model\s*\(\s*[\'"](\w+)[\'"]', re.MULTILINE)

    # Django ORM (Python)
    DJANGO_MODEL = re.compile(r'class\s+\w+\s*\(\s*(?:models\.)?Model\s*\)', re.MULTILINE)

    @staticmethod
    def analyze(file_path, content):
        """
        Analyze file content for schema-related patterns.

        Args:
            file_path: Path to the file
            content: File content string

        Returns:
            List of schema tags (e.g., ['JPA_ENTITY'], ['MONGOOSE_SCHEMA'])
        """
        tags = []
        ext = file_path.lower().split('.')[-1] if '.' in file_path else ''

        # Java JPA Entity
        if ext == 'java' and SchemaDetector.JAVA_ENTITY.search(content):
            tags.append("JPA_ENTITY")

        # SQL DDL
        elif ext == 'sql' and SchemaDetector.SQL_DDL.search(content):
            tags.append("SQL_SCHEMA_CHANGE")

        # Mongoose (JavaScript/TypeScript)
        elif ext in ['js', 'ts', 'jsx', 'tsx']:
            if SchemaDetector.MONGOOSE_SCHEMA.search(content):
                tags.append("MONGOOSE_SCHEMA")
            if SchemaDetector.MONGOOSE_MODEL.search(content):
                # Extract model name
                match = SchemaDetector.MONGOOSE_MODEL.search(content)
                if match:
                    tags.append(f"MONGOOSE_MODEL:{match.group(1)}")

        # Django ORM (Python)
        elif ext == 'py' and SchemaDetector.DJANGO_MODEL.search(content):
            tags.append("DJANGO_MODEL")

        return tags