"""Daily email and inactive-account rules (pure logic; no email is sent)."""
import unittest
from datetime import date, datetime, time, timedelta, timezone

from pipeline.accounts import Account, decide
from pipeline.notify import Reader, build_digest, is_due, render

NOW = datetime(2026, 9, 30, 14, 5, tzinfo=timezone.utc)      # 19:35 in India


def reader(**kw):
    base = dict(user_id="u1", email="a@example.com", topics=[], places=["tg-hyderabad"], state="tg",
                languages=["en", "te"], hide_crime=False, ui="en", catchup=time(19, 30), tz="Asia/Kolkata",
                notify_followed=True, last_visit=None, last_digest_on=None)
    base.update(kw)
    return Reader(**base)


def story(sid, places, topics, n=2, labels=None, langs=("en",), scope=None):
    return {"id": sid, "label": f"Headline {sid}", "label_language": langs[0], "label_source_id": "src",
            "labels": labels or {langs[0]: {"title": f"Headline {sid}", "source_name": "Source A"}},
            "source_count": n, "last_article_at": NOW.isoformat(), "places": places, "topics": topics,
            "languages": list(langs), "scope": scope}


PLACES = {"tg": {"en": "Telangana", "te": "తెలంగాణ"}, "tg-hyderabad": {"en": "Hyderabad", "te": "హైదరాబాద్"}}


class NotifyTests(unittest.TestCase):
    def test_due_once_a_day_at_or_after_chosen_time(self):
        self.assertTrue(is_due(reader(), NOW))
        self.assertFalse(is_due(reader(catchup=time(20, 0)), NOW))
        self.assertFalse(is_due(reader(last_digest_on=date(2026, 9, 30)), NOW))
        self.assertTrue(is_due(reader(last_digest_on=date(2026, 9, 29)), NOW))

    def test_sections_follow_reader_places_and_filters(self):
        stories = [story("hyd", ["tg", "tg-hyderabad"], ["politics"]),
                   story("state", ["tg"], ["crime"]),
                   story("india", [], ["sports"], n=5),
                   story("teluguonly", ["tg"], [], langs=("te",)),
                   story("world", [], [], scope="international")]
        d = build_digest(reader(languages=["en"]), stories, [], PLACES)
        heads = {h: [i.story_id for i in items] for h, items in d.sections}
        self.assertEqual(heads["Hyderabad"], ["hyd"])
        self.assertEqual(heads["Telangana"], ["state"])
        self.assertEqual(heads["National"], ["india"])
        self.assertEqual(heads["International"], ["world"])
        self.assertEqual(list(heads)[-1], "International")
        d2 = build_digest(reader(hide_crime=True, topics=["sports"]), stories, [], PLACES)
        ids = [i.story_id for _, items in d2.sections for i in items]
        self.assertEqual(ids, ["india"])

    def test_headlines_are_source_words_and_followed_updates_come_first(self):
        labels = {"en": {"title": "Exact English words", "source_name": "ThePrint"},
                  "te": {"title": "తెలుగు శీర్షిక", "source_name": "NTV Telugu"}}
        followed = [dict(story("f1", ["jk"], [], labels=labels), new=3)]
        d = build_digest(reader(languages=["te", "en"], ui="te"), [], followed, PLACES)
        self.assertEqual(d.sections[0][1][0].title, "తెలుగు శీర్షిక")
        html_body, text = render(d, "te")
        self.assertIn("తెలుగు శీర్షిక", html_body)
        self.assertIn("NTV Telugu", text)
        self.assertNotIn("breaking", html_body.lower())

    def test_nothing_new_means_no_email(self):
        self.assertTrue(build_digest(reader(), [], [dict(story("f", [], []), new=0)], PLACES).empty)


class AccountTests(unittest.TestCase):
    def test_warn_then_delete_only_if_still_inactive(self):
        old = NOW - timedelta(days=400)
        self.assertEqual(decide(Account("u", "e", NOW - timedelta(days=10), None), NOW), "keep")
        self.assertEqual(decide(Account("u", "e", old, None), NOW), "warn")
        self.assertEqual(decide(Account("u", "e", old, NOW - timedelta(days=5)), NOW), "keep")
        self.assertEqual(decide(Account("u", "e", old, NOW - timedelta(days=31)), NOW), "delete")
        self.assertEqual(decide(Account("u", "e", NOW - timedelta(days=1), NOW - timedelta(days=31)), NOW), "reset")


if __name__ == "__main__":
    unittest.main()
