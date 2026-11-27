from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, Mock, call

from app import GraphSendRejected, OUTLOOK_SENDER, OutlookTokenUnavailable
from forge_mail_outbox import (
    DEFAULT_OUTBOX_URL,
    MailJournal,
    Outcome,
    OutboxClient,
    OutboxError,
    build_message,
    deliver,
    process_outbox,
)


def job(kind="queued", lease="lease-one"):
    return {
        "id": "forge-job-123",
        "lease": lease,
        "kind": kind,
        "payload": {
            "format": "CTF_FORGE_SUBMISSION_V1",
            "submission_id": "ctf-test-submission-123",
            "submitter": {"name": "Alex Flame", "email": "flame@example.com"},
        },
        "reason": None,
        "releaseAt": None,
    }


class MessageTests(unittest.TestCase):
    def test_templates_use_exact_sender_and_saved_submitter(self):
        queued = job()
        approved = dict(job("approved"), releaseAt=3786912000000)
        rejected = dict(job("rejected"), reason="Clarify the cost before the attack.")
        for item, expected in (
            (queued, "queued them for review"),
            (approved, "2090-01-01 at 00:00 UTC"),
            (rejected, "Clarify the cost before the attack."),
        ):
            with self.subTest(kind=item["kind"]):
                message = build_message(item)
                self.assertEqual(message["From"], OUTLOOK_SENDER)
                self.assertEqual(message["To"].addresses[0].addr_spec, "flame@example.com")
                self.assertEqual(len(message["To"].addresses), 1)
                self.assertEqual(message["Reply-To"], OUTLOOK_SENDER)
                body = message.get_content().replace("\n", " ")
                self.assertIn(expected, body)
                self.assertIn(item["payload"]["submission_id"], body)
        self.assertEqual(build_message(queued)["Message-ID"], build_message(queued)["Message-ID"])
        already_due = dict(job("approved"), releaseAt=0)
        self.assertNotIn("Scheduled release", build_message(already_due).get_content())

    def test_refuses_missing_reason_and_multiple_recipients(self):
        with self.assertRaises(ValueError):
            build_message(job("rejected"))
        item = job()
        item["payload"]["submitter"]["email"] = "first@example.com,second@example.com"
        with self.assertRaises(ValueError):
            build_message(item)


class OutboxClientTests(unittest.IsolatedAsyncioTestCase):
    async def test_post_uses_bearer_without_redirects_and_exact_contract(self):
        session = Mock()
        response_context = AsyncMock()
        response = response_context.__aenter__.return_value
        response.status = 200
        response.json.return_value = {"job": job()}
        session.post.return_value = response_context

        client = OutboxClient(session, DEFAULT_OUTBOX_URL, "a" * 64)
        self.assertEqual(await client.claim(), job())
        self.assertTrue(await client.finish("forge-job-123", "lease-one", Outcome("retry", 123)))
        headers = {"Authorization": "Bearer " + "a" * 64, "User-Agent": "Carry-The-Flame-Forge/1.0"}
        self.assertEqual(session.post.call_args_list, [
            call(DEFAULT_OUTBOX_URL, json={"action": "claim"}, headers=headers, allow_redirects=False),
            call(DEFAULT_OUTBOX_URL, json={
                "action": "finish", "id": "forge-job-123", "lease": "lease-one",
                "status": "retry", "retryAfter": 123,
            }, headers=headers, allow_redirects=False),
        ])

    async def test_rejects_redirect_and_plaintext_endpoint(self):
        session = Mock()
        context = AsyncMock()
        context.__aenter__.return_value.status = 302
        session.post.return_value = context
        with self.assertRaisesRegex(OutboxError, "HTTP 302"):
            await OutboxClient(session, DEFAULT_OUTBOX_URL, "a" * 64).claim()
        with self.assertRaises(OutboxError):
            OutboxClient(session, DEFAULT_OUTBOX_URL.replace("https:", "http:"), "a" * 64)


class WorkerTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        temporary = self.enterContext(tempfile.TemporaryDirectory())
        self.path = Path(temporary) / "outcomes.sqlite3"
        self.journal = MailJournal(self.path)
        self.mailer = Mock()
        self.mailer.send = AsyncMock()
        self.client = Mock()
        self.client.claim = AsyncMock()
        self.client.finish = AsyncMock(return_value=True)

    async def test_lost_acceptance_callback_does_not_resend(self):
        self.client.claim.side_effect = [job(), job(lease="lease-after-restart"), None]
        self.client.finish.side_effect = [TimeoutError(), False, True]
        with self.assertRaises(TimeoutError):
            await process_outbox(self.client, self.journal, self.mailer)
        await process_outbox(self.client, MailJournal(self.path), self.mailer)
        self.mailer.send.assert_awaited_once()
        self.assertEqual(self.client.finish.await_args_list, [
            call("forge-job-123", "lease-one", Outcome("accepted")),
            call("forge-job-123", "lease-one", Outcome("accepted")),
            call("forge-job-123", "lease-after-restart", Outcome("accepted")),
        ])

    async def test_crashed_attempt_recovers_as_uncertain(self):
        self.journal.begin("forge-job-123", "lease-one")
        self.client.claim.return_value = None
        await process_outbox(self.client, MailJournal(self.path), self.mailer)
        self.client.finish.assert_awaited_once_with("forge-job-123", "lease-one", Outcome("uncertain"))
        self.mailer.send.assert_not_awaited()

    async def test_rejected_throttle_only_retries_under_new_lease(self):
        self.client.claim.side_effect = [job(), job(), job(lease="new-lease"), None]
        self.mailer.send.side_effect = [GraphSendRejected(429, 120), None]
        for expected_calls in (1, 1, 2):
            await process_outbox(self.client, self.journal, self.mailer)
            self.assertEqual(self.mailer.send.await_count, expected_calls)
        self.assertEqual(self.client.finish.await_args_list, [
            call("forge-job-123", "lease-one", Outcome("retry", 120)),
            call("forge-job-123", "lease-one", Outcome("retry", 120)),
            call("forge-job-123", "new-lease", Outcome("accepted")),
        ])

    async def test_delivery_outcomes_distinguish_rejection_and_uncertainty(self):
        for error, expected in (
            (GraphSendRejected(400), "failed"),
            (GraphSendRejected(408), "uncertain"),
            (GraphSendRejected(500), "uncertain"),
            (TimeoutError(), "uncertain"),
            (OutlookTokenUnavailable(), "retry"),
        ):
            self.mailer.send.side_effect = error
            self.assertEqual(await deliver(job(), self.mailer), Outcome(expected))
        self.mailer.send.reset_mock()
        self.assertEqual(await deliver(job("unexpected-kind"), self.mailer), Outcome("failed"))
        self.mailer.send.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
