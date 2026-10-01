/**
 * Vuaz helper: a Google Apps Script web app in the owner's Google account.
 * Setup: docs/TRANSLATE.md.
 *
 * 1. Translation. Receives a few headlines, returns Google's translation of each, line for line.
 *    Uses Google's built-in LanguageApp (free; about 5,000 calls a day on a normal Google account).
 *    Only news text is sent (headlines and short snippets): nothing about readers, and nothing is stored here.
 *    Request (POST, JSON): {"token": "...", "source": "te" or "" (detect), "target": "ta", "texts": ["...", ...]}
 *    Answer (JSON):        {"translations": ["...", ...]}  or  {"error": "..."}
 *
 * 2. Feeds a site refuses to GitHub's servers. The collector asks for a public RSS feed here only
 *    when the site answered GitHub with 403 or not at all. Uses UrlFetchApp (free; 20,000 a day),
 *    which tells the site it is Google Apps Script. Never Reddit (it needs its official API).
 *    Request: {"token": "...", "feed": "https://..."}
 *    Answer:  {"status": 200, "body": "<the feed, base64>"}  or  {"error": "..."}
 */
function doPost(e) {
  var out;
  try {
    var body = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || body.token !== token) {
      out = { error: 'unauthorised' };
    } else if (body.feed) {
      out = fetchFeed(String(body.feed));
    } else {
      var texts = body.texts || [];
      var joined = texts.join('\n');
      if (!texts.length || texts.length > 100 || joined.length > 5000 || !body.target) {
        out = { error: 'bad request' };
      } else {
        var result = LanguageApp.translate(joined, body.source || '', body.target, { contentType: 'text' });
        out = { translations: result.split('\n') };
      }
    }
  } catch (err) {
    out = { error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function fetchFeed(url) {
  var host = (url.match(/^https?:\/\/([^\/:?#]+)/i) || [])[1];
  if (!host || /(^|\.)reddit\.com$/i.test(host)) return { error: 'bad request' };
  var r = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' }
  });
  return { status: r.getResponseCode(), body: Utilities.base64Encode(r.getContent()) };
}

/** Run this from the editor (select "check", then Run) to allow translation and feed fetching, and test both. */
function check() {
  Logger.log(LanguageApp.translate('హైదరాబాద్‌లో భారీ వర్షం', 'te', 'ta'));
  Logger.log('Feed answer: ' + UrlFetchApp.fetch('https://www.heraldgoa.in/rss', { muteHttpExceptions: true }).getResponseCode());
}
