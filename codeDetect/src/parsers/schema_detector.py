import re

class SchemaDetector:
    JAVA_ENTITY = re.compile(r'@Entity', re.MULTILINE)
    SQL_DDL = re.compile(r'\b(CREATE|ALTER|DROP)\s+TABLE\b', re.IGNORECASE)

    @staticmethod
    def analyze(file_path, content):
        tags = []
        if file_path.endswith('.java') and SchemaDetector.JAVA_ENTITY.search(content):
            tags.append("JPA_ENTITY")
        elif file_path.endswith('.sql') and SchemaDetector.SQL_DDL.search(content):
            tags.append("SQL_SCHEMA_CHANGE")
        return tags