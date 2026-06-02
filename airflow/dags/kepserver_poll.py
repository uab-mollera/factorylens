"""
kepserver_poll.py — Example Airflow DAG for polling KepServer REST API
and writing OEE status records to the FactoryLens PostgreSQL database.

KepServer exposes a REST Connectivity Server API (port 57412 by default).
Docs: https://www.ptc.com/en/support/article/CS366277

Required Airflow Variables (set via UI or CLI):
  - KEP_HOST       : KepServer hostname / IP address
  - KEP_PORT       : REST port (default: 57412)
  - KEP_USERNAME   : KepServer auth username
  - KEP_PASSWORD   : KepServer auth password (store as Secret)
  - MACHINE_TAG_MAP: JSON mapping of machine UUID → KepServer tag prefixes
                     e.g. {"<machine-uuid>": "Channel1.Device1.OEE"}
  - DB_CONN_STR    : SQLAlchemy-compatible connection string for FactoryLens DB
                     e.g. "postgresql+psycopg2://user:pass@db:5432/factorylens"

Tag conventions expected under each machine prefix:
  <prefix>.Availability  (float 0-100)
  <prefix>.Performance   (float 0-100)
  <prefix>.Quality       (float 0-100)
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import requests
from airflow.decorators import dag, task
from airflow.models import Variable

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# OEE thresholds (mirrors backend logic in crud.py)
# ---------------------------------------------------------------------------
OEE_GREEN_THRESHOLD = 85.0
OEE_YELLOW_THRESHOLD = 60.0


def _oee_status(value: float) -> str:
    if value >= OEE_GREEN_THRESHOLD:
        return "green"
    if value >= OEE_YELLOW_THRESHOLD:
        return "yellow"
    return "red"


# ---------------------------------------------------------------------------
# DAG definition
# ---------------------------------------------------------------------------


@dag(
    dag_id="kepserver_poll",
    description="Poll KepServer REST API and write OEE status to FactoryLens DB",
    schedule="* * * * *",  # every minute
    start_date=datetime(2024, 1, 1, tzinfo=timezone.utc),
    catchup=False,
    max_active_runs=1,
    tags=["factorylens", "kepserver", "oee"],
)
def kepserver_poll() -> None:

    @task()
    def fetch_oee_tags() -> list[dict[str, Any]]:
        """Read OEE tag values from KepServer for all configured machines."""
        kep_host = Variable.get("KEP_HOST", default_var="kepserver")
        kep_port = Variable.get("KEP_PORT", default_var="57412")
        kep_user = Variable.get("KEP_USERNAME", default_var="")
        kep_pass = Variable.get("KEP_PASSWORD", default_var="")
        machine_tag_map: dict[str, str] = json.loads(
            Variable.get("MACHINE_TAG_MAP", default_var="{}")
        )

        if not machine_tag_map:
            log.warning("MACHINE_TAG_MAP is empty — no machines configured")
            return []

        base_url = f"http://{kep_host}:{kep_port}/iotgateway/read"
        auth = (kep_user, kep_pass) if kep_user else None

        results: list[dict[str, Any]] = []

        for machine_id, prefix in machine_tag_map.items():
            tags = [
                f"{prefix}.Availability",
                f"{prefix}.Performance",
                f"{prefix}.Quality",
            ]
            # KepServer IoT Gateway bulk-read endpoint
            payload = {"ids": tags}
            try:
                response = requests.post(
                    base_url,
                    json=payload,
                    auth=auth,
                    timeout=10,
                )
                response.raise_for_status()
                data = response.json()

                # Parse response — each item has 'id', 'v' (value), 's' (status), 't' (timestamp)
                tag_values: dict[str, Any] = {}
                for item in data.get("readResults", []):
                    short_name = item["id"].split(".")[-1]  # e.g. "Availability"
                    tag_values[short_name] = float(item.get("v", 0.0))

                availability = tag_values.get("Availability", 0.0)
                performance = tag_values.get("Performance", 0.0)
                quality = tag_values.get("Quality", 0.0)

                results.append(
                    {
                        "machine_id": machine_id,
                        "availability": availability,
                        "performance": performance,
                        "quality": quality,
                        "raw_data": data,
                    }
                )
                log.info(
                    "Machine %s — A=%.1f P=%.1f Q=%.1f",
                    machine_id,
                    availability,
                    performance,
                    quality,
                )
            except requests.RequestException as exc:
                log.error("Failed to fetch tags for machine %s: %s", machine_id, exc)
                # Write a stub "unknown" record so the timeline shows a gap
                results.append(
                    {
                        "machine_id": machine_id,
                        "availability": 0.0,
                        "performance": 0.0,
                        "quality": 0.0,
                        "raw_data": {"error": str(exc)},
                    }
                )

        return results

    @task()
    def write_to_db(records: list[dict[str, Any]]) -> None:
        """Insert MachineStatus rows into the FactoryLens database."""
        import psycopg2  # type: ignore

        db_conn_str = Variable.get(
            "DB_CONN_STR",
            default_var="postgresql://postgres:changethis@db:5432/factorylens",
        )

        # Convert SQLAlchemy URL to psycopg2 DSN format (strip scheme prefix)
        dsn = db_conn_str.replace("postgresql+psycopg2://", "postgresql://").replace(
            "postgresql+psycopg://", "postgresql://"
        )

        now = datetime.now(timezone.utc)

        with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
            for rec in records:
                avg_status = _oee_status(
                    (rec["availability"] + rec["performance"] + rec["quality"]) / 3.0
                )
                cur.execute(
                    """
                    INSERT INTO machinestatus
                        (id, machine_id, timestamp, status,
                         availability, performance, quality, raw_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        str(uuid.uuid4()),
                        rec["machine_id"],
                        now,
                        avg_status,
                        rec["availability"],
                        rec["performance"],
                        rec["quality"],
                        json.dumps(rec["raw_data"]),
                    ),
                )
            conn.commit()
        log.info("Wrote %d MachineStatus records", len(records))

    oee_data = fetch_oee_tags()
    write_to_db(oee_data)


kepserver_poll()
