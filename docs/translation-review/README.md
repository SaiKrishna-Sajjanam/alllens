# Translation review sheets

One sheet per interface language (`te.csv` Telugu, `hi.csv` Hindi, `ta.csv` Tamil, `kn.csv` Kannada,
`ml.csv` Malayalam, `mr.csv` Marathi, `bn.csv` Bengali, `gu.csv` Gujarati, `pa.csv` Punjabi,
`or.csv` Odia, `ur.csv` Urdu). Every text in them is a draft that needs a native speaker.

**For reviewers**

1. Open your language's file in Google Sheets (File → Import → Upload) or Excel.
2. Read each row: the English, then the current draft in your language.
3. If the draft is wrong, unnatural or too formal, write a better version in **Your correction**.
   Leave it empty when the draft is fine.
4. Keep anything in curly brackets exactly as it is, e.g. `{n}`, `{source}`, `{time}`, `{name}`:
   the app puts a number, name or time there.
5. Keep it short and everyday: these are buttons and labels on a phone.
6. Send the file back (CSV or the Google Sheet link).

News headlines are not in these sheets: the app never rewrites them.

**For the team:** after interface text changes, make fresh sheets with
`cd web && node --import tsx scripts/translation-review.ts`. Corrections that come back are copied
into `web/lib/i18n.ts` (English, Telugu) and `web/lib/locales/<code>.ts` (the others).
