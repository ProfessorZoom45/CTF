#!/usr/bin/env python3
"""Secure CTF card-submission email service for the existing Oracle VM."""

import asyncio
import base64
from collections import defaultdict, deque
from dataclasses import dataclass
from email.message import EmailMessage
import json
import os
from pathlib import Path
import re
import smtplib
import sqlite3
import ssl
import time
from typing import Deque, Dict, Optional, Tuple

from aiohttp import ClientSession, ClientTimeout, web
import msal


MAX_JSON_BYTES = 14 * 1024 * 1024
MAX_REQUEST_BYTES = MAX_JSON_BYTES + 1024 * 1024
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{12,80}$")


@dataclass(frozen=True)
class Config:
    allowed_origin: str
    owner_email: str
    sender_email: str
    ms_client_id: str
    ms_authority: str
    token_cache_path: Path
    turnstile_secret: str
    expected_hostname: str
    database_path: Path
    logo_path: Path
    bind_host: str
    bind_port: int
    rate_limit_per_hour: int

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            allowed_origin=os.getenv("CTF_ALLOWED_ORIGIN", "https://professorzoom45.github.io").rstrip("/"),
            owner_email=os.getenv("CTF_OWNER_EMAIL", "changethewrld@outlook.com").strip(),
            sender_email=os.getenv("CTF_OUTLOOK_SENDER", "changethewrld@outlook.com").strip(),
            ms_client_id=os.getenv("CTF_MS_CLIENT_ID", "").strip(),
            ms_authority=os.getenv("CTF_MS_AUTHORITY", "https://login.microsoftonline.com/consumers").strip(),
            token_cache_path=Path(os.getenv("CTF_MS_TOKEN_CACHE", "/opt/ctf-card-email/secrets/msal-cache.json")),
            turnstile_secret=os.getenv("CTF_TURNSTILE_SECRET", "").strip(),
            expected_hostname=os.getenv("CTF_EXPECTED_HOSTNAME", "professorzoom45.github.io").strip(),
            database_path=Path(os.getenv("CTF_DATABASE_PATH", "/opt/ctf-card-email/state/submissions.sqlite3")),
            logo_path=Path(os.getenv("CTF_LOGO_PATH", "/opt/ctf-card-email/app/ctf-logo-v2.png")),
            bind_host=os.getenv("CTF_BIND_HOST", "127.0.0.1").strip(),
            bind_port=int(os.getenv("CTF_BIND_PORT", "8787")),
            rate_limit_per_hour=max(1, int(os.getenv("CTF_RATE_LIMIT_PER_HOUR", "5"))),
        )

    def validate(self) -> None:
        missing = []
        for name in ("allowed_origin", "owner_email", "sender_email", "ms_client_id", "turnstile_secret", "expected_hostname"):
            if not getattr(self, name):
                missing.append(name)
        if missing:
            raise RuntimeError("Missing configuration: " + ", ".join(missing))
        if not EMAIL_RE.match(self.owner_email) or not EMAIL_RE.match(self.sender_email):
            raise RuntimeError("Configured email address is invalid")
        if not self.logo_path.is_file():
            raise RuntimeError(f"CTF logo is missing: {self.logo_path}")


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int = 3600) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.events: Dict[str, Deque[float]] = defaultdict(deque)
        self.lock = asyncio.Lock()

    async def allow(self, key: str) -> bool:
        now = time.monotonic()
        async with self.lock:
            events = self.events[key]
            while events and now - events[0] >= self.window_seconds:
                events.popleft()
            if len(events) >= self.limit:
                return False
            events.append(now)
            return True


class SubmissionStore:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.lock = asyncio.Lock()
        path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(path) as db:
            db.execute(
                """CREATE TABLE IF NOT EXISTS deliveries (
                submission_id TEXT PRIMARY KEY,
                owner_sent INTEGER NOT NULL DEFAULT 0,
                submitter_sent INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )"""
            )

    async def status(self, submission_id: str) -> Tuple[bool, bool]:
        async with self.lock:
            with sqlite3.connect(self.path) as db:
                row = db.execute(
                    "SELECT owner_sent, submitter_sent FROM deliveries WHERE submission_id=?",
                    (submission_id,),
                ).fetchone()
        return (bool(row[0]), bool(row[1])) if row else (False, False)

    async def mark(self, submission_id: str, column: str) -> None:
        if column not in {"owner_sent", "submitter_sent"}:
            raise ValueError("Invalid delivery column")
        async with self.lock:
            with sqlite3.connect(self.path) as db:
                db.execute("INSERT OR IGNORE INTO deliveries(submission_id) VALUES (?)", (submission_id,))
                db.execute(
                    f"UPDATE deliveries SET {column}=1, updated_at=CURRENT_TIMESTAMP WHERE submission_id=?",
                    (submission_id,),
                )


class OutlookSmtpMailer:
    scopes = ["https://outlook.office.com/SMTP.Send"]

    def __init__(self, config: Config) -> None:
        self.config = config
        self.lock = asyncio.Lock()

    async def send(self, message: EmailMessage) -> None:
        async with self.lock:
            await asyncio.to_thread(self._send_sync, message)

    def _load_token(self) -> str:
        cache = msal.SerializableTokenCache()
        if self.config.token_cache_path.exists():
            cache.deserialize(self.config.token_cache_path.read_text(encoding="utf-8"))
        app = msal.PublicClientApplication(
            self.config.ms_client_id,
            authority=self.config.ms_authority,
            token_cache=cache,
        )
        accounts = app.get_accounts(username=self.config.sender_email) or app.get_accounts()
        result = app.acquire_token_silent(self.scopes, account=accounts[0] if accounts else None)
        if cache.has_state_changed:
            self.config.token_cache_path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.config.token_cache_path.with_suffix(".tmp")
            temporary.write_text(cache.serialize(), encoding="utf-8")
            os.chmod(temporary, 0o600)
            temporary.replace(self.config.token_cache_path)
        if not result or "access_token" not in result:
            raise RuntimeError("Outlook authorization is unavailable; run bootstrap_outlook.py")
        return result["access_token"]

    def _send_sync(self, message: EmailMessage) -> None:
        token = self._load_token()
        auth = f"user={self.config.sender_email}\x01auth=Bearer {token}\x01\x01"
        encoded_auth = base64.b64encode(auth.encode("utf-8")).decode("ascii")
        with smtplib.SMTP("smtp-mail.outlook.com", 587, timeout=45) as smtp:
            smtp.ehlo()
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
            code, response = smtp.docmd("AUTH", "XOAUTH2 " + encoded_auth)
            if code != 235:
                raise RuntimeError(f"Outlook authentication failed ({code})")
            smtp.send_message(message)


class TurnstileVerifier:
    def __init__(self, config: Config, session: ClientSession) -> None:
        self.config = config
        self.session = session

    async def verify(self, token: str, remote_ip: str) -> bool:
        try:
            async with self.session.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                json={"secret": self.config.turnstile_secret, "response": token, "remoteip": remote_ip},
            ) as response:
                result = await response.json()
        except Exception:
            return False
        return bool(
            result.get("success")
            and result.get("action") == "card_submission"
            and result.get("hostname") == self.config.expected_hostname
        )


def safe_header(value: object, fallback: str = "Creator", limit: int = 80) -> str:
    cleaned = re.sub(r"[\r\n]+", " ", str(value or "")).strip()[:limit]
    return cleaned or fallback


def clean_file_name(value: object) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "_", str(value or ""))[:120]
    return cleaned if cleaned.lower().endswith(".json") else ""


def build_owner_message(config: Config, submission: dict, file_name: str, json_bytes: bytes) -> EmailMessage:
    submitter = submission["submitter"]
    name = safe_header(submitter["name"])
    message = EmailMessage()
    message["From"] = config.sender_email
    message["To"] = config.owner_email
    message["Reply-To"] = submitter["email"]
    message["Subject"] = f"{name}'s Custom Cards"
    message.set_content(
        "\n".join(
            [
                "A new Carry The Flame! custom-card set was submitted.",
                "",
                f"Submission ID: {submission['submission_id']}",
                f"Submitter: {name}",
                f"Submitter email: {submitter['email']}",
                f"Submitted: {submission['timestamp']}",
                f"Cards: {len(submission['cards'])}",
                "",
                f"The complete submission is attached as {file_name}.",
            ]
        )
    )
    message.add_attachment(json_bytes, maintype="application", subtype="json", filename=file_name)
    return message


def build_submitter_message(config: Config, submission: dict) -> EmailMessage:
    submitter = submission["submitter"]
    name = safe_header(submitter["name"])
    message = EmailMessage()
    message["From"] = config.sender_email
    message["To"] = submitter["email"]
    message["Reply-To"] = config.owner_email
    message["Subject"] = f"Thank You, {name} — Your Carry The Flame! Cards Are Under Review"
    message.set_content(
        f"""Hi {name},

Thank you from the bottom of our hearts for sharing your creativity with Carry The Flame! Every card you create adds another spark to the world we're building, and we truly appreciate the time, imagination, and care you put into your submission.

Your custom cards have been received and are now being thoughtfully reviewed for possible inclusion in the Carry The Flame! game. Our review will consider gameplay balance, clarity, originality, lore, and how each card fits the overall experience.

Thank you for helping us carry the flame forward. We're grateful to have you as part of this journey.

Keep carrying the flame,
Perfect Timing Gaming
"""
    )
    message.add_attachment(
        config.logo_path.read_bytes(),
        maintype="image",
        subtype="png",
        filename="Carry-The-Flame-Logo.png",
    )
    return message


def validate_submission(body: dict) -> Tuple[Optional[dict], str, bytes, Optional[str]]:
    submission_id = body.get("submission_id")
    file_name = clean_file_name(body.get("file_name"))
    json_text = body.get("json")
    if not isinstance(submission_id, str) or not ID_RE.match(submission_id):
        return None, "", b"", "invalid_submission_id"
    if not file_name or not isinstance(json_text, str):
        return None, "", b"", "missing_fields"
    json_bytes = json_text.encode("utf-8")
    if len(json_bytes) > MAX_JSON_BYTES:
        return None, "", b"", "attachment_too_large"
    try:
        submission = json.loads(json_text)
    except json.JSONDecodeError:
        return None, "", b"", "invalid_attachment_json"
    submitter = submission.get("submitter") if isinstance(submission, dict) else None
    valid = bool(
        isinstance(submitter, dict)
        and isinstance(submitter.get("name"), str)
        and submitter["name"].strip()
        and isinstance(submitter.get("email"), str)
        and EMAIL_RE.match(submitter["email"])
        and submission.get("submission_id") == submission_id
        and isinstance(submission.get("cards"), list)
        and len(submission["cards"]) == 5
        and isinstance(submission.get("timestamp"), str)
    )
    return (submission, file_name, json_bytes, None) if valid else (None, "", b"", "invalid_submission")


def cors_headers(config: Config, origin: str) -> dict:
    if origin != config.allowed_origin:
        return {}
    return {
        "Access-Control-Allow-Origin": config.allowed_origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
        "Cache-Control": "no-store",
    }


def client_ip(request: web.Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",", 1)[0].strip()
    return forwarded or request.remote or "unknown"


async def create_app(
    config: Config,
    mailer: Optional[OutlookSmtpMailer] = None,
    verifier: Optional[TurnstileVerifier] = None,
) -> web.Application:
    config.validate()
    app = web.Application(client_max_size=MAX_REQUEST_BYTES)
    session = ClientSession(timeout=ClientTimeout(total=45))
    app["config"] = config
    app["session"] = session
    app["mailer"] = mailer or OutlookSmtpMailer(config)
    app["verifier"] = verifier or TurnstileVerifier(config, session)
    app["store"] = SubmissionStore(config.database_path)
    app["limiter"] = RateLimiter(config.rate_limit_per_hour)
    app["delivery_locks"] = defaultdict(asyncio.Lock)

    async def close_session(application: web.Application) -> None:
        await application["session"].close()

    app.on_cleanup.append(close_session)
    app.router.add_get("/health", health)
    app.router.add_route("OPTIONS", "/submit-card", submit_card)
    app.router.add_post("/submit-card", submit_card)
    return app


async def health(request: web.Request) -> web.Response:
    return web.json_response({"ok": True, "service": "ctf-card-email"}, headers={"Cache-Control": "no-store"})


async def submit_card(request: web.Request) -> web.Response:
    config: Config = request.app["config"]
    origin = request.headers.get("Origin", "")
    headers = cors_headers(config, origin)
    if not headers:
        return web.json_response({"ok": False, "error": "origin_not_allowed"}, status=403)
    if request.method == "OPTIONS":
        return web.Response(status=204, headers=headers)
    ip = client_ip(request)
    if not await request.app["limiter"].allow(ip):
        return web.json_response({"ok": False, "error": "rate_limited"}, status=429, headers=headers)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"ok": False, "error": "invalid_json"}, status=400, headers=headers)
    if not isinstance(body, dict):
        return web.json_response({"ok": False, "error": "invalid_request"}, status=400, headers=headers)
    token = body.get("turnstile_token")
    if not isinstance(token, str) or not await request.app["verifier"].verify(token, ip):
        return web.json_response({"ok": False, "error": "verification_failed"}, status=403, headers=headers)
    submission, file_name, json_bytes, error = validate_submission(body)
    if error:
        status = 413 if error == "attachment_too_large" else 400
        return web.json_response({"ok": False, "error": error}, status=status, headers=headers)

    submission_id = submission["submission_id"]
    async with request.app["delivery_locks"][submission_id]:
        owner_sent, submitter_sent = await request.app["store"].status(submission_id)
        try:
            if not owner_sent:
                await request.app["mailer"].send(build_owner_message(config, submission, file_name, json_bytes))
                await request.app["store"].mark(submission_id, "owner_sent")
                owner_sent = True
            if not submitter_sent:
                await request.app["mailer"].send(build_submitter_message(config, submission))
                await request.app["store"].mark(submission_id, "submitter_sent")
                submitter_sent = True
        except Exception:
            return web.json_response(
                {
                    "ok": False,
                    "error": "email_delivery_failed",
                    "owner_email_sent": owner_sent,
                    "submitter_email_sent": submitter_sent,
                },
                status=502,
                headers=headers,
            )
    return web.json_response(
        {
            "ok": True,
            "owner_email_sent": owner_sent,
            "submitter_email_sent": submitter_sent,
        },
        headers=headers,
    )


async def main() -> None:
    config = Config.from_env()
    application = await create_app(config)
    runner = web.AppRunner(application, access_log_format='%a %t "%r" %s %b')
    await runner.setup()
    site = web.TCPSite(runner, config.bind_host, config.bind_port)
    await site.start()
    print(f"CTF card email service listening on {config.bind_host}:{config.bind_port}", flush=True)
    try:
        await asyncio.Event().wait()
    finally:
        await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
