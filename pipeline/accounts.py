"""Inactive-account retention (runs with the nightly clean-up).

An account not used for DELETE_AFTER (12 months) is deleted with its choices and
follows. The app sends no email of any kind, so there is no warning message; the
Privacy page states the rule. Any visit or sign-in restarts the 12 months.

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

DELETE_AFTER = timedelta(days=int(os.environ.get("INACTIVE_DELETE_DAYS", "365")))


@dataclass
class Account:
    user_id: str
    last_active: datetime


def decide(a: Account, now: datetime) -> str:
    """'delete' after 12 months without a visit or sign-in, else 'keep'."""
    return "delete" if now - a.last_active >= DELETE_AFTER else "keep"


def run(db: DB, now: datetime | None = None, dry_run: bool = False) -> dict:
    now = now or datetime.now(timezone.utc)
    if db.kind != "postgres":
        return {"skipped": "needs the Supabase database"}
    rows = db.fetchall(
        """SELECT u.id::text,
                  GREATEST(COALESCE(p.last_seen_at, u.created_at), COALESCE(u.last_sign_in_at, u.created_at))
           FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id""")
    counts = {"delete": 0, "keep": 0}
    for uid, last in rows:
        action = decide(Account(uid, to_datetime(last)), now)
        counts[action] += 1
        if action == "delete" and not dry_run:
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
