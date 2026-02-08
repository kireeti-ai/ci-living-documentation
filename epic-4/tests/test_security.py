import unittest
from epic4.github_client import GitHubClient


class TestSecurityFeatures(unittest.TestCase):
    def setUp(self):
        self.client = GitHubClient("owner", "repo", "ghp_1234567890abcdefghijklmnopqrstuvwxyz")

    def test_sanitize_token_in_url(self):
        """Test that tokens in URLs are sanitized."""
        text = "fatal: repository 'https://x-access-token:ghp_1234567890abcdefghijklmnopqrstuvwxyz@github.com/owner/repo.git' not found"
        sanitized = self.client._sanitize_log(text)

        self.assertNotIn("ghp_1234567890", sanitized)
        self.assertIn("***", sanitized)

    def test_sanitize_github_personal_token(self):
        """Test that GitHub personal access tokens are sanitized."""
        text = "Using token ghp_1234567890abcdefghijklmnopqrstuvwxyz for authentication"
        sanitized = self.client._sanitize_log(text)

        self.assertNotIn("ghp_1234567890", sanitized)
        self.assertIn("***REDACTED_TOKEN***", sanitized)

    def test_sanitize_github_oauth_token(self):
        """Test that GitHub OAuth tokens are sanitized."""
        text = "Using token gho_1234567890abcdefghijklmnopqrstuvwxyz for authentication"
        sanitized = self.client._sanitize_log(text)

        self.assertNotIn("gho_1234567890", sanitized)
        self.assertIn("***REDACTED_TOKEN***", sanitized)

    def test_sanitize_basic_auth_url(self):
        """Test that basic auth credentials in URLs are sanitized."""
        text = "Cloning into 'repo'...\nfatal: repository 'https://user:password@github.com/owner/repo.git' not found"
        sanitized = self.client._sanitize_log(text)

        self.assertNotIn("user:password", sanitized)
        self.assertIn("***@", sanitized)

    def test_sanitize_none_or_empty(self):
        """Test that None and empty strings are handled."""
        self.assertEqual(self.client._sanitize_log(None), None)
        self.assertEqual(self.client._sanitize_log(""), "")

    def test_sanitize_preserves_safe_content(self):
        """Test that safe content is not modified."""
        safe_text = "Successfully pushed to branch auto/docs/abc123"
        sanitized = self.client._sanitize_log(safe_text)

        self.assertEqual(safe_text, sanitized)


if __name__ == '__main__':
    unittest.main()
