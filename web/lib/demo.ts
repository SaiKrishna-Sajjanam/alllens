// Sample stories shown until Supabase is connected (and used by tests).
// Real public headlines and links from 29 Sep 2026 feeds; times are shifted so
// the sample always looks recent. The feed shows a banner saying it is a sample.
import type { Article, Source, Story } from './types';

const ANCHOR = Date.parse('2026-09-30T00:00:00+05:30');

export const DEMO_SOURCES: Source[] = [
  { id: 'ndtv', name: 'NDTV', layer: 'national', type: 'tv_digital', language: 'en', region: 'India', status: 'live' },
  { id: 'theprint', name: 'ThePrint', layer: 'national', type: 'digital', language: 'en', region: 'India', status: 'live' },
  { id: 'thehindu', name: 'The Hindu', layer: 'national', type: 'newspaper', language: 'en', region: 'India', status: 'to_check' },
  { id: 'ntvtelugu', name: 'NTV Telugu', layer: 'state', type: 'tv', language: 'te', region: 'Telangana', status: 'live' },
  { id: 'v6velugu', name: 'V6 Velugu', layer: 'state', type: 'tv_newspaper', language: 'te', region: 'Telangana', status: 'to_check' },
  { id: 'eenadu', name: 'Eenadu', layer: 'state', type: 'newspaper', language: 'te', region: 'Telangana', status: 'no_feed' },
  { id: 'siasat', name: 'Siasat', layer: 'local', type: 'newspaper', language: 'en', region: 'Hyderabad', status: 'to_check' },
  { id: 'reddit_hyderabad', name: 'r/hyderabad (Reddit)', layer: 'local', type: 'community', language: 'en', region: 'Hyderabad', status: 'to_check' },
];
const SRC = new Map(DEMO_SOURCES.map((s) => [s.id, s]));

interface Raw {
  story: string;
  source: string;
  lang: string;
  at: string; // IST
  title: string;
  snippet?: string;
  url: string;
}

const RAW: Raw[] = [
  { story: 'kathua', source: 'theprint', lang: 'en', at: '2026-09-29T20:10', url: 'https://theprint.in/india/4-cisf-personnel-including-officer-killed-as-colleague-opens-fire-in-jks-kathua/3057002/',
    title: '4 CISF personnel including officer killed as colleague opens fire in J&K’s Kathua',
    snippet: 'Incident took place around 6.40 pm Tuesday at the Sewa-II Hydroelectric Project unit in Kathua district, and accused has since been handed over to local police, ThePrint has learnt.' },
  { story: 'kathua', source: 'ntvtelugu', lang: 'te', at: '2026-09-29T20:45', url: 'https://ntvtelugu.com/national-news/kathua-cisf-firing-head-constable-allegedly-kills-four-colleagues-at-camp-1021092.html',
    title: 'Jammu Kashmir: CISF క్యాంపులో కలకలం..హెడ్ కానిస్టేబుల్ కాల్పుల్లో నలుగురు జవాన్లు మృతి',
    snippet: 'జమ్మూ కాశ్మీర్ కథువా జిల్లాలోని బసోలిలోని CISF క్యాంపులో సైనికుడు తన తోటి సైనికులపై కాల్పులు జరపడంతో నలుగురు సైనికులు మరణించారు. మంగళవారం జరిగిన ఈ ఘటనకు గల కారణాలు తెలియరాలేదు.…' },

  { story: 'cwc', source: 'ndtv', lang: 'en', at: '2026-09-29T14:47', url: 'https://www.ndtv.com/india-news/election-commission-mallikarjun-kharge-calls-gyanesh-kumar-bjp-puppet-lists-5-demands-at-congress-cwc-meet-12113338',
    title: "M Kharge Calls Poll Panel Chief A 'Puppet', Lists 5 Demands At Congress Meet",
    snippet: 'Kharge also demanded that an independent, time-bound probe be conducted where serious anomalies are found and that the poll process be made transparent' },
  { story: 'cwc', source: 'theprint', lang: 'en', at: '2026-09-29T19:30', url: 'https://theprint.in/politics/congress-vote-chori-modi-shah-resignation/3057023/',
    title: 'Ahead of INDIA bloc meet on SIR, Congress CWC demands Modi, Shah’s resignation for ‘match-fixing’ polls' },

  { story: 'slap', source: 'theprint', lang: 'en', at: '2026-09-27T18:00', url: 'https://theprint.in/politics/delhi-minister-parvesh-verma-loses-cool-during-road-inspection-slaps-aap-mlas-team-member/3055045/',
    title: 'Delhi minister Parvesh Verma slaps AAP MLA’s team member during road inspection' },
  { story: 'slap', source: 'ndtv', lang: 'en', at: '2026-09-29T14:21', url: 'https://www.ndtv.com/india-news/delhi-minister-parvesh-verma-aap-mla-and-row-that-began-with-handshake-and-ended-with-slap-12113413',
    title: 'Delhi Minister, AAP MLA And Row That Began With Handshake And Ended With Slap',
    snippet: 'The 22-year-old bespectacled victim, Sahib Singh, was not even the protagonist or the villain in the chain of events unfolding on Sunday afternoon in Tilak Nagar in West Delhi. But he now is a political cause celebre.' },

  { story: 'assam', source: 'ndtv', lang: 'en', at: '2026-09-29T15:31', url: 'https://www.ndtv.com/india-news/assam-rifles-jawan-killed-in-action-after-patrol-team-attacked-in-arunachal-12113937',
    title: 'Assam Rifles Jawan Killed In Action After Patrol Team Attacked In Arunachal',
    snippet: 'The attack happened at 6.30 am when soldiers of the 21 Assam Rifles were patrolling in an area where border-fencing work was going on' },
  { story: 'assam', source: 'theprint', lang: 'en', at: '2026-09-29T16:40', url: 'https://theprint.in/india/assam-rifles-jawan-killed-4-injured-in-suspected-militant-attack-along-arunachal-pradeshs-myanmar-border/3056999/',
    title: 'Assam Rifles jawan killed, 4 injured in suspected militant attack along Arunachal Pradesh’s Myanmar border' },

  { story: 'tgsir', source: 'ndtv', lang: 'en', at: '2026-09-29T14:12', url: 'https://www.ndtv.com/india-news/nearly-47-lakh-risk-exclusion-from-telangana-list-as-special-intensive-revision-hearings-continue-12113658',
    title: 'Nearly 47 Lakh Risk Exclusion From Telangana List As SIR Hearings Continue',
    snippet: 'The draft-roll exercise initially placed 73,39,235 electors, or 21.70% of the electorate, in the Absent, Shifted, Dead or Duplicate (ASDD) category.' },

  { story: 'cmtour', source: 'ntvtelugu', lang: 'te', at: '2026-09-29T20:14', url: 'https://ntvtelugu.com/telangana-news/cm-revanth-reddy-karimnagar-sircilla-tour-september-30-1021089.html',
    title: 'CM Revanth Reddy : రేపు సీఎం రేవంత్ టూర్.. కరీంనగర్, సిరిసిల్లలో భారీ కార్యక్రమాలు',
    snippet: 'తెలంగాణ ముఖ్యమంత్రి ఏ. రేవంత్ రెడ్డి రేపు కరీంనగర్, రాజన్న సిరిసిల్ల జిల్లాల్లో పర్యటించనున్నారు. ఈ పర్యటనలో భాగంగా పలు అభివృద్ధి కార్యక్రమాల ప్రారంభోత్సవాలు, శంకుస్థాపనలతో పాటు…' },

  { story: 'khairatabad', source: 'ntvtelugu', lang: 'te', at: '2026-09-29T20:51', url: 'https://ntvtelugu.com/off-the-record/khairatabad-bypoll-congress-action-plan-danam-nagender-1021101.html',
    title: 'Khairatabad By Polls : ఉప ఎన్నికపై అధికార పార్టీ వ్యూహం ఏంటి?',
    snippet: 'ఖైరతాబాద్ ఉప ఎన్నిక విషయంలో కాంగ్రెస్‌ యాక్షన్‌ ప్లాన్‌ ఎలా ఉంది? పార్టీ అభ్యర్థి విషయంలో క్లారిటీ వచ్చేసిందా?…' },

  { story: 'alwal', source: 'ntvtelugu', lang: 'te', at: '2026-09-29T21:35', url: 'https://ntvtelugu.com/telangana-news/alwal-minor-assault-case-12-accused-test-drug-positive-1021107.html',
    title: 'Alwal Case: అల్వాల్ మైనర్ బాలిక సామూహిక లైంగిక దాడి కేసులో షాకింగ్ ట్విస్ట్..',
    snippet: 'హైదరాబాద్‌లోని అల్వాల్‌లో మైనర్ యువతిపై జరిగిన సామూహిక లైంగిక దాడి కేసు దర్యాప్తులో దిగ్భ్రాంతికర విషయాలు వెలుగులోకి వస్తున్నాయి.…' },

  { story: 'power', source: 'ntvtelugu', lang: 'te', at: '2026-09-29T18:38', url: 'https://ntvtelugu.com/telangana-news/tgspdcl-electricity-demand-record-12044-mw-1021068.html',
    title: 'TGSPDCL : విద్యుత్ డిమాండ్‌లో కొత్త రికార్డు.. 12,044 మెగావాట్లు.!',
    snippet: 'తెలంగాణ దక్షిణ విద్యుత్ పంపిణీ సంస్థ (టీజీఎస్పీడీసీఎల్) పరిధిలో విద్యుత్ డిమాండ్ ఆల్ టైమ్ గరిష్ట స్థాయికి చేరి సరికొత్త రికార్డు సృష్టించింది.…' },

  { story: 'aidriving', source: 'ntvtelugu', lang: 'te', at: '2026-09-29T17:57', url: 'https://ntvtelugu.com/telangana-news/telangana-ai-driving-tests-rta-test-tracks-modernization-1021038.html',
    title: "AI Driving Test : డ్రైవింగ్ పరీక్షల్లో 'ఏఐ' విప్లవం.. మానవ జోక్యానికి చెక్ పెడుతూ కీలక నిర్ణయం..!",
    snippet: 'రోడ్డు ప్రమాదాలను అరికట్టి రహదారి భద్రతను పెంపొందించే దిశగా తెలంగాణ రాష్ట్ర రవాణా శాఖ కీలక సంస్కరణలకు శ్రీకారం చుట్టింది.…' },

  { story: 'kohli', source: 'ntvtelugu', lang: 'te', at: '2026-09-29T18:44', url: 'https://ntvtelugu.com/news/virat-kohli-100-centuries-r-ashwin-analysis-1021066.html',
    title: 'Virat Kohli Hundred Centuries: విరాట్ కోహ్లీ 100 శతకాలు సాధిస్తాడా.. ఇదిగో సాధ్యసాధ్యాలు..' },

  { story: 'pulses', source: 'ntvtelugu', lang: 'te', at: '2026-09-29T18:23', url: 'https://ntvtelugu.com/telangana-news/telangana-pulses-cultivation-tummala-nageswara-rao-rabi-conference-1021058.html',
    title: 'Telangana Agriculture : పప్పుధాన్యాల సాగులో తెలంగాణకు రెండో స్థానం.. కేంద్రానికి కీలక ప్రతిపాదనలు' },

  { story: 'rrb', source: 'ndtv', lang: 'en', at: '2026-09-29T14:40', url: 'https://www.ndtv.com/education/rrb-ntpc-undergraduate-vacancy-2026-notification-out-for-1-688-posts-check-details-12113799',
    title: 'Railway Recruitment Board Issues Notification For 1,688 Posts, Check Details',
    snippet: 'RRB NTPC Undergraduate Vacancy 2026: The application window will open on October 15, and the deadline to apply is November 13.' },

  { story: 'revanth', source: 'theprint', lang: 'en', at: '2026-09-29T19:00', url: 'https://theprint.in/politics/ram-god-of-the-rich-shiva-for-poor-revanth-reddys-remark-sparks-backlash-bjp-seeks-apology/3057226/',
    title: '‘Ram god of the rich, Shiva for poor’—Revanth Reddy’s remark sparks backlash, BJP seeks apology',
    snippet: 'Revanth Reddy’s remark at a media conclave in Delhi has led to BJP & Congress locking horns. BJP accused him of manufacturing North-South divide for electoral advantage.' },
];

const META: Record<string, { places: string[]; topics: string[]; primary: string | null }> = {
  kathua: { places: ['jk'], topics: ['crime'], primary: 'jk' },
  cwc: { places: [], topics: ['politics'], primary: null },
  slap: { places: ['dl'], topics: ['politics'], primary: 'dl' },
  assam: { places: ['ar'], topics: ['crime'], primary: 'ar' },
  tgsir: { places: ['tg'], topics: ['politics'], primary: 'tg' },
  cmtour: { places: ['tg-karimnagar', 'tg', 'tg-rajanna-sircilla'], topics: ['politics'], primary: 'tg-karimnagar' },
  khairatabad: { places: ['tg-hyderabad', 'tg'], topics: ['politics'], primary: 'tg-hyderabad' },
  alwal: { places: ['tg-hyderabad', 'tg', 'tg-medchal-malkajgiri'], topics: ['crime'], primary: 'tg-hyderabad' },
  power: { places: ['tg'], topics: [], primary: 'tg' },
  aidriving: { places: ['tg-hyderabad', 'tg', 'tg-rangareddy', 'tg-medchal-malkajgiri'], topics: ['tech'], primary: 'tg-hyderabad' },
  kohli: { places: [], topics: ['sports'], primary: null },
  pulses: { places: ['tg'], topics: ['farming'], primary: 'tg' },
  rrb: { places: [], topics: ['education'], primary: null },
  revanth: { places: ['dl'], topics: ['politics'], primary: 'dl' },
};

function shift(ist: string, now: number): string {
  const t = Date.parse(`${ist}:00+05:30`);
  return new Date(t + (now - ANCHOR)).toISOString();
}

let idCounter = 0;
const articleId = (url: string) => `demo-${(idCounter++).toString(36)}-${url.length}`;

export function demoData(now = Date.now()): { stories: Story[]; articles: Article[] } {
  idCounter = 0;
  const articles: Article[] = RAW.map((r) => {
    const s = SRC.get(r.source)!;
    const at = shift(r.at, now);
    return {
      id: articleId(r.url),
      source_id: r.source,
      title: r.title,
      snippet: r.snippet ?? null,
      url: r.url,
      published_at: at,
      fetched_at: at,
      title_updated_at: null,
      language: r.lang,
      wire_key: null,
      primary_place: META[r.story].primary,
      story_id: `demo-${r.story}`,
      sources: { id: s.id, name: s.name, type: s.type, language: s.language, region: s.region, layer: s.layer },
    };
  });
  const byStory = new Map<string, Article[]>();
  for (const a of articles) byStory.set(a.story_id!, [...(byStory.get(a.story_id!) ?? []), a]);
  const stories: Story[] = [...byStory.entries()].map(([id, arts]) => {
    const sorted = [...arts].sort((a, b) => a.published_at!.localeCompare(b.published_at!));
    const first = sorted[0];
    const labels: Story['labels'] = {};
    for (const a of sorted) {
      if (a.language && !labels[a.language]) {
        labels[a.language] = { title: a.title, article_id: a.id, source_id: a.source_id,
          source_name: a.sources!.name, published_at: a.published_at! };
      }
    }
    const meta = META[id.replace('demo-', '')];
    return {
      id,
      label: first.title,
      label_source_id: first.source_id,
      label_language: first.language,
      labels,
      first_published_at: first.published_at,
      last_article_at: sorted[sorted.length - 1].fetched_at,
      article_count: arts.length,
      source_count: new Set(arts.map((a) => a.source_id)).size,
      languages: [...new Set(arts.map((a) => a.language!))].sort(),
      source_types: [...new Set(arts.map((a) => a.sources!.type!))].sort(),
      places: meta.places,
      primary_place: meta.primary,
      scope: meta.places.some((p) => p.startsWith('tg-')) ? 'local' : meta.places.length ? 'state' : 'national',
      topics: meta.topics,
    };
  });
  return { stories, articles };
}
