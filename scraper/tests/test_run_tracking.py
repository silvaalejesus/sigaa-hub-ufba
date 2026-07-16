import os
import unittest
from unittest.mock import patch

from run_tracking import (
    determine_final_status,
    normalize_trigger_source,
    sanitize_error_message,
    stable_error_code,
)


class RunTrackingTests(unittest.TestCase):
    def test_sanitize_error_message_redacts_secrets_and_limits_size(self) -> None:
        secret = "service-role-secret-value"
        raw = (
            f"authorization: Bearer abc; apikey={secret}; "
            "token=visible-token "
            + ("x" * 1500)
        )

        with patch.dict(os.environ, {"SUPABASE_SERVICE_ROLE_KEY": secret}, clear=False):
            sanitized = sanitize_error_message(raw)

        self.assertNotIn(secret, sanitized)
        self.assertNotIn("visible-token", sanitized)
        self.assertLessEqual(len(sanitized), 1000)

    def test_normalize_trigger_source_rejects_untrusted_value(self) -> None:
        with patch.dict(
            os.environ,
            {"SCRAPER_TRIGGER_SOURCE": "valor-invalido", "GITHUB_ACTIONS": "false"},
            clear=False,
        ):
            self.assertEqual(normalize_trigger_source(), "local")

    def test_github_schedule_is_normalized(self) -> None:
        with patch.dict(
            os.environ,
            {
                "SCRAPER_TRIGGER_SOURCE": "",
                "GITHUB_ACTIONS": "true",
                "GITHUB_EVENT_NAME": "schedule",
            },
            clear=False,
        ):
            self.assertEqual(normalize_trigger_source(), "scheduled")

    def test_partial_when_some_departments_fail(self) -> None:
        payload = {
            "metadata": {
                "total_unidades_encontradas": 10,
                "total_unidades_processadas": 9,
                "total_unidades_com_erro": 1,
            }
        }
        self.assertEqual(determine_final_status(payload), "partial")

    def test_failed_when_no_department_is_processed(self) -> None:
        payload = {
            "metadata": {
                "total_unidades_encontradas": 10,
                "total_unidades_processadas": 0,
                "total_unidades_com_erro": 10,
            }
        }
        self.assertEqual(determine_final_status(payload), "failed")

    def test_stable_error_code(self) -> None:
        self.assertEqual(stable_error_code(TimeoutError("timeout")), "TIMEOUT_ERROR")


if __name__ == "__main__":
    unittest.main()
