# Headlines in every reader's language (one-time setup, about 10 minutes)

A reader who uses Vuaz in Tamil sees every headline and snippet (the short opening text) in
Tamil, whatever language the outlet wrote it in, marked **"Translated by Google · show the
original"**. Articles are never translated: every link opens the original article or video,
and readers use their own phone's translator for it.

The translation is Google's free translator, reached through a small **Google Apps Script**
that lives in your own Google account. No card and no cost. A normal Gmail account allows
about 5,000 translate calls a day, and each call carries up to 40 headlines.

Until this is set up, everything works, and headlines simply show in their original language.

## 1. Make a password for the translator

In the VS Code terminal:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the line it prints. This is the translator's password; keep it private and don't paste it
into chat. You'll put it in three places below.

## 2. Create the script

1. Open **script.google.com** (signed in with your Google account) → **New project**.
2. Click "Untitled project" at the top and rename it **Vuaz translator**.
3. Delete everything in `Code.gs`, then paste the full contents of
   [`deploy/translator/Code.gs`](../deploy/translator/Code.gs) from this project → **Save** (disk icon).
4. Left bar → **Project Settings** (gear) → scroll to **Script Properties** → **Add script property**:
   Property `TOKEN`, Value: the password from step 1 → **Save script properties**.

## 3. Allow it once, and test

1. Left bar → **Editor**. In the toolbar, choose the function **check**, then click **Run**.
2. Google asks for permission: **Review permissions** → pick your account → **Advanced** →
   **Go to Vuaz translator (unsafe)** → **Allow**. ("Unsafe" only means Google hasn't reviewed
   the script. It's your own script, and it only translates text.)
3. The **Execution log** at the bottom shows a Tamil sentence. That means it works.

## 4. Publish it as a web app

1. Top right **Deploy → New deployment** → the gear next to "Select type" → **Web app**.
2. Description: `v1`. **Execute as: Me**. **Who has access: Anyone** (the website and the
   collector call it without a Google sign-in; the password keeps everyone else out).
3. **Deploy** → copy the **Web app URL** (it ends in `/exec`).

## 5. Give the address and password to GitHub

GitHub → your repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
| --- | --- |
| `TRANSLATE_URL` | the Web app URL from step 4 |
| `TRANSLATE_TOKEN` | the password from step 1 |

**Check:** Actions → **Collect news** → Run workflow. At the end of the log:
`Headlines translated: {'languages': ['en', ...], 'translated': ..., ...}`.
The first run works through the week's backlog; anything left over is done in the next
runs (a run makes at most 450 calls, so a day stays under Google's 5,000).

## 6. Give them to the website too

- **Vercel** (once the site is online, docs/SETUP.md step 4): Project → Settings →
  Environment Variables → add `TRANSLATE_URL` and `TRANSLATE_TOKEN` with the same values →
  Deployments → Redeploy.
- **Your computer** (optional): add the two lines to `web/.env.local`
  (`TRANSLATE_URL=...` and `TRANSLATE_TOKEN=...`), then restart `npm run dev`.

The website uses them only to fill a headline the collector hasn't translated yet (for example
one from the last few minutes, or a language no signed-in reader has chosen), and caches each
answer for a week.

## Which languages

Each collect run translates new headlines into English, plus every app language a signed-in
reader has chosen, plus any listed in the optional repository **variable** `TRANSLATE_LANGS`
(Settings → Secrets and variables → Actions → **Variables**, e.g. `te,ta,hi`). Translations are
kept for a week (the feed's span) and deleted by the nightly clean-up.

## If something goes wrong

| Log says | Fix |
| --- | --- |
| `unauthorised` | The password in GitHub/Vercel differs from the script property `TOKEN` |
| `did not answer with JSON` | The URL is wrong, or "Who has access" is not **Anyone** |
| `too many times for one day` | Google's daily allowance is used up; the rest continues tomorrow automatically |

If you change `Code.gs` later: Deploy → **Manage deployments** → pencil → Version: **New version**
→ Deploy. The URL stays the same.
