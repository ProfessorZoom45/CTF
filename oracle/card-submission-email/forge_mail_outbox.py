#!/usr/bin/env python3
"""Deliver the hosted Forge's leased submission notifications."""

from __future__ import annotations

import argparse
import asyncio
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timezone
from email.errors import MessageError
from email.headerregistry import Address
from email.message import EmailMessage
import hashlib
import logging
import os
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlsplit

from aiohttp import ClientSession, ClientTimeout

from app import (
    Config,
    GraphSendRejected,
    OUTLOOK_SENDER,
    OutlookGraphMailer,
    OutlookTokenUnavailable,
    outlook_sender_matches,
    safe_header,
    set_readable_content,
)


DEFAULT_OUTBOX_URL = "https://carry-the-flame-online.dr-zoom.chatgpt.site/api/forge-mail"
MAX_JOBS_PER_RUN = 5
JOB_KEY = re.compile(r"[A-Za-z0-9._:/=+-]{1,200}")
SUBMISSION_KEY = re.compile(r"[A-Za-z0-9-]{16,80}")
LOG = logging.getLogger(__name__)


class OutboxError(RuntimeError):
    pass


@dataclass(frozen=True)
class Outcome:
    status: str
    retry_after: int | None = None


class OutboxClient:
    def __init__(self, session: ClientSession, endpoint: str, token: str) -> None:
        url = urlsplit(endpoint)
        if (url.scheme != "https" or not url.hostname or url.port not in {None, 443}
                or url.username or url.password or url.query or url.fragment or url.path != "/api/forge-mail"):
            raise OutboxError("CTF_FORGE_OUTBOX_URL must be an HTTPS /api/forge-mail address")
        if not re.fullmatch(r"[!-~]{32,512}", token):
            raise OutboxError("CTF_FORGE_MAIL_BRIDGE_TOKEN must be a 32–512 character service token")
        self.session = session
        self.endpoint = endpoint
        self.headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": "Carry-The-Flame-Forge/1.0",
        }

    async def claim(self) -> dict | None:
        async with self.session.post(
            self.endpoint, json={"action": "claim"}, headers=self.headers, allow_redirects=False
        ) as response:
            if response.status != 200:
                raise OutboxError(f"Forge outbox claim failed (HTTP {response.status})")
            result = await response.json()
        if not isinstance(result, dict) or "job" not in result:
            raise OutboxError("Forge outbox returned an invalid claim")
        job = result["job"]
        if job is None:
            return None
        if not isinstance(job, dict) or not all(
            isinstance(job.get(key), str) and JOB_KEY.fullmatch(job[key])
            for key in ("id", "lease")
        ):
            raise OutboxError("Forge outbox returned an invalid job ID or lease")
        return job

    async def finish(self, job_id: str, lease: str, outcome: Outcome) -> bool:
        body = {"action": "finish", "id": job_id, "lease": lease, "status": outcome.status}
        if outcome.retry_after is not None:
            body["retryAfter"] = outcome.retry_after
        async with self.session.post(
            self.endpoint, json=body, headers=self.headers, allow_redirects=False
        ) as response:
            if response.status in {404, 409}:
                return False
            if response.status not in {200, 204}:
                raise OutboxError(f"Forge outbox finish failed (HTTP {response.status})")
        return True


class MailJournal:
    """Remember outcomes across lost callbacks and restarts without storing mail content."""

    def __init__(self, path: Path) -> None:
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(path)) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS outcomes (
                id TEXT PRIMARY KEY, lease TEXT NOT NULL, status TEXT NOT NULL,
                retry_after INTEGER, reported INTEGER NOT NULL DEFAULT 0
            )""")

    def recover(self) -> list[tuple[str, str, Outcome]]:
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("UPDATE outcomes SET status='uncertain' WHERE status='sending'")
            rows = db.execute("SELECT id, lease, status, retry_after FROM outcomes WHERE reported=0").fetchall()
        return [(job_id, lease, Outcome(status, delay)) for job_id, lease, status, delay in rows]

    def begin(self, job_id: str, lease: str) -> Outcome | None:
        with closing(sqlite3.connect(self.path)) as db, db:
            row = db.execute("SELECT lease, status, retry_after FROM outcomes WHERE id=?", (job_id,)).fetchone()
            if row and (row[0] == lease or row[1] != "retry"):
                status = "uncertain" if row[1] == "sending" else row[1]
                db.execute("UPDATE outcomes SET lease=?, status=?, reported=0 WHERE id=?", (lease, status, job_id))
                return Outcome(status, row[2])
            db.execute("""INSERT INTO outcomes(id, lease, status) VALUES(?, ?, 'sending')
                ON CONFLICT(id) DO UPDATE SET lease=excluded.lease, status='sending', retry_after=NULL, reported=0
            """, (job_id, lease))
        return None

    def save(self, job_id: str, lease: str, outcome: Outcome) -> None:
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute(
                "UPDATE outcomes SET status=?, retry_after=? WHERE id=? AND lease=?",
                (outcome.status, outcome.retry_after, job_id, lease),
            )

    def mark_reported(self, job_id: str, lease: str) -> None:
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("UPDATE outcomes SET reported=1 WHERE id=? AND lease=?", (job_id, lease))


def build_message(job: dict) -> EmailMessage:
    payload = job.get("payload")
    if not isinstance(payload, dict) or payload.get("format") != "CTF_FORGE_SUBMISSION_V1":
        raise ValueError("Invalid Forge submission")
    submission_id = payload.get("submission_id")
    submitter = payload.get("submitter")
    if (not isinstance(submission_id, str) or not SUBMISSION_KEY.fullmatch(submission_id)
            or not isinstance(submitter, dict)):
        raise ValueError("Invalid Forge submission details")
    recipient = submitter.get("email")
    if not isinstance(recipient, str) or not 1 <= len(recipient) <= 254 or any(c.isspace() for c in recipient):
        raise ValueError("Invalid Forge submitter email")
    address = Address(addr_spec=recipient)
    if not address.username or "." not in address.domain:
        raise ValueError("Invalid Forge submitter address")

    kind = job.get("kind")
    if kind == "queued":
        subject = "Your Carry The Flame Forge submission is queued"
        details = "We received your five cards and queued them for review. A decision email is sent separately."
    elif kind == "approved":
        subject = "Your Carry The Flame Forge submission was approved"
        details = "Your five cards were approved for publication."
        release_at = job.get("releaseAt")
        if release_at is not None:
            if type(release_at) is not int:
                raise ValueError("Invalid Forge release date")
            try:
                scheduled = datetime.fromtimestamp(release_at / 1000, timezone.utc)
            except (OverflowError, OSError) as error:
                raise ValueError("Invalid Forge release date") from error
            if scheduled > datetime.now(timezone.utc):
                details += f"\nScheduled release: {scheduled:%Y-%m-%d at %H:%M UTC}."
    elif kind == "rejected":
        subject = "Your Carry The Flame Forge submission needs revisions"
        reason = job.get("reason")
        if not isinstance(reason, str) or not reason.strip() or len(reason) > 4000:
            raise ValueError("Missing or invalid Forge rejection reason")
        details = f"Your five cards were not approved. Reviewer's reason:\n\n{reason.strip()}\n\nYou can revise your cards and submit a new package."
    else:
        raise ValueError("Unknown Forge mail kind")

    message = EmailMessage()
    message["From"] = OUTLOOK_SENDER
    message["To"] = address
    message["Reply-To"] = OUTLOOK_SENDER
    message["Subject"] = subject
    message_digest = hashlib.sha256(job["id"].encode("ascii")).hexdigest()
    message["Message-ID"] = f"<forge.{message_digest}@outlook.com>"
    name = safe_header(submitter.get("name"))
    set_readable_content(message, f"Hi {name},\n\n{details}\n\nSubmission ID: {submission_id}\n\nPerfect Timing Gaming")
    return message


async def deliver(job: dict, mailer: OutlookGraphMailer) -> Outcome:
    try:
        message = build_message(job)
    except (ValueError, MessageError):
        return Outcome("failed")

    try:
        await mailer.send(message)
    except OutlookTokenUnavailable:
        return Outcome("retry")
    except GraphSendRejected as error:
        if error.status in {401, 429}:
            return Outcome("retry", error.retry_after)
        if 400 <= error.status < 500 and error.status != 408:
            return Outcome("failed")
        return Outcome("uncertain")
    except Exception:
        # A dropped or ambiguous response after the POST can still mean Graph accepted it.
        return Outcome("uncertain")
    return Outcome("accepted")


async def process_outbox(client: OutboxClient, journal: MailJournal, mailer: OutlookGraphMailer) -> None:
    async def report(job_id: str, lease: str, outcome: Outcome) -> None:
        current = await client.finish(job_id, lease, outcome)
        journal.mark_reported(job_id, lease)
        LOG.info("Forge notification %s: %s%s", job_id, outcome.status, "" if current else " (lease stale)")

    for job_id, lease, outcome in journal.recover():
        await report(job_id, lease, outcome)

    for _ in range(MAX_JOBS_PER_RUN):
        job = await client.claim()
        if job is None:
            return
        job_id, lease = job["id"], job["lease"]
        outcome = journal.begin(job_id, lease)
        if outcome is None:
            outcome = await deliver(job, mailer)
            journal.save(job_id, lease, outcome)
        await report(job_id, lease, outcome)
        if outcome.status == "retry":
            # Give provider throttling or mailbox reauthorization time before the next send.
            return


async def main(check: bool) -> None:
    config = Config.from_env()
    if not config.ms_client_id or not outlook_sender_matches(config.sender_email):
        raise OutboxError(f"Configure Microsoft authorization for {OUTLOOK_SENDER}")
    mailer = OutlookGraphMailer(config)
    async with ClientSession(timeout=ClientTimeout(total=20)) as session:
        client = OutboxClient(
            session,
            os.environ.get("CTF_FORGE_OUTBOX_URL", DEFAULT_OUTBOX_URL),
            os.environ.get("CTF_FORGE_MAIL_BRIDGE_TOKEN", ""),
        )
        if check:
            await asyncio.to_thread(mailer._load_token)
            LOG.info("Outlook authorization confirmed for %s", OUTLOOK_SENDER)
            return
        state_path = Path(os.environ.get("CTF_FORGE_MAIL_STATE", "/opt/ctf-card-email/state/forge-mail.sqlite3"))
        await process_outbox(client, MailJournal(state_path), mailer)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify mailbox authorization without claiming or sending mail")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    try:
        asyncio.run(main(parser.parse_args().check))
    except Exception as error:
        # Avoid dumping service tokens, recipient information or provider response bodies.
        LOG.error("%s", str(error) if isinstance(error, OutboxError) else f"Forge outbox unavailable ({type(error).__name__})")
        raise SystemExit(1) from None
