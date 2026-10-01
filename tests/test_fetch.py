"""Feeds that refuse GitHub's servers are asked for once more through the owner's Apps Script."""
import base64
import os
import unittest
from unittest import mock

import requests

from pipeline import common

FEED = b"<rss><channel><item><title>x</title></item></channel></rss>"
SCRIPT = {"TRANSLATE_URL": "https://script.test/exec", "TRANSLATE_TOKEN": "secret"}


def answer(status=200, content=b"", payload=None):
    r = mock.Mock(status_code=status, content=content)
    r.json.return_value = payload
    r.raise_for_status.return_value = None
    return r


class FetchTest(unittest.TestCase):
    def test_refused_feed_comes_through_apps_script(self):
        relayed = answer(payload={"status": 200, "body": base64.b64encode(FEED).decode()})
        with mock.patch.dict(os.environ, SCRIPT), \
                mock.patch("requests.get", return_value=answer(403)), \
                mock.patch("requests.post", return_value=relayed) as post:
            self.assertEqual(common.fetch("https://www.heraldgoa.in/rss"), (200, FEED))
        self.assertEqual(post.call_args.kwargs["json"], {"token": "secret", "feed": "https://www.heraldgoa.in/rss"})

    def test_no_answer_also_tries_apps_script(self):
        relayed = answer(payload={"status": 200, "body": base64.b64encode(FEED).decode()})
        with mock.patch.dict(os.environ, SCRIPT), \
                mock.patch("requests.get", side_effect=requests.Timeout()), \
                mock.patch("requests.post", return_value=relayed):
            self.assertEqual(common.fetch("https://voiceofsikkim.com/feed/"), (200, FEED))

    def test_direct_answer_is_used_as_is(self):
        with mock.patch.dict(os.environ, SCRIPT), \
                mock.patch("requests.get", return_value=answer(200, FEED)), \
                mock.patch("requests.post") as post:
            self.assertEqual(common.fetch("https://example.test/feed"), (200, FEED))
            post.assert_not_called()

    def test_never_reddit_and_not_without_the_script(self):
        with mock.patch.dict(os.environ, SCRIPT), \
                mock.patch("requests.get", return_value=answer(403)), mock.patch("requests.post") as post:
            self.assertEqual(common.fetch("https://www.reddit.com/r/india/.rss")[0], 403)
            post.assert_not_called()
        env = {k: v for k, v in os.environ.items() if k not in SCRIPT}
        with mock.patch.dict(os.environ, env, clear=True), \
                mock.patch("requests.get", return_value=answer(403)), mock.patch("requests.post") as post:
            self.assertEqual(common.fetch("https://www.heraldgoa.in/rss")[0], 403)
            post.assert_not_called()

    def test_old_script_says_so(self):
        with mock.patch.dict(os.environ, SCRIPT), \
                mock.patch("requests.get", return_value=answer(403)), \
                mock.patch("requests.post", return_value=answer(payload={"error": "bad request"})):
            with self.assertRaisesRegex(RuntimeError, "via Apps Script: bad request"):
                common.fetch("https://www.heraldgoa.in/rss")


if __name__ == "__main__":
    unittest.main()
