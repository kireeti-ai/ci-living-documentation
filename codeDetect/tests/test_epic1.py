"""
Comprehensive unit tests for Epic-1 code detection modules.
Tests coverage for:
- SyntaxChecker: Multi-language syntax validation
- FileFilter: File filtering and categorization
- SeverityCalculator: Impact severity assessment
- Parsers: Java, Python, and Schema detection
"""

import pytest
import sys
import os

# Add parent directory to sys.path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.syntax_checker import SyntaxChecker
from src.file_filter import FileFilter, ConfigLoader
from src.scorers import SeverityCalculator
from src.parsers.java_parser import JavaParser
from src.parsers.python_parser import PythonParser
from src.parsers.schema_detector import SchemaDetector




# ============================================================================
# SyntaxChecker Tests
# ============================================================================

class TestSyntaxChecker:
    """Test suite for SyntaxChecker module."""

    def test_python_valid_syntax(self):
        """Test valid Python code returns False (no error)."""
        code = """
def hello():
    print("Hello, World!")
    return True
"""
        assert SyntaxChecker.check("test.py", code) == False

    def test_python_invalid_syntax(self):
        """Test invalid Python code returns True (has error)."""
        code = """
def hello():
    print("Hello
    return True
"""
        assert SyntaxChecker.check("test.py", code) == True

    def test_python_missing_colon(self):
        """Test Python code with missing colon."""
        code = """
def hello()
    print("test")
"""
        assert SyntaxChecker.check("test.py", code) == True

    def test_empty_file(self):
        """Test empty file is considered valid."""
        assert SyntaxChecker.check("test.py", "") == False
        assert SyntaxChecker.check("test.py", "   \n  ") == False

    def test_java_balanced_braces(self):
        """Test Java code with balanced braces."""
        code = """
public class Test {
    public void method() {
        System.out.println("test");
    }
}
"""
        assert SyntaxChecker.check("Test.java", code) == False

    def test_java_unbalanced_braces(self):
        """Test Java code with unbalanced braces."""
        code = """
public class Test {
    public void method() {
        System.out.println("test");
    }
"""
        assert SyntaxChecker.check("Test.java", code) == True

    def test_javascript_balanced_brackets(self):
        """Test JavaScript with balanced brackets."""
        code = """
const arr = [1, 2, 3];
function test() {
    return arr;
}
"""
        assert SyntaxChecker.check("test.js", code) == False

    def test_javascript_unbalanced_brackets(self):
        """Test JavaScript with unbalanced brackets."""
        code = "const arr = [1, 2, 3;"
        assert SyntaxChecker.check("test.js", code) == True

    def test_javascript_template_literals(self):
        """Test JavaScript with balanced template literals."""
        code = "const msg = `Hello ${name}`;"
        assert SyntaxChecker.check("test.js", code) == False

    def test_javascript_unbalanced_template_literals(self):
        """Test JavaScript with unbalanced template literals."""
        code = "const msg = `Hello ${name};"
        assert SyntaxChecker.check("test.js", code) == True

    def test_json_valid(self):
        """Test valid JSON."""
        code = '{"name": "test", "value": 123}'
        assert SyntaxChecker.check("data.json", code) == False

    def test_json_invalid(self):
        """Test invalid JSON."""
        code = '{"name": "test", value: 123}'
        assert SyntaxChecker.check("data.json", code) == True

    def test_unknown_extension_defaults_valid(self):
        """Test unknown file extension defaults to valid."""
        code = "some random content"
        assert SyntaxChecker.check("file.xyz", code) == False

    def test_get_error_details_python(self):
        """Test error details extraction for Python."""
        code = "def test(\npass"
        details = SyntaxChecker.get_error_details("test.py", code)
        assert details is not None
        assert details["type"] == "SyntaxError"
        assert "line" in details

    def test_get_error_details_valid_code(self):
        """Test error details returns None for valid code."""
        code = "def test():\n    pass"
        details = SyntaxChecker.get_error_details("test.py", code)
        assert details is None


# ============================================================================
# FileFilter Tests
# ============================================================================

class TestFileFilter:
    """Test suite for FileFilter module."""

    def test_exclude_node_modules(self):
        """Test node_modules directory is excluded."""
        assert FileFilter.should_exclude_from_analysis("project/node_modules/package/file.js") == True

    def test_exclude_git_directory(self):
        """Test .git directory is excluded."""
        assert FileFilter.should_exclude_from_analysis(".git/config") == True

    def test_exclude_pycache(self):
        """Test __pycache__ directory is excluded."""
        assert FileFilter.should_exclude_from_analysis("src/__pycache__/module.pyc") == True

    def test_exclude_ds_store(self):
        """Test .DS_Store file is excluded."""
        assert FileFilter.should_exclude_from_analysis("folder/.DS_Store") == True

    def test_exclude_package_lock(self):
        """Test package-lock.json is excluded."""
        assert FileFilter.should_exclude_from_analysis("package-lock.json") == True

    def test_normal_source_file_not_excluded(self):
        """Test normal source files are not excluded."""
        assert FileFilter.should_exclude_from_analysis("src/main.py") == False
        assert FileFilter.should_exclude_from_analysis("src/App.java") == False

    def test_is_known_binary_extension(self):
        """Test binary file extension detection."""
        assert FileFilter.is_known_binary_extension("image.png") == True
        assert FileFilter.is_known_binary_extension("document.pdf") == True
        assert FileFilter.is_known_binary_extension("app.exe") == True
        assert FileFilter.is_known_binary_extension("source.py") == False

    def test_is_safe_to_read_source_files(self):
        """Test source files are safe to read."""
        assert FileFilter.is_safe_to_read("src/main.py") == True
        assert FileFilter.is_safe_to_read("src/App.java") == True
        assert FileFilter.is_safe_to_read("src/index.js") == True

    def test_is_safe_to_read_binary_files(self):
        """Test binary files are not safe to read."""
        assert FileFilter.is_safe_to_read("image.png") == False
        assert FileFilter.is_safe_to_read("lib.so") == False

    def test_is_safe_to_read_data_files(self):
        """Test data files are safe to read."""
        assert FileFilter.is_safe_to_read("config.json") == True
        assert FileFilter.is_safe_to_read("data.yaml") == True
        assert FileFilter.is_safe_to_read("README.md") == True

    def test_is_critical_file_pom_xml(self):
        """Test pom.xml is identified as critical."""
        assert FileFilter.is_critical_file("pom.xml") == True

    def test_is_critical_file_package_json(self):
        """Test package.json is identified as critical."""
        assert FileFilter.is_critical_file("package.json") == True

    def test_is_critical_file_dockerfile(self):
        """Test Dockerfile is identified as critical."""
        assert FileFilter.is_critical_file("Dockerfile") == True

    def test_is_critical_file_regular_source(self):
        """Test regular source files are not critical."""
        assert FileFilter.is_critical_file("src/main.py") == False

    def test_is_critical_file_migration(self):
        """Test migration files are identified as critical."""
        assert FileFilter.is_critical_file("migrations/001_create_users.sql") == True
        assert FileFilter.is_critical_file("db/schema.sql") == True

    def test_categorize_source_file(self):
        """Test source file categorization."""
        assert FileFilter.categorize_file("src/main.py") == "source"
        assert FileFilter.categorize_file("App.java") == "source"
        assert FileFilter.categorize_file("index.js") == "source"

    def test_categorize_config_file(self):
        """Test config file categorization."""
        assert FileFilter.categorize_file("config.json") == "config"
        assert FileFilter.categorize_file("settings.yaml") == "config"

    def test_categorize_test_file(self):
        """Test test file categorization."""
        assert FileFilter.categorize_file("tests/test_main.py") == "test"
        assert FileFilter.categorize_file("src/main.spec.js") == "test"

    def test_categorize_doc_file(self):
        """Test documentation file categorization."""
        assert FileFilter.categorize_file("README.md") == "doc"
        assert FileFilter.categorize_file("docs/api.rst") == "doc"

    def test_categorize_style_file(self):
        """Test style file categorization."""
        assert FileFilter.categorize_file("styles/main.css") == "style"
        assert FileFilter.categorize_file("styles/app.scss") == "style"

    def test_custom_ignore_patterns(self):
        """Test custom ignore patterns."""
        custom_patterns = ["*.log", "temp/*"]
        assert FileFilter.should_exclude_from_analysis("app.log", custom_patterns) == True
        assert FileFilter.should_exclude_from_analysis("temp/cache.txt", custom_patterns) == True
        assert FileFilter.should_exclude_from_analysis("src/main.py", custom_patterns) == False


# ============================================================================
# SeverityCalculator Tests
# ============================================================================

class TestSeverityCalculator:
    """Test suite for SeverityCalculator module."""

    def test_schema_change_is_major(self):
        """Test schema changes are always MAJOR."""
        features = {}
        schema_tags = ["JPA_ENTITY"]
        assert SeverityCalculator.assess(".java", features, schema_tags) == "MAJOR"

    def test_api_endpoint_is_major(self):
        """Test API endpoint changes are MAJOR."""
        features = {"api_endpoints": [{"verb": "GET", "route": "/api/users"}]}
        schema_tags = []
        assert SeverityCalculator.assess(".java", features, schema_tags) == "MAJOR"

    def test_java_controller_annotation_is_major(self):
        """Test Java controller annotations are MAJOR."""
        features = {"annotations": ["@RestController", "@GetMapping"]}
        schema_tags = []
        assert SeverityCalculator.assess(".java", features, schema_tags) == "MAJOR"

    def test_java_entity_annotation_is_major(self):
        """Test Java @Entity annotation is MAJOR."""
        features = {"annotations": ["@Entity"]}
        schema_tags = []
        assert SeverityCalculator.assess(".java", features, schema_tags) == "MAJOR"

    def test_java_multiple_methods_is_minor(self):
        """Test Java with multiple methods is MINOR."""
        features = {"methods": ["method1", "method2", "method3", "method4"], "annotations": []}
        schema_tags = []
        assert SeverityCalculator.assess(".java", features, schema_tags) == "MINOR"

    def test_java_few_methods_is_minor(self):
        """Test Java with few methods is MINOR."""
        features = {"methods": ["method1"], "annotations": []}
        schema_tags = []
        assert SeverityCalculator.assess(".java", features, schema_tags) == "MINOR"

    def test_java_no_methods_is_patch(self):
        """Test Java with no methods is PATCH."""
        features = {"methods": [], "annotations": []}
        schema_tags = []
        assert SeverityCalculator.assess(".java", features, schema_tags) == "PATCH"

    def test_python_route_decorator_is_major(self):
        """Test Python route decorators are MAJOR."""
        features = {"decorators": ["@app.route('/api/test')"]}
        schema_tags = []
        assert SeverityCalculator.assess(".py", features, schema_tags) == "MAJOR"

    def test_python_with_classes_is_minor(self):
        """Test Python with classes is MINOR."""
        features = {"classes": ["MyClass"], "decorators": []}
        schema_tags = []
        assert SeverityCalculator.assess(".py", features, schema_tags) == "MINOR"

    def test_python_multiple_functions_is_minor(self):
        """Test Python with multiple functions is MINOR."""
        features = {"functions": ["func1", "func2", "func3"], "classes": [], "decorators": []}
        schema_tags = []
        assert SeverityCalculator.assess(".py", features, schema_tags) == "MINOR"

    def test_python_minimal_changes_is_patch(self):
        """Test Python with minimal changes is PATCH."""
        features = {"functions": [], "classes": [], "decorators": []}
        schema_tags = []
        assert SeverityCalculator.assess(".py", features, schema_tags) == "PATCH"

    def test_javascript_multiple_functions_is_minor(self):
        """Test JavaScript with multiple functions is MINOR."""
        features = {"functions": ["func1", "func2", "func3"]}
        schema_tags = []
        assert SeverityCalculator.assess(".js", features, schema_tags) == "MINOR"

    def test_javascript_few_functions_is_minor(self):
        """Test JavaScript with few functions is MINOR."""
        features = {"functions": ["func1"]}
        schema_tags = []
        assert SeverityCalculator.assess(".js", features, schema_tags) == "MINOR"

    def test_javascript_no_functions_is_patch(self):
        """Test JavaScript with no functions is PATCH."""
        features = {"functions": []}
        schema_tags = []
        assert SeverityCalculator.assess(".js", features, schema_tags) == "PATCH"

    def test_sql_file_is_major(self):
        """Test SQL files are always MAJOR."""
        features = {}
        schema_tags = []
        assert SeverityCalculator.assess(".sql", features, schema_tags) == "MAJOR"

    def test_config_file_is_minor(self):
        """Test config file changes are MINOR."""
        features = {}
        schema_tags = []
        assert SeverityCalculator.assess(".json", features, schema_tags) == "MINOR"
        assert SeverityCalculator.assess(".yaml", features, schema_tags) == "MINOR"

    def test_unknown_extension_is_patch(self):
        """Test unknown extension defaults to PATCH."""
        features = {}
        schema_tags = []
        assert SeverityCalculator.assess(".xyz", features, schema_tags) == "PATCH"


# ============================================================================
# JavaParser Tests
# ============================================================================

class TestJavaParser:
    """Test suite for JavaParser module."""

    def test_extract_class_names(self):
        """Test extraction of Java class names."""
        code = """
public class UserController {
    private class InnerClass {
    }
}
class HelperClass {
}
"""
        result = JavaParser.analyze(code)
        assert "UserController" in result["classes"]
        assert "InnerClass" in result["classes"]
        assert "HelperClass" in result["classes"]

    def test_extract_method_names(self):
        """Test extraction of Java method names (public methods only)."""
        code = """
public class Test {
    public void methodOne() {}
    public String methodTwo() {}
    private int methodThree() {}
}
"""
        result = JavaParser.analyze(code)
        assert "methodOne" in result["methods"]
        assert "methodTwo" in result["methods"]
        # Note: JavaParser only extracts public methods, not private ones
        assert len(result["methods"]) == 2


    def test_extract_annotations(self):
        """Test extraction of Java annotations."""
        code = """
@RestController
@RequestMapping("/api")
public class UserController {
    @GetMapping("/users")
    @ResponseBody
    public List<User> getUsers() {}
}
"""
        result = JavaParser.analyze(code)
        assert "@RestController" in result["annotations"]
        assert "@RequestMapping" in result["annotations"]
        assert "@GetMapping" in result["annotations"]
        assert "@ResponseBody" in result["annotations"]

    def test_extract_api_endpoints(self):
        """Test extraction of API endpoints."""
        code = """
@RestController
@RequestMapping("/api")
public class UserController {
    @GetMapping("/users")
    public List<User> getUsers() {}
    
    @PostMapping("/users")
    public User createUser() {}
}
"""
        result = JavaParser.analyze(code)
        assert len(result["api_endpoints"]) == 2
        
        # Check first endpoint
        endpoint1 = result["api_endpoints"][0]
        assert endpoint1["verb"] == "GET"
        assert endpoint1["route"] == "/api/users"
        
        # Check second endpoint
        endpoint2 = result["api_endpoints"][1]
        assert endpoint2["verb"] == "POST"
        assert endpoint2["route"] == "/api/users"

    def test_no_request_mapping(self):
        """Test endpoints without base RequestMapping."""
        code = """
@RestController
public class UserController {
    @GetMapping("/users")
    public List<User> getUsers() {}
}
"""
        result = JavaParser.analyze(code)
        assert len(result["api_endpoints"]) == 1
        assert result["api_endpoints"][0]["route"] == "/users"

    def test_empty_java_file(self):
        """Test empty Java file."""
        result = JavaParser.analyze("")
        assert result["classes"] == []
        assert result["methods"] == []
        assert result["annotations"] == []
        assert result["api_endpoints"] == []


# ============================================================================
# PythonParser Tests
# ============================================================================

class TestPythonParser:
    """Test suite for PythonParser module."""

    def test_extract_function_names(self):
        """Test extraction of Python function names."""
        code = """
def function_one():
    pass

def function_two():
    return True

async def async_function():
    return await something()
"""
        result = PythonParser.analyze(code)
        assert "function_one" in result["functions"]
        assert "function_two" in result["functions"]
        assert "async_function" in result["functions"]

    def test_extract_class_names(self):
        """Test extraction of Python class names."""
        code = """
class MyClass:
    pass

class AnotherClass(BaseClass):
    pass
"""
        result = PythonParser.analyze(code)
        assert "MyClass" in result["classes"]
        assert "AnotherClass" in result["classes"]

    def test_extract_decorators(self):
        """Test extraction of Python decorators."""
        code = """
@app.route('/api/test')
@login_required
def test_view():
    pass

@dataclass
class User:
    name: str
"""
        result = PythonParser.analyze(code)
        assert "app.route('/api/test')" in result["decorators"]
        assert "login_required" in result["decorators"]
        assert "dataclass" in result["decorators"]

    def test_fallback_on_syntax_error(self):
        """Test fallback regex extraction on syntax errors."""
        code = """
def valid_function():
    pass

def broken_function(
    # Missing closing paren and body
"""
        result = PythonParser.analyze(code)
        # Should still extract valid_function via regex fallback
        assert "valid_function" in result["functions"]

    def test_empty_python_file(self):
        """Test empty Python file."""
        result = PythonParser.analyze("")
        assert result["functions"] == []
        assert result["classes"] == []
        assert result["decorators"] == []

    def test_deduplication(self):
        """Test that duplicates are removed."""
        code = """
def same_function():
    pass

def same_function():
    pass
"""
        result = PythonParser.analyze(code)
        # Should have only one entry due to deduplication
        assert result["functions"].count("same_function") == 1


# ============================================================================
# SchemaDetector Tests
# ============================================================================

class TestSchemaDetector:
    """Test suite for SchemaDetector module."""

    def test_java_jpa_entity(self):
        """Test Java JPA @Entity detection."""
        code = """
@Entity
@Table(name = "users")
public class User {
    @Id
    private Long id;
}
"""
        result = SchemaDetector.analyze("User.java", code)
        assert "JPA_ENTITY" in result

    def test_sql_create_table(self):
        """Test SQL CREATE TABLE detection."""
        code = "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100));"
        result = SchemaDetector.analyze("schema.sql", code)
        assert "SQL_SCHEMA_CHANGE" in result

    def test_sql_alter_table(self):
        """Test SQL ALTER TABLE detection."""
        code = "ALTER TABLE users ADD COLUMN email VARCHAR(255);"
        result = SchemaDetector.analyze("migration.sql", code)
        assert "SQL_SCHEMA_CHANGE" in result

    def test_sql_drop_table(self):
        """Test SQL DROP TABLE detection."""
        code = "DROP TABLE old_users;"
        result = SchemaDetector.analyze("cleanup.sql", code)
        assert "SQL_SCHEMA_CHANGE" in result

    def test_mongoose_schema(self):
        """Test Mongoose schema detection."""
        code = """
const userSchema = new mongoose.Schema({
    name: String,
    email: String
});
"""
        result = SchemaDetector.analyze("User.js", code)
        assert "MONGOOSE_SCHEMA" in result

    def test_mongoose_model(self):
        """Test Mongoose model detection."""
        code = """
const User = mongoose.model('User', userSchema);
"""
        result = SchemaDetector.analyze("models.js", code)
        assert any("MONGOOSE_MODEL:User" in tag for tag in result)

    def test_django_model(self):
        """Test Django model detection."""
        code = """
class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
"""
        result = SchemaDetector.analyze("models.py", code)
        assert "DJANGO_MODEL" in result

    def test_django_model_short_syntax(self):
        """Test Django model with short syntax."""
        code = """
class User(Model):
    name = CharField(max_length=100)
"""
        result = SchemaDetector.analyze("models.py", code)
        assert "DJANGO_MODEL" in result

    def test_no_schema_in_regular_java(self):
        """Test regular Java file without schema."""
        code = """
public class Helper {
    public void doSomething() {}
}
"""
        result = SchemaDetector.analyze("Helper.java", code)
        assert result == []

    def test_no_schema_in_regular_python(self):
        """Test regular Python file without schema."""
        code = """
def calculate(x, y):
    return x + y
"""
        result = SchemaDetector.analyze("utils.py", code)
        assert result == []

    def test_typescript_mongoose(self):
        """Test Mongoose in TypeScript files."""
        code = """
const schema = new mongoose.Schema({
    field: String
});
"""
        result = SchemaDetector.analyze("model.ts", code)
        assert "MONGOOSE_SCHEMA" in result


# ============================================================================
# ConfigLoader Tests
# ============================================================================

class TestConfigLoader:
    """Test suite for ConfigLoader module."""

    def test_load_nonexistent_config(self):
        """Test loading non-existent config returns defaults."""
        config = ConfigLoader.load("/nonexistent/path/config.yaml")
        assert "ignore_patterns" in config
        assert "critical_paths" in config
        assert config["ignore_patterns"] == []

    def test_load_none_config(self):
        """Test loading None config returns defaults."""
        config = ConfigLoader.load(None)
        assert "ignore_patterns" in config
        assert config["ignore_patterns"] == []
