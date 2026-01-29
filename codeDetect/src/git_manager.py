"""
US-1: Git Context Validation
US-2: Smart Change Retrieval
US-3: New Project Safety

Git management module for extracting repository context and changes.
"""

import os
import datetime
from typing import List, Dict, Optional, Any
from git import Repo, InvalidGitRepositoryError, GitCommandError


class GitManager:
    """
    US-1: Git Context Validation

    Manages git repository access with proper validation and error handling.
    """

    def __init__(self, repo_path: str):
        """
        Initialize GitManager with repository path.

        Args:
            repo_path: Path to the git repository

        Raises:
            InvalidGitRepositoryError: If path is not a valid git repository
        """
        self.repo_path = repo_path

        # US-1: Validate .git directory exists
        git_dir = os.path.join(repo_path, ".git")
        if not os.path.exists(git_dir):
            raise InvalidGitRepositoryError(
                f"No .git folder found at {repo_path}. "
                "Please run this tool in a git repository."
            )

        try:
            self.repo = Repo(repo_path)
        except Exception as e:
            raise InvalidGitRepositoryError(
                f"Failed to initialize git repository: {e}"
            )

        # Validate repository has at least one commit
        if self.repo.head.is_detached:
            self._current_branch = "DETACHED HEAD"
        else:
            try:
                self._current_branch = self.repo.active_branch.name
            except TypeError:
                self._current_branch = "unknown"

    def get_metadata(self) -> Dict[str, Any]:
        """
        US-1: Extract repository metadata for impact_report.json

        Returns:
            Dictionary containing repository context
        """
        try:
            head = self.repo.head.commit

            # Safely get branch name
            try:
                branch_name = self.repo.active_branch.name
            except TypeError:
                branch_name = "detached"

            return {
                "repository": os.path.basename(os.path.abspath(self.repo_path)),
                "branch": branch_name,
                "commit_sha": head.hexsha[:8],
                "full_sha": head.hexsha,
                "author": head.author.name,
                "author_email": head.author.email,
                "intent": {
                    "message": head.message.strip(),
                    "timestamp": datetime.datetime.fromtimestamp(
                        head.committed_date
                    ).isoformat()
                },
                "stats": {
                    "total_commits": self._get_commit_count(),
                    "is_first_commit": len(head.parents) == 0
                }
            }
        except Exception as e:
            return {
                "repository": os.path.basename(os.path.abspath(self.repo_path)),
                "branch": "unknown",
                "error": str(e)
            }

    def _get_commit_count(self) -> int:
        """Get total number of commits in the repository."""
        try:
            return len(list(self.repo.iter_commits()))
        except Exception:
            return -1

    def get_changed_files(self, compare_with: str = "HEAD~1") -> List[Dict[str, str]]:
        """
        US-2: Smart Change Retrieval
        US-3: New Project Safety

        Determines which files are ADDED, MODIFIED, or DELETED.
        Handles first commit gracefully by listing all files as ADDED.

        Args:
            compare_with: Git ref to compare against (default: HEAD~1)

        Returns:
            List of dictionaries with 'path' and 'change_type' keys
        """
        changes = []

        try:
            head_commit = self.repo.head.commit
        except Exception as e:
            return [{
                "path": "ERROR",
                "change_type": "ERROR",
                "error": str(e)
            }]

        # US-3: Handle first commit (no parents)
        if not head_commit.parents:
            for item in head_commit.tree.traverse():
                if item.type == 'blob':
                    changes.append({
                        "path": item.path,
                        "change_type": "ADDED",
                        "is_first_commit": True
                    })
            return changes

        # US-2: Compare against previous commit
        try:
            diffs = head_commit.diff(compare_with)
        except GitCommandError as e:
            # Fallback: compare against the first parent
            try:
                diffs = head_commit.diff(head_commit.parents[0])
            except Exception:
                return [{
                    "path": "ERROR",
                    "change_type": "ERROR",
                    "error": f"Failed to compute diff: {e}"
                }]

        for diff in diffs:
            change_type = "MODIFIED"
            rename_info = None

            if diff.new_file:
                change_type = "ADDED"
            elif diff.deleted_file:
                change_type = "DELETED"
            elif diff.renamed_file:
                change_type = "RENAMED"
                rename_info = {
                    "from": diff.a_path,
                    "to": diff.b_path
                }

            # Use b_path for new/modified, a_path for deleted
            path = diff.b_path if diff.b_path else diff.a_path

            change_entry = {
                "path": path,
                "change_type": change_type
            }

            if rename_info:
                change_entry["rename_info"] = rename_info

            changes.append(change_entry)

        return changes

    def get_file_content(self, file_path: str, ref: str = "HEAD") -> str:
        """
        US-5: Binary Safety

        Safely retrieve file content from a specific git reference.

        Args:
            file_path: Path to file within repository
            ref: Git reference (default: HEAD)

        Returns:
            File content as string, or empty string on error
        """
        try:
            return self.repo.git.show(f"{ref}:{file_path}")
        except GitCommandError:
            # File might not exist at this ref
            return ""
        except UnicodeDecodeError:
            # Binary file - return empty
            return ""
        except Exception:
            return ""

    def get_diff_content(self, file_path: str) -> Optional[str]:
        """
        Get the unified diff for a specific file.

        Args:
            file_path: Path to file within repository

        Returns:
            Diff content as string or None
        """
        try:
            head = self.repo.head.commit
            if head.parents:
                return self.repo.git.diff(
                    "HEAD~1", "HEAD", "--", file_path
                )
            else:
                # First commit - show full content
                return self.repo.git.show(f"HEAD:{file_path}")
        except Exception:
            return None

    def get_commit_history(self, max_count: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent commit history.

        Args:
            max_count: Maximum number of commits to retrieve

        Returns:
            List of commit information dictionaries
        """
        commits = []
        try:
            for commit in self.repo.iter_commits(max_count=max_count):
                commits.append({
                    "sha": commit.hexsha[:8],
                    "message": commit.message.strip().split('\n')[0],  # First line
                    "author": commit.author.name,
                    "date": datetime.datetime.fromtimestamp(
                        commit.committed_date
                    ).isoformat()
                })
        except Exception:
            pass

        return commits

    def has_uncommitted_changes(self) -> bool:
        """Check if there are uncommitted changes in the working directory."""
        try:
            return self.repo.is_dirty(untracked_files=True)
        except Exception:
            return False