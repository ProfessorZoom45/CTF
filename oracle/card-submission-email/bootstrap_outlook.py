#!/usr/bin/env python3
"""One-time Microsoft device authorization for the Outlook sender mailbox."""

import os
from pathlib import Path

import msal


client_id = os.environ["CTF_MS_CLIENT_ID"].strip()
authority = os.getenv("CTF_MS_AUTHORITY", "https://login.microsoftonline.com/consumers").strip()
sender = os.environ["CTF_OUTLOOK_SENDER"].strip()
cache_path = Path(os.getenv("CTF_MS_TOKEN_CACHE", "/opt/ctf-card-email/secrets/msal-cache.json"))
scopes = ["https://graph.microsoft.com/Mail.Send"]

cache = msal.SerializableTokenCache()
if cache_path.exists():
    cache.deserialize(cache_path.read_text(encoding="utf-8"))
app = msal.PublicClientApplication(client_id, authority=authority, token_cache=cache)
flow = app.initiate_device_flow(scopes=scopes)
if "user_code" not in flow:
    raise RuntimeError("Microsoft device authorization could not start")
print(flow["message"], flush=True)
result = app.acquire_token_by_device_flow(flow)
if "access_token" not in result:
    raise RuntimeError(result.get("error_description", "Microsoft authorization failed"))
accounts = app.get_accounts(username=sender) or app.get_accounts()
if not accounts:
    raise RuntimeError("No Outlook account was stored in the token cache")
cache_path.parent.mkdir(parents=True, exist_ok=True)
cache_path.write_text(cache.serialize(), encoding="utf-8")
os.chmod(cache_path, 0o600)
print(f"Outlook authorization stored for {accounts[0].get('username', sender)}.")
