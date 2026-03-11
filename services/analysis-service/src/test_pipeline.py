import unittest
from fastapi.testclient import TestClient

from main import app


class AnalysisPipelineTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_detects_hardcoded_secret(self):
        payload = {
            "repository_full_name": "acme/demo",
            "pull_request_number": 12,
            "commit_sha": "abc123",
            "files": [
                {
                    "path": "src/config.py",
                    "patch": "+API_KEY = \"supersecret123456\"",
                    "additions": 1,
                    "deletions": 0,
                    "status": "modified",
                }
            ],
        }

        response = self.client.post("/analyze/pr", json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertGreaterEqual(len(body["findings"]), 1)
        self.assertEqual(body["findings"][0]["category"], "hardcoded secrets")


if __name__ == "__main__":
    unittest.main()
