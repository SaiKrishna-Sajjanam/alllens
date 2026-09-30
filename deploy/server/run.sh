#!/usr/bin/env bash
# Run one pipeline job with the latest pushed code:
#     bash ~/alllens/deploy/server/run.sh collect [--retag | --regroup]
#     bash ~/alllens/deploy/server/run.sh notify [--dry-run]
#     bash ~/alllens/deploy/server/run.sh cleanup
#     bash ~/alllens/deploy/server/run.sh check_feeds
set -euo pipefail
JOB="${1:?usage: run.sh collect|notify|cleanup|check_feeds [options]}"
shift
APP="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ALLLENS_ENV:-$HOME/alllens.env}"
cd "$APP"

# One copy of each job at a time (a long collect never overlaps the next one).
exec 9>"/tmp/alllens-$JOB.lock"
flock -n 9 || { echo "$JOB is already running; this run is skipped"; exit 0; }

# The code you pushed to GitHub. If GitHub can't be reached, run the code already here.
git pull --ff-only --quiet || echo "git pull failed; running the code already on the server"

# Re-install Python packages only when the requirement files changed.
STAMP=.venv/.requirements.sha
NEW=$(cat requirements.txt requirements-ml.txt | sha256sum | cut -d' ' -f1)
if [ "$(cat "$STAMP" 2>/dev/null)" != "$NEW" ]; then
  .venv/bin/pip install --quiet -r requirements.txt -r requirements-ml.txt && echo "$NEW" > "$STAMP"
fi

set -a
. "$ENV_FILE"
set +a
export EMBEDDER="${EMBEDDER:-multilingual}"
exec .venv/bin/python -m "pipeline.$JOB" "$@"
