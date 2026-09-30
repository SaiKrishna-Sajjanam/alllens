"""Inactive-account rule (pure logic; nothing is deleted here)."""
import unittest
from datetime import datetime, timedelta, timezone

from pipeline.accounts import Account, decide

NOW = datetime(2026, 9, 30, 14, 5, tzinfo=timezone.utc)


class AccountTests(unittest.TestCase):
    def test_deleted_after_12_months_unused_no_warning_email(self):
        self.assertEqual(decide(Account("u", NOW - timedelta(days=10)), NOW), "keep")
        self.assertEqual(decide(Account("u", NOW - timedelta(days=364)), NOW), "keep")
        self.assertEqual(decide(Account("u", NOW - timedelta(days=365)), NOW), "delete")

    def test_the_app_sends_no_email(self):
        import pkgutil

        import pipeline

        self.assertNotIn("notify", {m.name for m in pkgutil.iter_modules(pipeline.__path__)})


if __name__ == "__main__":
    unittest.main()
