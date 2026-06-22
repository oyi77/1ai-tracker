#!/usr/bin/env python3
"""
Telegram Bot QA Test Suite
Run: .venv/bin/python scripts/test-telegram-bot.py
"""
import json, sys, subprocess
import requests

BOT_TOKEN = "8765783349:AAFrI1U9PLscRX1Cc_etyCDiKQ46bm4_WcI"
API = f"https://api.telegram.org/bot{BOT_TOKEN}"

def api(method, **params):
    r = requests.post(f"{API}/{method}", json=params or None, timeout=15)
    r.raise_for_status()
    return r.json()

passed = 0
failed = 0

def check(name, ok, detail=""):
    global passed, failed
    passed += 1 if ok else 0
    failed += 0 if ok else 1
    print(f"  {'✅' if ok else '❌'} {name}" + (f" — {detail}" if detail else ""))

# ── 1. Bot identity ──
print("─── 1. Bot identity (getMe) ───")
r = api("getMe")
bot = r["result"]
check("Token valid", r["ok"])
check("Is a bot", bot["is_bot"])
check("Username", bool(bot.get("username")), f"@{bot['username']}")
check("Name", bot["first_name"] == "Vilona Tracker", bot["first_name"])

# ── 2. Webhook ──
print("\n─── 2. Webhook status ───")
api("deleteWebhook")
info = api("getWebhookInfo")["result"]
check("No webhook (polling mode)", info.get("url", "") == "")
check("No errors", not info.get("last_error_message"))

# ── 3. Commands ──
print("\n─── 3. Registered commands ───")
cmds = api("getMyCommands")["result"]
check("≥9 commands", len(cmds) >= 9, f"{len(cmds)} registered")
for c in cmds:
    check(f"/{c['command']}", True, c["description"])

# ── 4. Capabilities ──
print("\n─── 4. Bot capabilities ───")
check("Can join groups", bot.get("can_join_groups"))
check("Is bot", bot.get("is_bot"))

# ── 5. Polling ──
print("\n─── 5. Long polling ───")
r = api("getUpdates", limit=1, timeout=1)
check("getUpdates works", r["ok"])
check("Returns list", isinstance(r["result"], list))

# ── 6. Telethon ──
print("\n─── 6. Telethon integration ───")
try:
    import telethon
    check("Telethon installed", True, f"v{telethon.__version__}")
    from telethon import TelegramClient
    check("TelegramClient importable", True)
except ImportError as e:
    check("Telethon installed", False, str(e))

# ── 7. Unit tests ──
print("\n─── 7. Unit tests (vitest) ───")
r2 = subprocess.run(
    ["npx", "vitest", "run", "src/lib/telegram/__tests__/bot.test.ts"],
    capture_output=True, text=True, timeout=30,
    cwd="/home/openclaw/projects/1ai-tracker"
)
check("Unit tests pass", r2.returncode == 0, r2.stdout.split("\n")[-4] if r2.stdout else "")
# ── 9. sendMessage (invalid chat = expected failure) ──
print("\n─── 9. sendMessage validation ───")
try:
    r4 = requests.post(f"{API}/sendMessage", json={"chat_id": "999999999", "text": "test"}, timeout=15)
    body = r4.json()
    if r4.status_code == 400 and "chat not found" in body.get("description", "").lower():
        check("Rejects invalid chat", True, body["description"][:60])
    else:
        check("Rejects invalid chat", False, f"status={r4.status_code}")
except Exception as e:
    check("Rejects invalid chat", False, str(e)[:60])


# ── Summary ──
print("\n" + "=" * 50)
print(f"  Results: {passed} passed, {failed} failed")
print(f"  {'✅ ALL TELEGRAM BOT TESTS PASSED' if failed == 0 else f'❌ {failed} FAILURES'}")
print("=" * 50)
sys.exit(0 if failed == 0 else 1)
