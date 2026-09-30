# Setup: from this folder to a live app

About 1.5 to 2 hours the first time. Every account here has a free tier that covers the pilot. Do the steps in order; each ends with a check.

**Golden rule for keys:** passwords, the database connection string and API keys go only into (a) GitHub → Settings → Secrets, (b) Vercel → Environment Variables, or (c) a local `.env` / `web/.env.local` file that is never committed. Never paste them into code, chat or screenshots.

---

## 1. GitHub: store the code (10 min)

1. On github.com create a **private** repository named `alllens`. Don't add a README.
2. In VS Code open this `alllens` folder, then in the terminal:
   ```bash
   git init
   git add .
   git commit -m "All-Lens: pipeline, grouping and web app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/alllens.git
   git push -u origin main
   ```
3. **Check:** on GitHub → Actions, the **Tests** workflow runs and turns green. It tests the pipeline on SQLite and on a real Postgres, checks the security rules, and builds the website.

(If you already pushed the earlier `alllens-pipeline` repo, you can push this folder there instead; the database upgrades itself.)

## 2. Supabase: database and sign-in (15 min)

1. supabase.com → **New project**. Name `alllens`, region **Mumbai (ap-south-1)**, a strong database password saved in your password manager.
2. **Database connection string:** project → **Connect** → *Session pooler* → copy the URI and put your password in it. It looks like
   `postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`
3. **Website keys:** Project Settings → **API**: copy the **Project URL** and the **anon / publishable key**. (This key is safe in the browser; the security rules decide what it can do. Never use the `service_role` / secret key in the website.)
4. **Create the tables:** nothing to do by hand. The first pipeline run applies everything in `supabase/migrations/`. (Alternative: paste each file, in order, into the SQL Editor and click Run. Both are safe to repeat.)

## 3. Connect GitHub to Supabase (5 min)

GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the Session pooler connection string |
| `SITE_URL` | your site address, e.g. `https://alllens.vercel.app` (update later if you add a domain) |

**Check:** Actions → **Check feeds** → Run workflow. Download the `feed-report` artifact. Mark working feeds `live` and failing ones `broken` in `sources.csv` (or on your computer: `python -m pipeline.check_feeds --update-sources`), commit and push.

Then Actions → **Collect news** → Run workflow. The first run takes ~5 minutes (it downloads the multilingual model once; later runs reuse it).
**Check:** Supabase → Table editor → `stories` has rows, `runs` shows feeds OK / failed.

From now on collection runs every 2 hours and clean-up every night, by themselves.

## 4. Vercel: put the website online (10 min)

1. vercel.com → sign in with GitHub → **Add New → Project** → pick the `alllens` repo.
2. **Root Directory: `web`** (important). Framework: Next.js (auto-detected).
3. Environment Variables:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 2.3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key from step 2.3 |
   | `NEXT_PUBLIC_SITE_URL` | the Vercel address, e.g. `https://alllens.vercel.app` |
   | `NEXT_PUBLIC_GRIEVANCE_OFFICER` | name of the grievance officer (can be you for the pilot) |
   | `NEXT_PUBLIC_GRIEVANCE_EMAIL` | an inbox you check daily |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | general contact inbox |

4. Deploy. **Check:** the site opens, shows live stories (no yellow "sample" banner), and "Our sources" lists your sources.

Every push to `main` now redeploys automatically; every pull request gets a preview link. That is your CI/CD: GitHub Actions tests, Vercel deploys.

## 5. Sign-in (20 min)

Supabase → **Authentication**:

1. **URL Configuration:** Site URL = your Vercel address. Redirect URLs: add `https://<your-site>/**` and `http://localhost:3000/**`.
2. **Email templates** → *Magic Link* and *Confirm signup*: set the link in both to
   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in to All-Lens</a>
   ```
   (This makes the link work even when opened on a different device.)
3. **Google sign-in:** Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID* (Web application). Authorised redirect URI: the callback URL shown in Supabase → Authentication → Providers → Google. Paste the client ID and secret into that Supabase page and enable it.
4. **Email sending:** Supabase's built-in email is rate-limited (fine for testing). Before inviting pilot users, set Authentication → SMTP to your Resend account (step 6).
5. **Phone sign-in (later):** needs an SMS provider (Twilio, MSG91 etc.) with Indian **DLT** registration. When ready, enable Phone in Supabase and set `NEXT_PUBLIC_ENABLE_PHONE_LOGIN=true` in Vercel.

**Check:** on the site, Sign in → email link → you land on your feed; your choices are kept; Follow works; Settings shows your email.

## 6. Daily catch-up emails (15 min)

1. resend.com → verify your domain (or use their test sender while piloting) → create an API key.
2. GitHub secrets: `RESEND_API_KEY` = the key, `EMAIL_FROM` = e.g. `All-Lens <catchup@yourdomain>`.
3. The **Daily catch-up emails** workflow runs hourly and sends each reader one email a day at their chosen time. Until the two secrets exist it only does a dry run and prints what it would send.

**Check:** set your catch-up time to the next hour in Settings, then look at the next run's log or your inbox.

## 7. Before inviting the 20 pilot users

- [ ] Run **Review story grouping** (Actions) after a day of collection; mark 50 stories right/wrong in the CSV. Aim for 8 of 10 correct. Too many wrong merges: raise `GROUP_THRESHOLD` (default 0.88) a little, set as a repository **variable** under Settings → Secrets and variables → Actions → Variables; too many splits: lower it.
- [ ] Ask a native speaker to read the Telugu interface text (`web/lib/i18n.ts`).
- [ ] Fill the grievance officer and contact emails; read Privacy/Terms/Grievance pages and have a lawyer review before public launch.
- [ ] Check each source's terms of use (some feeds are "personal, non-commercial use"). Ask publishers where needed.
- [ ] Optional: buy a domain, add it in Vercel, then update `SITE_URL` (GitHub secret), `NEXT_PUBLIC_SITE_URL` (Vercel) and the Supabase Site URL.

## When something goes wrong

| Symptom | Where to look |
| --- | --- |
| No new stories | Actions → Collect news → latest run log; Supabase table `runs` |
| Site shows the yellow sample banner | Vercel env vars `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` missing; redeploy after adding |
| Sign-in link says failed | Step 5.1 redirect URLs and 5.2 email template |
| A feed stopped working | Actions → Check feeds; mark it `broken` in `sources.csv` |
| Wrong district on a story | Add the place or spelling to `pipeline/data/places.json`, run `python -m pipeline.export_web_data`, push |

## Costs to expect

Pilot: close to ₹0. Watch these as users grow: Supabase free tier (500 MB database; the 30-day retention keeps it small), GitHub Actions minutes (private repos have a monthly allowance; the collect job is the largest user), Resend (free tier covers a small daily list), Vercel hobby tier (fine for a pilot; a commercial product needs the Pro plan). Check each pricing page when you sign up; limits change.
