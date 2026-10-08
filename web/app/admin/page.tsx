import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AdminAccountActions from '@/components/AdminAccountActions';
import { findAccounts, getAdminPeople, getAdminRole, getAdminStats, type Account, type Count } from '@/lib/admin';
import { languageName, placeName } from '@/lib/catalog';
import { getViewer } from '@/lib/data';

// Admins only, and never indexed. Not translated: it is a tool for the team, not a reader page.
export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

const RANGES = [7, 30, 90];
const PAGE_NAMES: Record<string, string> = {
  feed: 'Feed', story: 'Story pages', compare: 'Compare', watch: 'Watch', search: 'Search', archive: 'Archive',
  following: 'Following', sources: 'Our sources', settings: 'Settings', about: 'About', login: 'Sign in',
  welcome: 'Welcome', other: 'Other pages',
};
const PLATFORM_NAMES: Record<string, string> = { web: 'Website in a browser', app: 'Installed app' };
const DEVICE_NAMES: Record<string, string> = { phone: 'Phone', tablet: 'Tablet', laptop: 'Laptop / desktop' };

const num = (n: number) => n.toLocaleString('en-IN');
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const date = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** A ranked list with one bar per row, the number written beside it (one series, so no legend). */
function Bars({ rows, label }: { rows: { name: string; n: number }[]; label: (name: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (!rows.length) return <p className="small muted">Nothing counted yet.</p>;
  return (
    <ul className="admin-bars">
      {rows.map((r) => (
        <li key={r.name} title={`${label(r.name)}: ${num(r.n)} (${total ? Math.round((100 * r.n) / total) : 0}%)`}>
          <span className="admin-bar-name">{label(r.name)}</span>
          <span className="admin-bar-track"><span className="admin-bar" style={{ width: `${(100 * r.n) / max}%` }} /></span>
          <span className="admin-bar-n">{num(r.n)}</span>
        </li>
      ))}
    </ul>
  );
}

function Tile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="admin-tile">
      <span className="small muted">{label}</span>
      <strong>{num(value)}</strong>
      {note && <span className="small muted">{note}</span>}
    </div>
  );
}

function People({ rows, viewerRole, selfId }: { rows: Account[]; viewerRole: 'super' | 'admin'; selfId: string }) {
  return (
    <ul className="admin-people">
      {rows.map((a) => (
        <li key={a.user_id}>
          <div className="stack" style={{ gap: 2, minWidth: 0 }}>
            <strong className="admin-email">{a.display_name ?? a.email ?? a.user_id}</strong>
            {a.display_name && a.email && <span className="small muted admin-email">{a.email}</span>}
            <span className="small muted">
              {a.role === 'super' ? 'Super admin' : a.role === 'admin' ? 'Admin' : 'Reader'}
              {a.restricted ? ` · Restricted${a.reason ? `: ${a.reason}` : ''}` : ''}
              {a.created_at ? ` · joined ${date(a.created_at)}` : ''}
              {a.last_sign_in_at ? ` · last sign-in ${date(a.last_sign_in_at)}` : ''}
            </span>
          </div>
          <AdminAccountActions account={a} viewerRole={viewerRole} selfId={selfId} />
        </li>
      ))}
    </ul>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  if (!viewer.user) redirect('/login?next=/admin');
  const role = await getAdminRole();
  if (!role) notFound();   // to everyone else the page does not exist

  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const [stats, people, found] = await Promise.all([getAdminStats(days), getAdminPeople(), findAccounts(q)]);
  if (!stats) notFound();

  const perDay = stats.by_day.map((d) => ({ ...d, total: d.web + d.app }));
  const peak = Math.max(0, ...perDay.map((d) => d.total));
  const maxDay = Math.max(1, peak);
  const pageName = (x: string) => PAGE_NAMES[x] ?? x;
  const href = (n: number) => (q ? `/admin?days=${n}&q=${encodeURIComponent(q)}` : `/admin?days=${n}`);

  return (
    <div className="stack-lg admin">
      <div className="spread">
        <div className="stack" style={{ gap: 2 }}>
          <h1>Admin</h1>
          <p className="small muted">Signed in as {viewer.user.email} · {role === 'super' ? 'Super admin' : 'Admin'}</p>
        </div>
        <nav className="row" aria-label="Period">
          {RANGES.map((n) => (
            <Link key={n} href={href(n)} className="chip soft" aria-pressed={n === days ? 'true' : 'false'}>Last {n} days</Link>
          ))}
        </nav>
      </div>

      <section className="admin-tiles" aria-label="Totals">
        <Tile label={`Visits, last ${days} days`} value={stats.views} note="page views, counted without any visitor id" />
        <Tile label="Accounts" value={stats.accounts} />
        <Tile label={`New accounts, ${days} days`} value={stats.signups} />
        <Tile label={`Accounts deleted, ${days} days`} value={stats.deleted} />
        <Tile label="Active accounts, 7 days" value={stats.active_7d} />
        <Tile label="Restricted accounts" value={stats.restricted} />
      </section>

      <section className="panel stack" aria-labelledby="visits-title">
        <h2 id="visits-title">Visits per day</h2>
        <div className="admin-days" role="img" aria-label={`Visits per day over the last ${days} days`}>
          {perDay.map((d) => (
            <span key={d.day} className="admin-day" title={`${day(d.day)}: ${num(d.total)} visits (website ${num(d.web)}, app ${num(d.app)})`}>
              <span className="admin-day-bar" style={{ height: `${(100 * d.total) / maxDay}%` }} />
            </span>
          ))}
        </div>
        <div className="spread small muted">
          <span>{perDay.length ? day(perDay[0].day) : ''}</span>
          <span>Busiest day: {num(peak)} visits</span>
          <span>{perDay.length ? day(perDay[perDay.length - 1].day) : ''}</span>
        </div>
      </section>

      <div className="admin-grid">
        <section className="panel stack" aria-labelledby="platform-title">
          <h2 id="platform-title">Website or app</h2>
          <Bars rows={stats.by_platform} label={(x) => PLATFORM_NAMES[x] ?? x} />
        </section>
        <section className="panel stack" aria-labelledby="device-title">
          <h2 id="device-title">Device</h2>
          <Bars rows={stats.by_device} label={(x) => DEVICE_NAMES[x] ?? x} />
        </section>
        <section className="panel stack" aria-labelledby="pages-title">
          <h2 id="pages-title">Pages visited</h2>
          <Bars rows={stats.by_page} label={pageName} />
        </section>
        <section className="panel stack" aria-labelledby="lang-title">
          <h2 id="lang-title">App language of visits</h2>
          <Bars rows={stats.by_lang} label={(x) => languageName(x)} />
        </section>
        <section className="panel stack" aria-labelledby="alang-title">
          <h2 id="alang-title">Accounts by app language</h2>
          <Bars rows={stats.account_langs as Count[]} label={(x) => languageName(x)} />
        </section>
        <section className="panel stack" aria-labelledby="state-title">
          <h2 id="state-title">Accounts by state</h2>
          <Bars rows={stats.account_states} label={(x) => placeName(x, 'en')} />
        </section>
      </div>

      <section className="panel stack" aria-labelledby="accounts-title">
        <h2 id="accounts-title">Accounts made and deleted</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Day</th><th>New</th><th>Deleted</th><th>Visits</th></tr></thead>
            <tbody>
              {[...perDay].reverse().filter((d) => d.total || d.signup || d.deleted).map((d) => (
                <tr key={d.day}><td>{day(d.day)}</td><td>{num(d.signup)}</td><td>{num(d.deleted)}</td><td>{num(d.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel stack" aria-labelledby="followed-title">
        <h2 id="followed-title">Most followed stories, last {days} days</h2>
        <p className="small muted">For the team only. It never changes what readers see (rule 4: no hidden ranking).</p>
        {stats.most_followed.length ? (
          <ol className="admin-followed">
            {stats.most_followed.map((s) => (
              <li key={s.id}><Link href={`/story/${s.id}`}>{s.label}</Link> <span className="small muted">· {num(s.n)} follows</span></li>
            ))}
          </ol>
        ) : <p className="small muted">No follows in this period.</p>}
      </section>

      <section className="panel stack" aria-labelledby="people-title">
        <h2 id="people-title">Admins and restricted accounts</h2>
        <p className="small muted">
          {role === 'super'
            ? 'You can make any account an admin, or remove an admin. Admins see this page and can restrict accounts.'
            : 'Only the super admin can make or remove admins.'}
          {' '}A restricted account can still read the news like any guest, but cannot follow stories, save settings or suggest sources.
        </p>
        <People rows={people} viewerRole={role} selfId={viewer.user.id} />
      </section>

      <section className="panel stack" aria-labelledby="find-title">
        <h2 id="find-title">Find an account</h2>
        <form className="row" action="/admin" method="get">
          <input type="hidden" name="days" value={days} />
          <input name="q" type="search" defaultValue={q} minLength={2} placeholder="Part of a name or email address" aria-label="Name or email" style={{ flex: 1, minWidth: 200 }} />
          <button className="btn btn-primary btn-small" type="submit">Find</button>
        </form>
        {q && (found.length ? <People rows={found} viewerRole={role} selfId={viewer.user.id} />
          : <p className="small muted">No account matches “{q}”.</p>)}
      </section>
    </div>
  );
}
