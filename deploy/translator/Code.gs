/**
 * Vuaz headline translator: a Google Apps Script web app in the owner's Google account.
 * Setup: docs/TRANSLATE.md.
 *
 * Receives a few headlines, returns Google's translation of each, line for line. Uses
 * Google's built-in LanguageApp (free; about 5,000 calls a day on a normal Google account).
 * Only news text is sent (headlines and short snippets): nothing about readers, and nothing is stored here.
 *
 * Request (POST, JSON): {"token": "...", "source": "te" or "" (detect), "target": "ta", "texts": ["...", ...]}
 * Answer (JSON):        {"translations": ["...", ...]}  or  {"error": "..."}
 */
function doPost(e) {
  var out;
  try {
    var body = JSON.parse(e.postData.contents);
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token || body.token !== token) {
      out = { error: 'unauthorised' };
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

/** Run this once from the editor (select "check", then Run) to allow translation and test it. */
function check() {
  Logger.log(LanguageApp.translate('హైదరాబాద్‌లో భారీ వర్షం', 'te', 'ta'));
}
