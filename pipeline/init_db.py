"""Create the tables once (safe to run again).

    python -m pipeline.init_db
"""
from pipeline.common import DB, load_sources, sync_sources

if __name__ == "__main__":
    db = DB()
    db.init_schema()
    sync_sources(db, load_sources())
    print(f"Schema ready on {db.kind}; {len(load_sources())} sources loaded")
    db.close()
