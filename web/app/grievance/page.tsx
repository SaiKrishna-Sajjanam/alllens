import LegalNote from '@/components/LegalNote';
import { CONTACT_EMAIL, GRIEVANCE_EMAIL, GRIEVANCE_OFFICER } from '@/lib/env';

export const metadata = { title: 'Grievances and takedowns' };

export default function GrievancePage() {
  return (
    <article className="prose">
      <h1>Grievances and takedown requests</h1>
      <LegalNote />
      <p>
        Vuaz shows headlines, short opening text and links that news outlets and public communities publish in
        their own feeds. We do not write, edit or host full articles. If something shown here is unlawful, infringes
        your rights, or you are a publisher who wants your outlet removed, contact our Grievance Officer.
      </p>
      <h2>Grievance Officer</h2>
      <ul>
        <li>Name: {GRIEVANCE_OFFICER}</li>
        <li>Email: <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a></li>
        <li>General contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
      </ul>
      <h2>What to include</h2>
      <ul>
        <li>The link to the story page on Vuaz and the specific item (outlet and headline).</li>
        <li>Why you believe it should be removed, and your relationship to it (for example, the publisher or the person concerned).</li>
        <li>Your name and a way to contact you.</li>
      </ul>
      <h2>What happens next</h2>
      <ul>
        <li>We acknowledge every complaint within 24 hours and aim to resolve it within 15 days, or sooner where the law requires.</li>
        <li>Content is removed when it is unlawful, on a valid order, or at a publisher&rsquo;s request for their own outlet.</li>
        <li>Every removal is recorded in a public log (outlet, date and reason, without repeating the content).</li>
        <li>Because we only link to the original, the outlet itself remains responsible for its article.</li>
      </ul>
    </article>
  );
}
