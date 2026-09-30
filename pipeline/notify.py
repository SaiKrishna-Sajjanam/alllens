"""Daily catch-up email, sent once a day at each reader's chosen time (runs hourly).

    python -m pipeline.notify            # sends (needs RESEND_API_KEY, EMAIL_FROM, SITE_URL)
    python -m pipeline.notify --dry-run  # prints what would be sent

The email lists story headlines exactly as sources wrote them (the earliest
one, credited), how many sources covered each, and links to the story pages.
No summaries, no "breaking" wording, one email a day at most.
Needs the Supabase database (reads profiles and sign-in emails).
"""
from __future__ import annotations

import argparse
import html
import os
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from pipeline.common import DB, as_dict, as_list, to_datetime

SITE_URL = os.environ.get("SITE_URL", "http://localhost:3000").rstrip("/")
PER_SECTION = 5
HIDDEN_BY_HIDE_CRIME = {"crime", "accidents"}   # the reader's "hide crime and accidents" choice

TEXT = {
    "en": {
        "subject": "Your catch-up: {n} stories since your last visit",
        "subject_none": "Your catch-up: stories you follow",
        "intro": "Every version, at your time. Headlines are shown exactly as each source wrote them.",
        "national": "National", "international": "International", "following": "Stories you follow",
        "sources": "{n} sources", "source1": "1 source", "first": "first reported by {s}",
        "new_reports": "{n} new reports",
        "open": "Open your feed", "settings": "Change or stop these emails",
    },
    "te": {
        "subject": "మీ అప్‌డేట్: మీరు చివరిసారి చూసిన తర్వాత {n} వార్తలు",
        "subject_none": "మీ అప్‌డేట్: మీరు ఫాలో అవుతున్న వార్తలు",
        "intro": "ప్రతి వెర్షన్, మీకు వీలైన సమయంలో. శీర్షికలు ప్రతి వనరు రాసినట్లుగానే.",
        "national": "జాతీయం", "international": "అంతర్జాతీయం", "following": "మీరు ఫాలో అవుతున్న వార్తలు",
        "sources": "{n} వనరులు", "source1": "1 వనరు", "first": "మొదట ప్రచురించింది: {s}",
        "new_reports": "{n} కొత్త కథనాలు",
        "open": "మీ ఫీడ్ తెరవండి", "settings": "ఈ ఈమెయిల్స్ మార్చండి లేదా ఆపండి",
    },
    # Drafts, like the web app's interface text: native-speaker review before launch.
    "hi": {
        "subject": "आपका अपडेट: पिछली विज़िट के बाद {n} ख़बरें", "subject_none": "आपका अपडेट: आपकी फ़ॉलो की गई ख़बरें",
        "intro": "हर रूप, आपके समय पर। शीर्षक वैसे ही हैं जैसे हर स्रोत ने लिखे।",
        "national": "राष्ट्रीय", "international": "अंतरराष्ट्रीय", "following": "आप जिन ख़बरों को फ़ॉलो करते हैं",
        "sources": "{n} स्रोत", "source1": "1 स्रोत", "first": "सबसे पहले प्रकाशित: {s}", "new_reports": "{n} नई रिपोर्ट",
        "open": "अपनी फ़ीड खोलें", "settings": "ये ईमेल बदलें या बंद करें",
    },
    "ta": {
        "subject": "உங்கள் சுருக்கம்: கடைசி வருகைக்குப் பின் {n} செய்திகள்", "subject_none": "உங்கள் சுருக்கம்: நீங்கள் பின்தொடரும் செய்திகள்",
        "intro": "ஒவ்வொரு வடிவமும், உங்கள் நேரத்தில். தலைப்புகள் ஒவ்வொரு ஆதாரமும் எழுதியபடியே.",
        "national": "தேசியம்", "international": "சர்வதேசம்", "following": "நீங்கள் பின்தொடரும் செய்திகள்",
        "sources": "{n} ஆதாரங்கள்", "source1": "1 ஆதாரம்", "first": "முதலில் வெளியிட்டது: {s}", "new_reports": "{n} புதிய செய்திகள்",
        "open": "உங்கள் ஃபீடைத் திறக்கவும்", "settings": "இந்த மின்னஞ்சல்களை மாற்று அல்லது நிறுத்து",
    },
    "kn": {
        "subject": "ನಿಮ್ಮ ಅಪ್‌ಡೇಟ್: ಕೊನೆಯ ಭೇಟಿಯ ನಂತರ {n} ಸುದ್ದಿಗಳು", "subject_none": "ನಿಮ್ಮ ಅಪ್‌ಡೇಟ್: ನೀವು ಫಾಲೋ ಮಾಡುವ ಸುದ್ದಿಗಳು",
        "intro": "ಪ್ರತಿ ರೂಪ, ನಿಮ್ಮ ಸಮಯದಲ್ಲಿ. ಶೀರ್ಷಿಕೆಗಳು ಪ್ರತಿ ಮೂಲ ಬರೆದಂತೆಯೇ.",
        "national": "ರಾಷ್ಟ್ರೀಯ", "international": "ಅಂತರರಾಷ್ಟ್ರೀಯ", "following": "ನೀವು ಫಾಲೋ ಮಾಡುವ ಸುದ್ದಿಗಳು",
        "sources": "{n} ಮೂಲಗಳು", "source1": "1 ಮೂಲ", "first": "ಮೊದಲು ಪ್ರಕಟಿಸಿದ್ದು: {s}", "new_reports": "{n} ಹೊಸ ವರದಿಗಳು",
        "open": "ನಿಮ್ಮ ಫೀಡ್ ತೆರೆಯಿರಿ", "settings": "ಈ ಇಮೇಲ್‌ಗಳನ್ನು ಬದಲಿಸಿ ಅಥವಾ ನಿಲ್ಲಿಸಿ",
    },
    "ml": {
        "subject": "നിങ്ങളുടെ അപ്‌ഡേറ്റ്: അവസാന സന്ദർശനത്തിന് ശേഷം {n} വാർത്തകൾ", "subject_none": "നിങ്ങളുടെ അപ്‌ഡേറ്റ്: നിങ്ങൾ പിന്തുടരുന്ന വാർത്തകൾ",
        "intro": "ഓരോ പതിപ്പും, നിങ്ങളുടെ സമയത്ത്. തലക്കെട്ടുകൾ ഓരോ ഉറവിടവും എഴുതിയതുപോലെ.",
        "national": "ദേശീയം", "international": "അന്താരാഷ്ട്രം", "following": "നിങ്ങൾ പിന്തുടരുന്ന വാർത്തകൾ",
        "sources": "{n} ഉറവിടങ്ങൾ", "source1": "1 ഉറവിടം", "first": "ആദ്യം പ്രസിദ്ധീകരിച്ചത്: {s}", "new_reports": "{n} പുതിയ റിപ്പോർട്ടുകൾ",
        "open": "നിങ്ങളുടെ ഫീഡ് തുറക്കുക", "settings": "ഈ ഇമെയിലുകൾ മാറ്റുക അല്ലെങ്കിൽ നിർത്തുക",
    },
    "mr": {
        "subject": "तुमचे अपडेट: मागील भेटीनंतर {n} बातम्या", "subject_none": "तुमचे अपडेट: तुम्ही फॉलो करत असलेल्या बातम्या",
        "intro": "प्रत्येक रूप, तुमच्या वेळेनुसार. मथळे प्रत्येक स्रोताने लिहिल्याप्रमाणेच.",
        "national": "राष्ट्रीय", "international": "आंतरराष्ट्रीय", "following": "तुम्ही फॉलो करत असलेल्या बातम्या",
        "sources": "{n} स्रोत", "source1": "1 स्रोत", "first": "प्रथम प्रकाशित: {s}", "new_reports": "{n} नवीन वृत्त",
        "open": "तुमचे फीड उघडा", "settings": "हे ईमेल बदला किंवा थांबवा",
    },
    "bn": {
        "subject": "আপনার আপডেট: শেষ ভিজিটের পর {n}টি খবর", "subject_none": "আপনার আপডেট: আপনার ফলো করা খবর",
        "intro": "প্রতিটি রূপ, আপনার সময়ে। শিরোনাম প্রতিটি সূত্র যেমন লিখেছে তেমনই।",
        "national": "জাতীয়", "international": "আন্তর্জাতিক", "following": "আপনি যে খবরগুলি ফলো করেন",
        "sources": "{n}টি সূত্র", "source1": "1টি সূত্র", "first": "প্রথম প্রকাশ: {s}", "new_reports": "{n}টি নতুন প্রতিবেদন",
        "open": "আপনার ফিড খুলুন", "settings": "এই ইমেলগুলি বদলান বা বন্ধ করুন",
    },
    "gu": {
        "subject": "તમારું અપડેટ: છેલ્લી મુલાકાત પછી {n} સમાચાર", "subject_none": "તમારું અપડેટ: તમે ફૉલો કરો છો તે સમાચાર",
        "intro": "દરેક રૂપ, તમારા સમયે. મથાળાં દરેક સ્ત્રોતે લખ્યાં છે તેમ જ.",
        "national": "રાષ્ટ્રીય", "international": "આંતરરાષ્ટ્રીય", "following": "તમે ફૉલો કરો છો તે સમાચાર",
        "sources": "{n} સ્ત્રોતો", "source1": "1 સ્ત્રોત", "first": "સૌથી પહેલાં પ્રકાશિત: {s}", "new_reports": "{n} નવા અહેવાલો",
        "open": "તમારું ફીડ ખોલો", "settings": "આ ઇમેઇલ બદલો કે બંધ કરો",
    },
    "pa": {
        "subject": "ਤੁਹਾਡੀ ਅੱਪਡੇਟ: ਪਿਛਲੀ ਫੇਰੀ ਤੋਂ ਬਾਅਦ {n} ਖ਼ਬਰਾਂ", "subject_none": "ਤੁਹਾਡੀ ਅੱਪਡੇਟ: ਤੁਹਾਡੀਆਂ ਫ਼ਾਲੋ ਕੀਤੀਆਂ ਖ਼ਬਰਾਂ",
        "intro": "ਹਰ ਰੂਪ, ਤੁਹਾਡੇ ਸਮੇਂ ਤੇ। ਸਿਰਲੇਖ ਉਵੇਂ ਹੀ ਜਿਵੇਂ ਹਰ ਸਰੋਤ ਨੇ ਲਿਖੇ।",
        "national": "ਰਾਸ਼ਟਰੀ", "international": "ਅੰਤਰਰਾਸ਼ਟਰੀ", "following": "ਜਿਹੜੀਆਂ ਖ਼ਬਰਾਂ ਤੁਸੀਂ ਫ਼ਾਲੋ ਕਰਦੇ ਹੋ",
        "sources": "{n} ਸਰੋਤ", "source1": "1 ਸਰੋਤ", "first": "ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਛਾਪਿਆ: {s}", "new_reports": "{n} ਨਵੀਆਂ ਰਿਪੋਰਟਾਂ",
        "open": "ਆਪਣੀ ਫੀਡ ਖੋਲ੍ਹੋ", "settings": "ਇਹ ਈਮੇਲਾਂ ਬਦਲੋ ਜਾਂ ਬੰਦ ਕਰੋ",
    },
    "or": {
        "subject": "ଆପଣଙ୍କ ଅପଡେଟ୍: ଶେଷ ଭ୍ରମଣ ପରେ {n}ଟି ଖବର", "subject_none": "ଆପଣଙ୍କ ଅପଡେଟ୍: ଆପଣ ଫଲୋ କରୁଥିବା ଖବର",
        "intro": "ପ୍ରତ୍ୟେକ ରୂପ, ଆପଣଙ୍କ ସମୟରେ। ଶିରୋନାମା ପ୍ରତ୍ୟେକ ଉତ୍ସ ଯେପରି ଲେଖିଛି।",
        "national": "ଜାତୀୟ", "international": "ଆନ୍ତର୍ଜାତୀୟ", "following": "ଆପଣ ଫଲୋ କରୁଥିବା ଖବର",
        "sources": "{n}ଟି ଉତ୍ସ", "source1": "1ଟି ଉତ୍ସ", "first": "ପ୍ରଥମେ ପ୍ରକାଶ: {s}", "new_reports": "{n}ଟି ନୂଆ ରିପୋର୍ଟ",
        "open": "ଆପଣଙ୍କ ଫିଡ୍ ଖୋଲନ୍ତୁ", "settings": "ଏହି ଇମେଲ୍ ବଦଳାନ୍ତୁ ବା ବନ୍ଦ କରନ୍ତୁ",
    },
    "ur": {
        "subject": "آپ کی اپڈیٹ: پچھلے دورے کے بعد {n} خبریں", "subject_none": "آپ کی اپڈیٹ: آپ کی فالو کی گئی خبریں",
        "intro": "ہر صورت، آپ کے وقت پر۔ سرخیاں ویسی ہی ہیں جیسی ہر ذریعے نے لکھیں۔",
        "national": "قومی", "international": "بین الاقوامی", "following": "جن خبروں کو آپ فالو کرتے ہیں",
        "sources": "{n} ذرائع", "source1": "1 ذریعہ", "first": "سب سے پہلے شائع کیا: {s}", "new_reports": "{n} نئی رپورٹیں",
        "open": "اپنی فیڈ کھولیں", "settings": "یہ ای میل بدلیں یا بند کریں",
    },
}

@dataclass
class Reader:
    user_id: str
    email: str
    topics: list[str]
    state: str
    languages: list[str]
    hide_crime: bool
    ui: str
    catchup: time
    tz: str
    notify_followed: bool
    last_visit: datetime | None
    last_digest_on: date | None


@dataclass
class Item:
    story_id: str
    title: str
    source: str
    sources: int
    extra: str = ""


@dataclass
class Digest:
    subject: str
    sections: list[tuple[str, list[Item]]] = field(default_factory=list)

    @property
    def empty(self) -> bool:
        return not any(items for _, items in self.sections)


def is_due(reader: Reader, now_utc: datetime) -> bool:
    """Due once per local day, at or after the chosen time (so a late job still sends)."""
    local = now_utc.astimezone(ZoneInfo(reader.tz or "Asia/Kolkata"))
    if reader.last_digest_on == local.date():
        return False
    return local.time() >= reader.catchup


def label_for(story: dict, languages: list[str]) -> tuple[str, str]:
    labels = as_dict(story.get("labels"))
    for lang in languages:
        if lang in labels:
            return labels[lang]["title"], labels[lang]["source_name"]
    first = labels.get(story.get("label_language") or "", {})
    return story["label"], first.get("source_name", story.get("label_source_id") or "")


def matches(story: dict, r: Reader) -> bool:
    topics = as_list(story.get("topics"))
    if r.hide_crime and set(topics) & HIDDEN_BY_HIDE_CRIME:
        return False
    langs = as_list(story.get("languages"))
    if langs and not set(langs) & set(r.languages):
        return False
    return not r.topics or bool(set(topics) & set(r.topics))


def build_digest(r: Reader, stories: list[dict], followed: list[dict], place_names: dict) -> Digest:
    t = TEXT.get(r.ui, TEXT["en"])

    def item(s: dict, extra: str = "") -> Item:
        title, source = label_for(s, r.languages)
        return Item(s["id"], title, source, int(s["source_count"]), extra)

    fresh = [s for s in stories if matches(s, r)]
    fresh.sort(key=lambda s: (-int(s["source_count"]), -(to_datetime(s["last_article_at"]).timestamp())))
    def name(place: str) -> str:   # the reader's language, else English (names exist in en/te so far)
        names = place_names.get(place, {})
        return names.get(r.ui) or names.get("en") or place

    sections: list[tuple[str, list[Item]]] = []
    state = [item(s) for s in fresh if r.state in as_list(s.get("places"))][:PER_SECTION]
    sections.append((name(r.state), state))
    # In the email, National skips the reader's own state (already listed above) so no headline repeats.
    world = [s for s in fresh if s.get("scope") == "international"]
    national = [item(s) for s in fresh if s not in world and r.state not in as_list(s.get("places"))][:PER_SECTION]
    sections.append((t["national"], national))
    sections.append((t["international"], [item(s) for s in world][:PER_SECTION]))
    if r.notify_followed:
        f_items = [item(s, t["new_reports"].format(n=s["new"])) for s in followed if s["new"] > 0]
        sections.insert(0, (t["following"], f_items))

    n = len({i.story_id for _, items in sections for i in items})
    subject = t["subject"].format(n=n) if n else t["subject_none"]
    return Digest(subject=subject, sections=[(h, items) for h, items in sections if items])


def render(d: Digest, ui: str) -> tuple[str, str]:
    t = TEXT.get(ui, TEXT["en"])
    esc = html.escape
    parts = [f'<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1b1a17">',
             f'<h1 style="font-family:Georgia,serif;color:#1d4e89;font-size:22px">All-Lens</h1>',
             f'<p style="color:#5e5a52;font-size:14px">{esc(t["intro"])}</p>']
    text = ["All-Lens", t["intro"], ""]
    for heading, items in d.sections:
        parts.append(f'<h2 style="font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#5e5a52;'
                     f'margin-top:24px">{esc(heading)}</h2>')
        text.append(heading.upper())
        for i in items:
            count = t["source1"] if i.sources == 1 else t["sources"].format(n=i.sources)
            meta = " · ".join(x for x in [count, t["first"].format(s=i.source), i.extra] if x)
            url = f"{SITE_URL}/story/{i.story_id}"
            parts.append(f'<p style="margin:0 0 14px"><a href="{esc(url)}" style="color:#1b1a17;font-size:16px;'
                         f'font-weight:bold;text-decoration:none">{esc(i.title)}</a><br>'
                         f'<span style="color:#5e5a52;font-size:13px">{esc(meta)}</span></p>')
            text += [i.title, f"  {meta}", f"  {url}", ""]
    parts.append(f'<p style="margin-top:24px"><a href="{SITE_URL}/feed" style="background:#1d4e89;color:#fff;'
                 f'padding:10px 16px;border-radius:8px;text-decoration:none">{esc(t["open"])}</a></p>'
                 f'<p style="font-size:12px;color:#5e5a52"><a href="{SITE_URL}/settings">{esc(t["settings"])}</a></p></div>')
    text += [f'{t["open"]}: {SITE_URL}/feed', f'{t["settings"]}: {SITE_URL}/settings']
    return "".join(parts), "\n".join(text)


def send_email(to: str, subject: str, html_body: str, text_body: str) -> bool:
    import requests

    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
        json={"from": os.environ["EMAIL_FROM"], "to": [to], "subject": subject, "html": html_body, "text": text_body},
        timeout=20,
    )
    return r.status_code < 300


# --------------------------------------------------------------------------
# Database (Supabase / Postgres only)
# --------------------------------------------------------------------------

def load_readers(db: DB) -> list[Reader]:
    rows = db.fetchall(
        """SELECT p.user_id::text, u.email, p.topics, p.state, p.languages, p.hide_crime, p.ui_language,
                  p.catchup_time, p.timezone, p.notify_followed, p.last_visit_at, p.last_digest_on
           FROM public.profiles p JOIN auth.users u ON u.id = p.user_id
           WHERE p.notify_digest AND u.email IS NOT NULL""")
    return [Reader(r[0], r[1], as_list(r[2]), r[3], as_list(r[4]) or ["en"], bool(r[5]), r[6],
                   r[7], r[8], bool(r[9]), to_datetime(r[10]), r[11]) for r in rows]


STORY_SQL = """SELECT id, label, label_language, label_source_id, labels, source_count, last_article_at,
                      places, topics, languages, scope FROM public.stories WHERE last_article_at > ?"""


def _story(row) -> dict:
    keys = ["id", "label", "label_language", "label_source_id", "labels", "source_count", "last_article_at",
            "places", "topics", "languages", "scope"]
    return dict(zip(keys, row))


def run(db: DB, now: datetime | None = None, dry_run: bool = False) -> dict:
    now = now or datetime.now(timezone.utc)
    if db.kind != "postgres":
        return {"sent": 0, "skipped": "needs the Supabase database"}
    places = _place_names()
    sent = failed = empty = 0
    for r in load_readers(db):
        if not is_due(r, now):
            continue
        since = r.last_visit or now - timedelta(days=1)
        since = max(since, now - timedelta(days=7))
        stories = [_story(s) for s in db.fetchall(STORY_SQL, (since,))]
        followed = []
        if r.notify_followed:
            for row in db.fetchall(
                    f"""SELECT s.id, s.label, s.label_language, s.label_source_id, s.labels, s.source_count,
                               s.last_article_at, s.places, s.topics, s.languages, s.scope,
                               s.article_count - f.seen_article_count
                        FROM public.follows f JOIN public.stories s ON s.id = f.story_id
                        WHERE f.user_id = ?::uuid""", (r.user_id,)):
                d = _story(row[:11])
                d["new"] = int(row[11] or 0)
                followed.append(d)
        digest = build_digest(r, stories, followed, places)
        local_day = now.astimezone(ZoneInfo(r.tz or "Asia/Kolkata")).date()
        if digest.empty:
            empty += 1
        elif dry_run:
            print(f"[dry-run] {r.email}: {digest.subject}")
            sent += 1
        else:
            html_body, text_body = render(digest, r.ui)
            if send_email(r.email, digest.subject, html_body, text_body):
                sent += 1
            else:
                failed += 1
                continue
        if not dry_run:
            db.execute("UPDATE public.profiles SET last_digest_on = ? WHERE user_id = ?::uuid", (local_day, r.user_id))
            db.commit()
    return {"sent": sent, "failed": failed, "nothing_new": empty}


def _place_names() -> dict:
    import json

    from pipeline.tagging import DATA

    data = json.loads((DATA / "places.json").read_text(encoding="utf-8"))
    return {p["id"]: {"en": p["en"], "te": p["te"]} for p in data["places"]}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)
    if not args.dry_run and not (os.environ.get("RESEND_API_KEY") and os.environ.get("EMAIL_FROM")):
        print("RESEND_API_KEY / EMAIL_FROM not set: running as a dry run")
        args.dry_run = True
    db = DB()
    result = run(db, dry_run=args.dry_run)
    db.close()
    print(result)
    return 1 if result.get("failed") else 0


if __name__ == "__main__":
    sys.exit(main())
