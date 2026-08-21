import json
from pathlib import Path
import tempfile
import unittest

from aiohttp.test_utils import TestClient, TestServer

from app import Config, create_app


ORIGIN = "https://professorzoom45.github.io"


class FakeVerifier:
    def __init__(self, accepted=True):
        self.accepted = accepted

    async def verify(self, token, remote_ip):
        return self.accepted and token == "valid-token"


class FakeMailer:
    def __init__(self, fail_on_call=None):
        self.messages = []
        self.calls = 0
        self.fail_on_call = fail_on_call

    async def send(self, message):
        self.calls += 1
        if self.calls == self.fail_on_call:
            raise RuntimeError("simulated provider error")
        self.messages.append(message)


def payload():
    submission = {
        "submission_id": "ctf-test-submission-1234",
        "submitter": {"name": "Alex Flame", "email": "alex@example.com"},
        "timestamp": "2026-08-21T20:00:00Z",
        "cards": [{"name": f"Card {index}"} for index in range(1, 6)],
    }
    return {
        "submission_id": submission["submission_id"],
        "file_name": "CTF_Cards_Alex.json",
        "turnstile_token": "valid-token",
        "json": json.dumps(submission),
    }


class SubmissionServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.logo_path = Path(self.temporary.name) / "ctf-logo-v2.png"
        self.logo_path.write_bytes(b"test-png-logo")
        self.mailer = FakeMailer()
        self.config = Config(
            allowed_origin=ORIGIN,
            owner_email="changethewrld@outlook.com",
            sender_email="changethewrld@outlook.com",
            ms_client_id="test-client-id",
            ms_authority="https://login.microsoftonline.com/consumers",
            token_cache_path=Path(self.temporary.name) / "cache.json",
            turnstile_secret="test-secret",
            expected_hostname="professorzoom45.github.io",
            database_path=Path(self.temporary.name) / "submissions.sqlite3",
            logo_path=self.logo_path,
            bind_host="127.0.0.1",
            bind_port=8787,
            rate_limit_per_hour=20,
        )
        application = await create_app(self.config, self.mailer, FakeVerifier())
        self.client = TestClient(TestServer(application))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()
        self.temporary.cleanup()

    async def post(self, data=None, origin=ORIGIN):
        return await self.client.post(
            "/submit-card",
            json=data or payload(),
            headers={"Origin": origin},
        )

    async def test_sends_owner_attachment_and_submitter_thank_you(self):
        response = await self.post()
        result = await response.json()
        self.assertEqual(response.status, 200)
        self.assertEqual(result, {"ok": True, "owner_email_sent": True, "submitter_email_sent": True})
        self.assertEqual(len(self.mailer.messages), 2)
        owner, submitter = self.mailer.messages
        self.assertEqual(owner["To"], "changethewrld@outlook.com")
        self.assertEqual(owner["Subject"], "Alex Flame's Custom Cards")
        self.assertEqual(owner["Reply-To"], "alex@example.com")
        self.assertEqual(len(list(owner.iter_attachments())), 1)
        self.assertEqual(submitter["To"], "alex@example.com")
        self.assertIn("Cards Are Under Review", submitter["Subject"])
        submitter_text = submitter.get_body(preferencelist=("plain",)).get_content()
        self.assertIn("reviewed for possible inclusion", submitter_text)
        self.assertIn("Perfect Timing Gaming", submitter_text)
        self.assertNotIn("Makairis Holding Group", submitter_text)
        submitter_attachments = list(submitter.iter_attachments())
        self.assertEqual(len(submitter_attachments), 1)
        self.assertEqual(submitter_attachments[0].get_filename(), "Carry-The-Flame-Logo.png")
        self.assertEqual(submitter_attachments[0].get_content_type(), "image/png")

    async def test_duplicate_request_does_not_send_duplicate_emails(self):
        self.assertEqual((await self.post()).status, 200)
        self.assertEqual((await self.post()).status, 200)
        self.assertEqual(len(self.mailer.messages), 2)

    async def test_partial_failure_retries_only_missing_email(self):
        await self.client.close()
        self.mailer = FakeMailer(fail_on_call=2)
        application = await create_app(self.config, self.mailer, FakeVerifier())
        self.client = TestClient(TestServer(application))
        await self.client.start_server()
        first = await self.post()
        first_result = await first.json()
        self.assertEqual(first.status, 502)
        self.assertTrue(first_result["owner_email_sent"])
        self.assertFalse(first_result["submitter_email_sent"])
        second = await self.post()
        self.assertEqual(second.status, 200)
        self.assertEqual(self.mailer.calls, 3)
        self.assertEqual(len(self.mailer.messages), 2)
        self.assertEqual(self.mailer.messages[-1]["To"], "alex@example.com")

    async def test_rejects_wrong_origin(self):
        response = await self.post(origin="https://evil.example")
        self.assertEqual(response.status, 403)
        self.assertEqual(len(self.mailer.messages), 0)

    async def test_rejects_failed_turnstile(self):
        bad = payload()
        bad["turnstile_token"] = "bad-token"
        response = await self.post(bad)
        self.assertEqual(response.status, 403)
        self.assertEqual(len(self.mailer.messages), 0)


if __name__ == "__main__":
    unittest.main()
