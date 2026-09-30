"""Inactive-account retention (runs with the daily clean-up).

Accounts not used for WARN_AFTER get one warning email. If they are still
unused DELETE_AFTER_WARNING later, the account (and its choices and follows)
is deleted. Any visit in between cancels the deletion.

    python -m pipeline.accounts --dry-run
Needs the Supabase database.
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from pipeline.common import DB, to_datetime

WARN_AFTER = timedelta(days=int(os.environ.get("INACTIVE_WARN_DAYS", "335")))       # ~11 months
DELETE_AFTER_WARNING = timedelta(days=int(os.environ.get("INACTIVE_GRACE_DAYS", "30")))
SITE_URL = os.environ.get("SITE_URL", "http://localhost:3000").rstrip("/")


@dataclass
class Account:
    user_id: str
    email: str | None
    last_active: datetime
    warned_at: datetime | None


def decide(a: Account, now: datetime) -> str:
    """'warn', 'delete' or 'keep'. Deletion only ever follows a warning with no activity since."""
    if a.warned_at and a.last_active > a.warned_at:
        return "reset"
    if a.warned_at is None:
        return "warn" if now - a.last_active >= WARN_AFTER else "keep"
    return "delete" if now - a.warned_at >= DELETE_AFTER_WARNING else "keep"


def run(db: DB, now: datetime | None = None, dry_run: bool = False) -> dict:
    now = now or datetime.now(timezone.utc)
    if db.kind != "postgres":
        return {"skipped": "needs the Supabase database"}
    rows = db.fetchall(
        """SELECT u.id::text, u.email,
                  GREATEST(COALESCE(p.last_seen_at, u.created_at), COALESCE(u.last_sign_in_at, u.created_at)),
                  p.inactivity_warned_at
           FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id""")
    counts = {"warn": 0, "delete": 0, "reset": 0, "keep": 0}
    for uid, email, last, warned in rows:
        a = Account(uid, email, to_datetime(last), to_datetime(warned))
        action = decide(a, now)
        counts[action] += 1
        if dry_run or action == "keep":
            continue
        if action == "reset":
            db.execute("UPDATE public.profiles SET inactivity_warned_at = NULL WHERE user_id = ?::uuid", (uid,))
        elif action == "warn":
            if email and os.environ.get("RESEND_API_KEY"):
                from pipeline.notify import send_email

                send_email(email, "Your All-Lens account will be deleted in 30 days",
                           f"<p>You have not used All-Lens for almost a year. Your account, choices and follows "
                           f"will be deleted in 30 days. To keep it, just <a href=\"{SITE_URL}/feed\">open the app</a>.</p>",
                           f"You have not used All-Lens for almost a year. Your account will be deleted in 30 days. "
                           f"To keep it, open {SITE_URL}/feed")
            db.execute(
                """INSERT INTO public.profiles (user_id, inactivity_warned_at) VALUES (?::uuid, ?)
                   ON CONFLICT (user_id) DO UPDATE SET inactivity_warned_at = excluded.inactivity_warned_at""",
                (uid, now))
        elif action == "delete":
            db.execute("DELETE FROM auth.users WHERE id = ?::uuid", (uid,))
        db.commit()
    return counts


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    db = DB()
    print(run(db, dry_run=args.dry_run))
    db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
