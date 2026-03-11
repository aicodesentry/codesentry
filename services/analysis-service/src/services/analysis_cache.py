import json
import os
from datetime import datetime

import redis

DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60


def _get_ttl_seconds() -> int:
    ttl_seconds = os.getenv("ANALYSIS_CACHE_TTL_SECONDS")
    if ttl_seconds:
        try:
            return int(ttl_seconds)
        except ValueError:
            pass

    ttl_days = os.getenv("ANALYSIS_CACHE_TTL_DAYS")
    if ttl_days:
        try:
            return int(ttl_days) * 24 * 60 * 60
        except ValueError:
            pass

    return DEFAULT_TTL_SECONDS


class AnalysisCache:
    def __init__(self) -> None:
        self.redis_client = None
        self.enabled = False
        self.ttl_seconds = _get_ttl_seconds()

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            self.redis_client.ping()
            self.enabled = True
            print("✅ Redis analysis cache connected")
        except Exception as e:
            print(f"⚠️  Redis analysis cache not available: {e}")

    def store_analysis(self, analysis_record: dict) -> bool:
        if not self.enabled:
            return False

        analysis_id = analysis_record.get("analysis_id")
        if not analysis_id:
            return False

        timestamp = analysis_record.get("timestamp")
        score = self._timestamp_score(timestamp)

        result_key = self._result_key(analysis_id)
        self.redis_client.setex(result_key, self.ttl_seconds, json.dumps(analysis_record))

        history_key = self._history_key()
        self.redis_client.zadd(history_key, {analysis_id: score})
        self.redis_client.expire(history_key, self.ttl_seconds)

        repository = analysis_record.get("repository")
        pr_number = analysis_record.get("pr_number")
        if repository and pr_number is not None:
            pr_key = self._pr_key(repository, pr_number)
            self.redis_client.zadd(pr_key, {analysis_id: score})
            self.redis_client.expire(pr_key, self.ttl_seconds)

        return True

    def get_history(self, limit: int = 10) -> list:
        if not self.enabled:
            return []

        history_key = self._history_key()
        analysis_ids = self.redis_client.zrevrange(history_key, 0, max(limit - 1, 0))
        return self._fetch_records(analysis_ids, history_key)

    def get_pr_analyses(self, repository: str, pr_number: int, limit: int = 100) -> list:
        if not self.enabled:
            return []

        pr_key = self._pr_key(repository, pr_number)
        analysis_ids = self.redis_client.zrevrange(pr_key, 0, max(limit - 1, 0))
        return self._fetch_records(analysis_ids, pr_key)

    def _fetch_records(self, analysis_ids: list, index_key: str) -> list:
        if not analysis_ids:
            return []

        result_keys = [self._result_key(analysis_id) for analysis_id in analysis_ids]
        raw_records = self.redis_client.mget(result_keys)

        records = []
        stale_ids = []
        for analysis_id, raw_record in zip(analysis_ids, raw_records):
            if not raw_record:
                stale_ids.append(analysis_id)
                continue
            try:
                records.append(json.loads(raw_record))
            except json.JSONDecodeError:
                stale_ids.append(analysis_id)

        if stale_ids:
            self.redis_client.zrem(index_key, *stale_ids)

        return records

    @staticmethod
    def _timestamp_score(timestamp_value) -> float:
        if isinstance(timestamp_value, datetime):
            return timestamp_value.timestamp()
        if isinstance(timestamp_value, (int, float)):
            return float(timestamp_value)
        if isinstance(timestamp_value, str):
            try:
                return datetime.fromisoformat(timestamp_value).timestamp()
            except ValueError:
                return datetime.utcnow().timestamp()
        return datetime.utcnow().timestamp()

    @staticmethod
    def _result_key(analysis_id: str) -> str:
        return f"analysis:result:{analysis_id}"

    @staticmethod
    def _history_key() -> str:
        return "analysis:history"

    @staticmethod
    def _pr_key(repository: str, pr_number: int) -> str:
        return f"analysis:pr:{repository}:{pr_number}"


analysis_cache = AnalysisCache()
