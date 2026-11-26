#!/usr/bin/env python3
"""One-time Microsoft device authorization for the Outlook sender mailbox."""

import os
from pathlib import Path

import msal

from app import OUTLOOK_SENDER, OutlookGraphMailer, outlook_result_username, outlook_sender_matches, save_outlook_cache


def main() -> None:
    client_id = os.environ["CTF_MS_CLIENT_ID"].strip()
    authority = os.getenv("CTF_MS_AUTHORITY", "https://login.microsoftonline.com/consumers").strip()
    sender = os.getenv("CTF_OUTLOOK_SENDER", OUTLOOK_SENDER).strip()
    cache_path = Path(os.getenv("CTF_MS_TOKEN_CACHE", "/opt/ctf-card-email/secrets/msal-cache.json"))
    if not outlook_sender_matches(sender):
        raise RuntimeError(f"CTF_OUTLOOK_SENDER must be {OUTLOOK_SENDER}")

    cache = msal.SerializableTokenCache()
    if cache_path.exists():
        cache.deserialize(cache_path.read_text(encoding="utf-8"))
    app = msal.PublicClientApplication(client_id, authority=authority, token_cache=cache)
    flow = app.initiate_device_flow(scopes=OutlookGraphMailer.scopes)
    if "user_code" not in flow:
        raise RuntimeError("Microsoft device authorization could not start")
    print(f"Sign in as {OUTLOOK_SENDER}.\n{flow['message']}", flush=True)
    result = app.acquire_token_by_device_flow(flow)
    if not result.get("access_token"):
        raise RuntimeError("Microsoft authorization failed")
    if not outlook_sender_matches(outlook_result_username(result)):
        raise RuntimeError(f"Microsoft did not confirm sign-in as {OUTLOOK_SENDER}. Authorization was not saved")

    accounts = app.get_accounts(username=OUTLOOK_SENDER)
    if not any(outlook_sender_matches(account.get("username")) for account in accounts):
        raise RuntimeError(f"The token cache does not contain {OUTLOOK_SENDER}")
    save_outlook_cache(cache, cache_path)
    print(f"Outlook authorization stored for {OUTLOOK_SENDER}.")


if __name__ == "__main__":
    main()
