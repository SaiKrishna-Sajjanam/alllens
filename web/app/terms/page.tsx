import Link from 'next/link';
import LegalNote from '@/components/LegalNote';

export const metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <article className="prose">
      <h1>Terms of use</h1>
      <LegalNote />
      <ol>
        <li>Vuaz groups and links to news that others publish. Each headline, snippet and article belongs to its publisher; follow the link to read the original on their site.</li>
        <li>We do not verify, endorse or rate any report. Comparing versions is the point: please read critically.</li>
        <li>Do not use the service to harass anyone, to scrape it at scale, or to break the law.</li>
        <li>Paywalled articles are listed like any other; reading them may require the publisher&rsquo;s subscription.</li>
        <li>&ldquo;Ask your AI&rdquo; opens a third-party assistant you choose. Their terms apply there.</li>
        <li>To report a problem or request removal, see <Link href="/grievance">Grievances and takedowns</Link>.</li>
        <li>We may change these terms; the date of the latest change will be shown here: [DATE].</li>
      </ol>
    </article>
  );
}
