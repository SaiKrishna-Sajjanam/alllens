// Interface text. English and Telugu live here; the other languages are in lib/locales/.
// News itself is never translated by us: headlines and snippets always appear in the words
// and language the source used ("Translate" hands the original to Google Translate instead).
// Every language except English is a draft: have a native speaker review it before launch.
import { bn } from './locales/bn';
import { gu } from './locales/gu';
import { hi } from './locales/hi';
import { kn } from './locales/kn';
import { ml } from './locales/ml';
import { mr } from './locales/mr';
import { or } from './locales/or';
import { pa } from './locales/pa';
import { ta } from './locales/ta';
import { ur } from './locales/ur';
import type { Lang } from './types';

/** Interface languages: code, own name, date locale, writing direction. English first, then by speakers. */
export const UI_LANGUAGES: { code: Lang; name: string; locale: string; rtl?: boolean }[] = [
  { code: 'en', name: 'English', locale: 'en-IN' },
  { code: 'hi', name: 'हिन्दी', locale: 'hi-IN' },
  { code: 'bn', name: 'বাংলা', locale: 'bn-IN' },
  { code: 'mr', name: 'मराठी', locale: 'mr-IN' },
  { code: 'te', name: 'తెలుగు', locale: 'te-IN' },
  { code: 'ta', name: 'தமிழ்', locale: 'ta-IN' },
  { code: 'gu', name: 'ગુજરાતી', locale: 'gu-IN' },
  { code: 'ur', name: 'اردو', locale: 'ur-IN', rtl: true },
  { code: 'kn', name: 'ಕನ್ನಡ', locale: 'kn-IN' },
  { code: 'or', name: 'ଓଡ଼ିଆ', locale: 'or-IN' },
  { code: 'ml', name: 'മലയാളം', locale: 'ml-IN' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', locale: 'pa-IN' },
];

const en = {
  brand: 'Vuaz',
  tagline: 'Every version of the news, at your time',
  'nav.feed': 'Feed',
  'nav.following': 'Following',
  'nav.archive': 'Archive',
  'nav.sources': 'Our sources',
  'nav.about': 'How it works',
  'nav.signin': 'Sign in',
  'nav.settings': 'Settings',
  'nav.menu': 'Main menu',

  'welcome.title': 'Every version of the news, at your time',
  'welcome.intro': 'Choose your state. International and National news is the same for everyone: every public source, untouched, with a link to each original.',
  'welcome.signin': 'Already have an account? Sign in',

  'prefs.topics': 'Topics',
  'prefs.places': 'Your state',
  'prefs.state': 'State',
  'prefs.chooseState': 'Choose your state',
  'feed.chooseState': 'Choose your state to see its news. You can change it at any time.',
  'prefs.statePilot': 'Every state is treated alike: its own outlets, in its languages and English, plus national outlets’ coverage of it. You can switch state at any time.',
  'prefs.hideCrime': 'Hide crime and accident stories',
  'prefs.hideCrimeHint': 'Your choice. We never hide anything on our own.',
  'prefs.save': 'Show my news',
  'prefs.saveSettings': 'Save',
  'prefs.saved': 'Saved',

  'feed.title': 'Your news',
  'feed.since': 'Since your last visit, {time}',
  'feed.firstVisit': 'Last 7 days',
  'feed.tabInternational': 'International',
  'feed.tabNational': 'National',
  'feed.tabsLabel': 'Area',
  'feed.order': 'Order',
  'feed.orderNote': 'Order is mechanical and yours to change. We never rank or rate sources.',
  'feed.sources': '{n} sources',
  'feed.source1': '1 source so far',
  'feed.reports': '{n} reports',
  'feed.new': 'New',
  'feed.empty': 'No stories here yet for your choices.',
  'feed.more': 'Show more',
  'feed.firstBy': 'First reported by {source}',
  'feed.demo': 'You are looking at sample stories. Connect Supabase (see docs/SETUP.md) to see live news.',
  'feed.edit': 'Change my choices',

  'sort.sources': 'Most sources first',
  'sort.latest': 'Latest first',
  'sort.random': 'Random',
  'sort.earliest': 'Earliest first',
  'sort.source': 'Source name A to Z',

  'story.back': 'Back to feed',
  'story.count': '{n} reports from {s} sources',
  'story.follow': 'Follow this story',
  'story.following': 'Following',
  'story.unfollow': 'Stop following',
  'story.signInToFollow': 'Sign in to follow',
  'story.filterType': 'Kind of source',
  'story.filterLanguage': 'Language',
  'story.all': 'All',
  'story.sort': 'Order',
  'story.orderNote': 'We never rank or rate sources. Order is by time unless you change it.',
  'story.read': 'Read at {source}',
  'story.watch': 'Watch on {source}',
  'story.ownTranslator': 'Opens in {language}. To read it in your language, use your phone’s own translator (Google Translate, or Translate in Safari on iPhone).',
  'tr.from': 'Translated from {language}',
  'tr.showOriginal': 'Translated by Google · show the original ({language})',
  'story.pictureBy': 'Picture: {source}',
  'story.compare': 'Compare',
  'story.compareN': 'Compare side by side ({n})',
  'story.compareHint': 'Tick 2 or 3 reports to compare them.',
  'story.compareMax': 'You can compare up to 3 at a time.',
  'story.wire': 'Same wire text as {n} other listing(s)',
  'story.updated': 'Headline changed by the source, {time}',
  'story.moreComing': 'New versions appear here as more outlets report. Follow the story to see them in your catch-up.',
  'story.gone': 'This story is no longer available. Stories are kept for 30 days.',
  'story.noneMatch': 'No reports match these filters.',
  'story.firstBy': 'First reported by {source}, {time}',

  'ai.ask': 'Ask your AI',
  'ai.openWith': 'Open with',
  'ai.note': 'Opens the assistant you choose with the link only. We add no question or prompt.',
  'ai.copied': 'Link copied. Paste it into {name}.',
  'ai.other': 'Copy link only',

  'compare.title': 'Side by side',
  'compare.intro': 'As each source published it.',
  'compare.headline': 'Headline',
  'compare.snippet': 'Opening text',
  'compare.original': 'Read original',
  'compare.askAll': 'Ask your AI about these',
  'compare.none': 'Pick 2 or 3 reports on a story page to compare them.',
  'compare.backToStory': 'Back to story',

  'following.title': 'Stories you follow',
  'following.newSince': '{n} new since you last looked',
  'following.noNew': 'No new reports since you last looked',
  'following.empty': 'Follow a developing story to see new reports here.',
  'following.signIn': 'Sign in to follow stories.',

  'archive.title': 'Archive',
  'archive.intro': 'Stories from 8 to 30 days ago. After 30 days they are removed.',
  'archive.search': 'Search headlines',
  'archive.searchButton': 'Search',
  'archive.empty': 'Nothing found.',

  'sources.title': 'Our sources',
  'sources.intro': 'Every outlet we collect from. Choosing sources is itself a choice, so the whole list is public and anyone can suggest more.',
  'sources.policy': 'A source is included if it publishes news regularly, can be identified, and is not dedicated to hate or harassment. The same rule applies to every source.',
  'sources.count': '{n} sources',
  'status.live': 'Collected',
  'status.to_check': 'Being checked',
  'status.broken': 'Feed not working',
  'status.no_feed': 'No public feed yet',
  'layer.national': 'India',
  'layer.state': 'State',
  'layer.international': 'International',

  'suggest.title': 'Suggest a source',
  'suggest.name': 'Outlet or page name',
  'suggest.url': 'Website (optional)',
  'suggest.note': 'Anything we should know (optional)',
  'suggest.send': 'Send suggestion',
  'suggest.thanks': 'Thank you. Every suggestion is checked against the published source rule.',
  'suggest.signIn': 'Sign in to suggest a source.',
  'suggest.error': 'Could not send. Please check the name and try again.',

  'login.title': 'Sign in',
  'login.intro': 'Save your choices and follow stories on every device. Reading needs no account.',
  'login.google': 'Continue with Google',
  'login.error': 'Sign-in did not work. Please try again.',
  'login.guest': 'Continue without an account',
  'login.notConfigured': 'Sign-in works once Supabase is connected (see docs/SETUP.md).',

  'settings.title': 'Settings',
  'settings.reading': 'What you see',
  'settings.app': 'App',
  'settings.ui': 'App language',
  'settings.ai': 'Default AI assistant',
  'settings.account': 'Account',
  'settings.signedInAs': 'Signed in as {email}',
  'settings.guest': 'You are not signed in. Your choices are saved on this device only.',
  'settings.signOut': 'Sign out',
  'settings.delete': 'Delete my account',
  'settings.deleteConfirm': 'This deletes your account, choices and follows for good. Type DELETE to confirm.',
  'settings.deleteButton': 'Delete account',
  'settings.inactive': 'Accounts unused for 12 months are deleted automatically. The app never sends email.',

  'group.newspaper': 'Newspaper',
  'group.tv': 'TV',
  'group.digital': 'Digital',
  'group.community': 'Community',
  'group.government': 'Government',
  'group.international': 'International',
  'group.video': 'Video',

  'footer.rule': 'We never rank, rate or rewrite sources.',
  'footer.about': 'How it works',
  'footer.sources': 'Our sources',
  'footer.grievance': 'Grievances and takedowns',
  'footer.privacy': 'Privacy',
  'footer.terms': 'Terms',

  'notFound.title': 'Page not found',
  'notFound.back': 'Go to your feed',
  'error.title': 'Something went wrong',
  'error.retry': 'Try again',
  'common.loading': 'Loading…',
  'common.close': 'Close',
} as const;

export type Key = keyof typeof en;

const te: Record<Key, string> = {
  brand: 'Vuaz',
  tagline: 'ప్రతి వార్త, అన్ని వెర్షన్లు, మీకు వీలైన సమయంలో',
  'nav.feed': 'ఫీడ్',
  'nav.following': 'ఫాలో',
  'nav.archive': 'ఆర్కైవ్',
  'nav.sources': 'మా వనరులు',
  'nav.about': 'ఇది ఎలా పనిచేస్తుంది',
  'nav.signin': 'సైన్ ఇన్',
  'nav.settings': 'సెట్టింగ్‌లు',
  'nav.menu': 'ప్రధాన మెనూ',

  'welcome.title': 'ప్రతి వార్త, అన్ని వెర్షన్లు, మీకు వీలైన సమయంలో',
  'welcome.intro': 'మీ రాష్ట్రాన్ని ఎంచుకోండి. అంతర్జాతీయ, జాతీయ వార్తలు అందరికీ ఒకటే: ప్రతి పబ్లిక్ వనరు మార్చకుండా, ప్రతి అసలు కథనానికి లింక్‌తో.',
  'welcome.signin': 'ఇప్పటికే ఖాతా ఉందా? సైన్ ఇన్ చేయండి',

  'prefs.topics': 'అంశాలు',
  'prefs.places': 'మీ రాష్ట్రం',
  'prefs.state': 'రాష్ట్రం',
  'prefs.chooseState': 'మీ రాష్ట్రాన్ని ఎంచుకోండి',
  'feed.chooseState': 'మీ రాష్ట్ర వార్తలు చూడటానికి రాష్ట్రాన్ని ఎంచుకోండి. ఎప్పుడైనా మార్చుకోవచ్చు.',
  'prefs.statePilot': 'ప్రతి రాష్ట్రానికి ఒకే విధానం: ఆ రాష్ట్ర సొంత వార్తా సంస్థలు (దాని భాషల్లో, ఇంగ్లీష్‌లో), జాతీయ సంస్థలు దాని గురించి ఇచ్చిన వార్తలు. ఎప్పుడైనా రాష్ట్రం మార్చుకోవచ్చు.',
  'prefs.hideCrime': 'నేరాలు, ప్రమాదాల వార్తలు దాచు',
  'prefs.hideCrimeHint': 'ఇది మీ ఎంపిక మాత్రమే. మేము మా అంతట మేము ఏదీ దాచం.',
  'prefs.save': 'నా వార్తలు చూపించు',
  'prefs.saveSettings': 'సేవ్ చేయి',
  'prefs.saved': 'సేవ్ అయింది',

  'feed.title': 'మీ వార్తలు',
  'feed.since': 'మీరు చివరిసారి చూసిన {time} నుంచి',
  'feed.firstVisit': 'గత 7 రోజులు',
  'feed.tabInternational': 'అంతర్జాతీయం',
  'feed.tabNational': 'జాతీయం',
  'feed.tabsLabel': 'ప్రాంతం',
  'feed.order': 'క్రమం',
  'feed.orderNote': 'క్రమం యాంత్రికం, మీరు మార్చుకోవచ్చు. మేము వనరులకు ర్యాంకులు, రేటింగ్‌లు ఇవ్వం.',
  'feed.sources': '{n} వనరులు',
  'feed.source1': 'ఇప్పటివరకు 1 వనరు',
  'feed.reports': '{n} కథనాలు',
  'feed.new': 'కొత్తది',
  'feed.empty': 'మీ ఎంపికలకు ఇక్కడ ఇంకా వార్తలు లేవు.',
  'feed.more': 'మరిన్ని చూపించు',
  'feed.firstBy': 'మొదట ప్రచురించింది: {source}',
  'feed.demo': 'మీరు నమూనా వార్తలు చూస్తున్నారు. లైవ్ వార్తల కోసం Supabase కనెక్ట్ చేయండి (docs/SETUP.md చూడండి).',
  'feed.edit': 'నా ఎంపికలు మార్చు',

  'sort.sources': 'ఎక్కువ వనరులు ముందు',
  'sort.latest': 'తాజావి ముందు',
  'sort.random': 'యాదృచ్ఛికంగా',
  'sort.earliest': 'ముందుగా వచ్చినవి ముందు',
  'sort.source': 'వనరు పేరు వరుసలో',

  'story.back': 'ఫీడ్‌కు వెనక్కి',
  'story.count': '{s} వనరుల నుంచి {n} కథనాలు',
  'story.follow': 'ఈ వార్తను ఫాలో చేయి',
  'story.following': 'ఫాలో అవుతున్నారు',
  'story.unfollow': 'ఫాలో ఆపు',
  'story.signInToFollow': 'ఫాలో చేయడానికి సైన్ ఇన్ చేయండి',
  'story.filterType': 'వనరు రకం',
  'story.filterLanguage': 'భాష',
  'story.all': 'అన్నీ',
  'story.sort': 'క్రమం',
  'story.orderNote': 'మేము వనరులకు ర్యాంకులు, రేటింగ్‌లు ఇవ్వం. మీరు మార్చకపోతే సమయం ప్రకారం క్రమం.',
  'story.read': '{source}లో చదవండి',
  'story.watch': '{source}లో చూడండి',
  'story.ownTranslator': '{language}లో తెరుచుకుంటుంది. మీ భాషలో చదవడానికి మీ ఫోన్ అనువాదకాన్ని వాడండి (Google Translate, లేదా iPhoneలో Safari అనువాదం).',
  'tr.from': '{language} నుంచి అనువాదం',
  'tr.showOriginal': 'Google అనువాదం · అసలు శీర్షిక చూపించు ({language})',
  'story.pictureBy': 'చిత్రం: {source}',
  'story.compare': 'పోల్చు',
  'story.compareN': 'పక్కపక్కన పోల్చండి ({n})',
  'story.compareHint': 'పోల్చడానికి 2 లేదా 3 కథనాలు ఎంచుకోండి.',
  'story.compareMax': 'ఒకేసారి గరిష్ఠంగా 3 పోల్చవచ్చు.',
  'story.wire': 'మరో {n} కథనాల్లోనూ ఇదే వార్తా సంస్థ పాఠం',
  'story.updated': 'వనరు శీర్షిక మార్చింది, {time}',
  'story.moreComing': 'మరిన్ని సంస్థలు ప్రచురించినప్పుడు కొత్త వెర్షన్లు ఇక్కడ కనిపిస్తాయి. మీ అప్‌డేట్‌లో చూడాలంటే ఫాలో చేయండి.',
  'story.gone': 'ఈ వార్త ఇప్పుడు అందుబాటులో లేదు. వార్తలను 30 రోజులు మాత్రమే ఉంచుతాం.',
  'story.noneMatch': 'ఈ ఫిల్టర్లకు సరిపోయే కథనాలు లేవు.',
  'story.firstBy': 'మొదట ప్రచురించింది: {source}, {time}',

  'ai.ask': 'మీ AIని అడగండి',
  'ai.openWith': 'దీనితో తెరవండి',
  'ai.note': 'మీరు ఎంచుకున్న అసిస్టెంట్‌లో లింక్ మాత్రమే తెరుస్తాం. మేము ఎలాంటి ప్రశ్న లేదా ప్రాంప్ట్ జోడించం.',
  'ai.copied': 'లింక్ కాపీ అయింది. {name}లో పేస్ట్ చేయండి.',
  'ai.other': 'లింక్ మాత్రమే కాపీ చేయి',

  'compare.title': 'పక్కపక్కన',
  'compare.intro': 'ప్రతి వనరు ప్రచురించినట్లుగానే.',
  'compare.headline': 'శీర్షిక',
  'compare.snippet': 'మొదటి వాక్యాలు',
  'compare.original': 'అసలు కథనం చదవండి',
  'compare.askAll': 'వీటి గురించి మీ AIని అడగండి',
  'compare.none': 'పోల్చడానికి ఒక వార్త పేజీలో 2 లేదా 3 కథనాలు ఎంచుకోండి.',
  'compare.backToStory': 'వార్తకు వెనక్కి',

  'following.title': 'మీరు ఫాలో అవుతున్న వార్తలు',
  'following.newSince': 'మీరు చివరిసారి చూసిన తర్వాత {n} కొత్తవి',
  'following.noNew': 'మీరు చివరిసారి చూసిన తర్వాత కొత్తవి లేవు',
  'following.empty': 'కొనసాగుతున్న వార్తను ఫాలో చేస్తే కొత్త కథనాలు ఇక్కడ కనిపిస్తాయి.',
  'following.signIn': 'వార్తలను ఫాలో చేయడానికి సైన్ ఇన్ చేయండి.',

  'archive.title': 'ఆర్కైవ్',
  'archive.intro': '8 నుంచి 30 రోజుల క్రితం వార్తలు. 30 రోజుల తర్వాత తొలగిస్తాం.',
  'archive.search': 'శీర్షికల్లో వెతకండి',
  'archive.searchButton': 'వెతుకు',
  'archive.empty': 'ఏమీ దొరకలేదు.',

  'sources.title': 'మా వనరులు',
  'sources.intro': 'మేము వార్తలు సేకరించే ప్రతి సంస్థ. వనరుల ఎంపిక కూడా ఒక నిర్ణయమే, అందుకే పూర్తి జాబితా పబ్లిక్‌గా ఉంచాం. ఎవరైనా కొత్తవి సూచించవచ్చు.',
  'sources.policy': 'క్రమం తప్పకుండా వార్తలు ప్రచురించే, గుర్తించగలిగే, ద్వేషం లేదా వేధింపులకే అంకితం కాని వనరును చేర్చుతాం. ప్రతి వనరుకు ఇదే నియమం.',
  'sources.count': '{n} వనరులు',
  'status.live': 'సేకరిస్తున్నాం',
  'status.to_check': 'పరిశీలనలో ఉంది',
  'status.broken': 'ఫీడ్ పనిచేయడం లేదు',
  'status.no_feed': 'పబ్లిక్ ఫీడ్ ఇంకా లేదు',
  'layer.national': 'జాతీయ',
  'layer.state': 'రాష్ట్రం',
  'layer.international': 'అంతర్జాతీయం',

  'suggest.title': 'ఒక వనరును సూచించండి',
  'suggest.name': 'సంస్థ లేదా పేజీ పేరు',
  'suggest.url': 'వెబ్‌సైట్ (ఐచ్ఛికం)',
  'suggest.note': 'మాకు తెలియాల్సినది ఏదైనా (ఐచ్ఛికం)',
  'suggest.send': 'సూచన పంపండి',
  'suggest.thanks': 'ధన్యవాదాలు. ప్రతి సూచనను ప్రచురించిన వనరుల నియమం ప్రకారం పరిశీలిస్తాం.',
  'suggest.signIn': 'వనరును సూచించడానికి సైన్ ఇన్ చేయండి.',
  'suggest.error': 'పంపలేకపోయాం. పేరు సరిచూసి మళ్లీ ప్రయత్నించండి.',

  'login.title': 'సైన్ ఇన్',
  'login.intro': 'మీ ఎంపికలు సేవ్ చేసి, ఏ పరికరంలోనైనా వార్తలను ఫాలో చేయండి. చదవడానికి ఖాతా అవసరం లేదు.',
  'login.google': 'Googleతో కొనసాగండి',
  'login.error': 'సైన్ ఇన్ కాలేదు. మళ్లీ ప్రయత్నించండి.',
  'login.guest': 'ఖాతా లేకుండా కొనసాగండి',
  'login.notConfigured': 'Supabase కనెక్ట్ చేసిన తర్వాత సైన్ ఇన్ పనిచేస్తుంది (docs/SETUP.md చూడండి).',

  'settings.title': 'సెట్టింగ్‌లు',
  'settings.reading': 'మీకు కనిపించేవి',
  'settings.app': 'యాప్',
  'settings.ui': 'యాప్ భాష',
  'settings.ai': 'డిఫాల్ట్ AI అసిస్టెంట్',
  'settings.account': 'ఖాతా',
  'settings.signedInAs': '{email}గా సైన్ ఇన్ అయ్యారు',
  'settings.guest': 'మీరు సైన్ ఇన్ కాలేదు. మీ ఎంపికలు ఈ పరికరంలో మాత్రమే సేవ్ అవుతాయి.',
  'settings.signOut': 'సైన్ అవుట్',
  'settings.delete': 'నా ఖాతా తొలగించు',
  'settings.deleteConfirm': 'ఇది మీ ఖాతా, ఎంపికలు, ఫాలోలను శాశ్వతంగా తొలగిస్తుంది. నిర్ధారించడానికి DELETE అని టైప్ చేయండి.',
  'settings.deleteButton': 'ఖాతా తొలగించు',
  'settings.inactive': '12 నెలలు ఉపయోగించని ఖాతాలు ఆటోమేటిక్‌గా తొలగించబడతాయి. యాప్ ఎప్పుడూ ఈమెయిల్ పంపదు.',

  'group.newspaper': 'వార్తాపత్రిక',
  'group.tv': 'టీవీ',
  'group.digital': 'డిజిటల్',
  'group.community': 'కమ్యూనిటీ',
  'group.government': 'ప్రభుత్వం',
  'group.international': 'అంతర్జాతీయ',
  'group.video': 'వీడియో',

  'footer.rule': 'మేము వనరులకు ర్యాంకులు, రేటింగ్‌లు ఇవ్వం, వాటి మాటలు మార్చం.',
  'footer.about': 'ఇది ఎలా పనిచేస్తుంది',
  'footer.sources': 'మా వనరులు',
  'footer.grievance': 'ఫిర్యాదులు, తొలగింపు అభ్యర్థనలు',
  'footer.privacy': 'గోప్యత',
  'footer.terms': 'నిబంధనలు',

  'notFound.title': 'పేజీ కనిపించలేదు',
  'notFound.back': 'మీ ఫీడ్‌కు వెళ్లండి',
  'error.title': 'ఏదో తప్పు జరిగింది',
  'error.retry': 'మళ్లీ ప్రయత్నించండి',
  'common.loading': 'లోడ్ అవుతోంది…',
  'common.close': 'మూసివేయి',
};

const DICTS: Record<Lang, Record<Key, string>> = { en, te, hi, ta, kn, ml, mr, bn, gu, pa, or, ur };

export function t(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICTS[lang]?.[key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function isLang(x: unknown): x is Lang {
  return UI_LANGUAGES.some((l) => l.code === x);
}

export const LOCALE = Object.fromEntries(UI_LANGUAGES.map((l) => [l.code, l.locale])) as Record<Lang, string>;

export const isRtl = (lang: Lang) => UI_LANGUAGES.some((l) => l.code === lang && l.rtl);

/** "29 Sep, 8:45 pm" in India time, in the interface language. */
export function formatTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatDay(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(d);
}
