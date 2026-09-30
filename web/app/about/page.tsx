import Link from 'next/link';
import { TOPICS } from '@/lib/catalog';
import { getViewer } from '@/lib/data';

export const metadata = { title: 'How it works' };

export default async function AboutPage() {
  const viewer = await getViewer();
  return viewer.prefs.uiLanguage === 'te' ? <AboutTe /> : <AboutEn />;
}

function AboutEn() {
  return (
    <article className="prose">
      <h1>How Vuaz works</h1>
      <p>
        When you hear a story from one source, you tend to believe that version. When you see many versions side by
        side, you start comparing and reading between the lines. Vuaz puts every public version of a story in one
        place so you can judge it yourself.
      </p>

      <h2>Our five rules</h2>
      <ol>
        <li><strong>No judgement.</strong> No bias labels, no reliability scores, no ratings of any source.</li>
        <li><strong>No voice of our own.</strong> No summaries, captions or commentary. &ldquo;Ask your AI&rdquo; only hands the link to an assistant you choose.</li>
        <li><strong>No changed words.</strong> Headlines and opening text appear exactly as each source published them, with a link to the original. The one exception: headlines are also shown in your app language, as Google&rsquo;s machine translation, always marked as such, with the source&rsquo;s own words one tap away.</li>
        <li><strong>No hidden ranking.</strong> Order is by time, by number of sources, or random, and you can change it.</li>
        <li><strong>Every lens included.</strong> National and local, big and small, newspapers, TV, digital outlets and public communities, in every language we can reach.</li>
      </ol>

      <h2>How a story page is made</h2>
      <ol>
        <li>Every three hours we read the public feeds listed on <Link href="/sources">Our sources</Link>.</li>
        <li>We keep only the headline, the first few lines the source itself puts in its feed (up to 280 characters), the time and the link. Never the full article. A picture the outlet attaches to its feed is shown from the outlet’s own site, credited to it; we never keep a copy.</li>
        <li>A multilingual language model turns each headline into a set of numbers describing its meaning. Reports whose numbers are very close, published within three days of each other, are grouped as one story. The model groups; it never writes anything you see.</li>
        <li>The story is shown under the <em>earliest</em> headline, credited to the source that published it; if a source wrote the story in your app language, under its headline instead.</li>
        <li>International and National news is the same for every reader, and the State tab is the same for everyone who picks that state, whatever language each source wrote in. Topic buttons narrow the page only for that visit.</li>
        <li>Headlines written in another language are shown in yours as Google&rsquo;s translation (marked &ldquo;Translated by Google&rdquo;, with the original one tap away). Only headlines are translated. Opening text stays as the source wrote it, and the links open the original article or video: use your phone&rsquo;s own translator (Google Translate, or Translate in Safari on iPhone) to read it in your language.</li>
        <li>The state a story is about, and its topics, come from fixed word lists (the same rules for every state), so the same report always gets the same tags. The topics are: {TOPICS.map((t) => t.en).join(', ')}.</li>
      </ol>

      <h2>Things we mark, mechanically</h2>
      <ul>
        <li><strong>Wire copies:</strong> when several outlets print the same agency text, we say so, so 10 listings are not mistaken for 10 independent reports.</li>
        <li><strong>Changed headlines:</strong> if a source edits its headline, we show the new words and note when it changed.</li>
      </ul>

      <h2>What we keep, and for how long</h2>
      <ul>
        <li>Your feed shows the last 7 days; the archive holds days 8 to 30.</li>
        <li>After 30 days headlines, snippets and links are deleted. Only counts remain (how many reports each outlet published per day), with no text.</li>
        <li>Your account holds only your choices and the stories you follow. We never sell reading history. See <Link href="/privacy">Privacy</Link>.</li>
      </ul>

      <h2>Choosing sources is a choice</h2>
      <p>
        So the full list is public, and anyone can suggest a missing outlet. A source is included if it publishes news
        regularly, can be identified, and is not dedicated to hate or harassment. The same rule applies to everyone.
        Unlawful content is removed on valid notice through our <Link href="/grievance">grievance process</Link>.
      </p>
    </article>
  );
}

function AboutTe() {
  return (
    <article className="prose" lang="te">
      <h1>Vuaz ఎలా పనిచేస్తుంది</h1>
      <p>
        ఒక వార్తను ఒకే వనరు నుంచి విన్నప్పుడు ఆ వెర్షన్‌నే నమ్ముతాం. అదే వార్తకు చాలా వెర్షన్లు పక్కపక్కన చూస్తే
        పోల్చి, లోతుగా ఆలోచిస్తాం. ప్రతి వార్తకు ఉన్న అన్ని పబ్లిక్ వెర్షన్లను ఒకే చోట చూపించి, మీరే నిర్ణయించుకునేలా చేయడమే Vuaz లక్ష్యం.
      </p>

      <h2>మా ఐదు నియమాలు</h2>
      <ol>
        <li><strong>తీర్పులు లేవు.</strong> ఏ వనరుకూ పక్షపాత ముద్రలు, విశ్వసనీయత స్కోర్లు, రేటింగ్‌లు ఇవ్వం.</li>
        <li><strong>మా సొంత గొంతు లేదు.</strong> సారాంశాలు, వ్యాఖ్యలు రాయం. &ldquo;మీ AIని అడగండి&rdquo; మీరు ఎంచుకున్న అసిస్టెంట్‌కు లింక్ మాత్రమే ఇస్తుంది.</li>
        <li><strong>మాటలు మార్చం.</strong> శీర్షికలు, మొదటి వాక్యాలు ప్రతి వనరు ప్రచురించినట్లుగానే, అసలు లింక్‌తో చూపిస్తాం. ఒక్క మినహాయింపు: శీర్షికలు మీ యాప్ భాషలో Google యంత్ర అనువాదంగా కూడా కనిపిస్తాయి, ఎప్పుడూ అనువాదమని గుర్తుతో, వనరు అసలు మాటలు ఒక్క ట్యాప్ దూరంలో.</li>
        <li><strong>దాచిన ర్యాంకింగ్ లేదు.</strong> క్రమం సమయం, వనరుల సంఖ్య లేదా యాదృచ్ఛికం. మీరు మార్చుకోవచ్చు.</li>
        <li><strong>అన్ని కోణాలు.</strong> జాతీయ, స్థానిక, పెద్ద, చిన్న, పత్రికలు, టీవీ, డిజిటల్, పబ్లిక్ కమ్యూనిటీలు, అందుబాటులో ఉన్న అన్ని భాషల్లో.</li>
      </ol>

      <h2>ఒక వార్త పేజీ ఎలా తయారవుతుంది</h2>
      <ol>
        <li>ప్రతి మూడు గంటలకు <Link href="/sources">మా వనరుల</Link> పబ్లిక్ ఫీడ్‌లు చదువుతాం.</li>
        <li>శీర్షిక, వనరు తన ఫీడ్‌లో ఇచ్చిన మొదటి కొన్ని వాక్యాలు (280 అక్షరాల వరకు), సమయం, లింక్ మాత్రమే ఉంచుతాం. పూర్తి కథనం ఎప్పుడూ ఉంచం. వనరు తన ఫీడ్‌లో జోడించిన చిత్రం ఆ వనరు సైట్ నుంచే, దాని పేరుతో కనిపిస్తుంది; మేము కాపీ ఉంచం.</li>
        <li>ఒక బహుభాషా మోడల్ ప్రతి శీర్షిక అర్థాన్ని సంఖ్యలుగా మారుస్తుంది. మూడు రోజుల్లోపు ప్రచురించిన, దాదాపు ఒకే అర్థం ఉన్న కథనాలను ఒకే వార్తగా కలుపుతాం. మోడల్ కలుపుతుంది మాత్రమే, మీకు కనిపించేది ఏదీ రాయదు.</li>
        <li>వార్తను <em>ముందుగా</em> ప్రచురించిన శీర్షికతో, ఆ వనరు పేరుతో చూపిస్తాం. మీ యాప్ భాషలో ఏ వనరైనా రాస్తే, ఆ శీర్షిక.</li>
        <li>అంతర్జాతీయ, జాతీయ వార్తలు ప్రతి పాఠకుడికీ ఒకటే; రాష్ట్ర ట్యాబ్ ఆ రాష్ట్రాన్ని ఎంచుకున్న అందరికీ ఒకటే, వనరు ఏ భాషలో రాసినా. అంశాల బటన్లు ఆ సందర్శనకు మాత్రమే.</li>
        <li>వేరే భాషలో ఉన్న శీర్షికలు మీ భాషలో Google అనువాదంగా కనిపిస్తాయి (&ldquo;Google అనువాదం&rdquo; అని గుర్తుతో, అసలు శీర్షిక ఒక్క ట్యాప్ దూరంలో). శీర్షికలు మాత్రమే అనువదిస్తాం. మొదటి వాక్యాలు వనరు రాసినట్లే ఉంటాయి; లింకులు అసలు కథనాన్ని లేదా వీడియోను తెరుస్తాయి: మీ భాషలో చదవడానికి మీ ఫోన్ అనువాదకాన్ని వాడండి.</li>
        <li>రాష్ట్రం, అంశాలు స్థిరమైన పదాల జాబితాల నుంచి వస్తాయి. అంశాలు: {TOPICS.map((t) => t.te).join(', ')}.</li>
      </ol>

      <h2>మేము గుర్తుపెట్టేవి</h2>
      <ul>
        <li><strong>వార్తా సంస్థ పాఠం:</strong> చాలా సంస్థలు ఒకే ఏజెన్సీ పాఠం ప్రచురిస్తే అది చెబుతాం.</li>
        <li><strong>మారిన శీర్షికలు:</strong> వనరు శీర్షిక మార్చితే కొత్త మాటలు చూపించి, ఎప్పుడు మారిందో చెబుతాం.</li>
      </ul>

      <h2>ఎంతకాలం ఉంచుతాం</h2>
      <ul>
        <li>ఫీడ్‌లో గత 7 రోజులు; ఆర్కైవ్‌లో 8 నుంచి 30 రోజులు.</li>
        <li>30 రోజుల తర్వాత శీర్షికలు, వాక్యాలు, లింకులు తొలగిస్తాం. రోజుకు ఒక్కో సంస్థ ఎన్ని కథనాలు ప్రచురించిందనే లెక్కలు మాత్రమే మిగులుతాయి.</li>
        <li>మీ ఖాతాలో మీ ఎంపికలు, ఫాలో చేసే వార్తలు మాత్రమే ఉంటాయి. మీ చదివే చరిత్రను ఎప్పుడూ అమ్మం. <Link href="/privacy">గోప్యత</Link> చూడండి.</li>
      </ul>
    </article>
  );
}
