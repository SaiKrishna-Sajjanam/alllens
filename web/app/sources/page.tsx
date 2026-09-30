import SuggestForm from '@/components/SuggestForm';
import { groupsOf, languageName } from '@/lib/catalog';
import { getSources, getViewer } from '@/lib/data';
import { t } from '@/lib/i18n';

export const metadata = { title: 'Our sources' };

const LAYERS = ['international', 'national', 'state', 'local'] as const;
const STATUSES = ['live', 'to_check', 'broken', 'no_feed'] as const;
const statusOf = (s: string | null) => STATUSES.find((x) => x === s) ?? 'to_check';

export default async function SourcesPage() {
  const [viewer, sources] = await Promise.all([getViewer(), getSources()]);
  const lang = viewer.prefs.uiLanguage;
  return (
    <div className="stack-lg">
      <div className="stack narrow" style={{ margin: 0 }}>
        <h1>{t(lang, 'sources.title')}</h1>
        <p>{t(lang, 'sources.intro')}</p>
        <p className="small muted">{t(lang, 'sources.policy')}</p>
        <p className="small"><strong>{t(lang, 'sources.count', { n: sources.length })}</strong></p>
      </div>
      {LAYERS.map((layer) => {
        const list = sources.filter((s) => s.layer === layer);
        if (!list.length) return null;
        return (
          <section key={layer} className="panel stack" aria-labelledby={`layer-${layer}`}>
            <h2 id={`layer-${layer}`}>{t(lang, `layer.${layer}`)}</h2>
            <ul className="list">
              {list.map((s) => (
                <li key={s.id}>
                  <span className="stack" style={{ gap: 0 }}>
                    <strong>{s.name}</strong>
                    <span className="small muted">
                      {[...groupsOf(s.type).map((g) => t(lang, `group.${g}` as 'group.tv')), languageName(s.language), s.region]
                        .filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="tag">{t(lang, `status.${statusOf(s.status)}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section className="panel stack narrow" style={{ margin: 0 }} aria-labelledby="suggest">
        <h2 id="suggest">{t(lang, 'suggest.title')}</h2>
        <SuggestForm lang={lang} signedIn={!!viewer.user} />
      </section>
    </div>
  );
}
