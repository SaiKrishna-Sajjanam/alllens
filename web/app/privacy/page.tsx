import LegalNote from '@/components/LegalNote';
import { CONTACT_EMAIL, GRIEVANCE_EMAIL } from '@/lib/env';

export const metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <article className="prose">
      <h1>Privacy</h1>
      <LegalNote />
      <p>You can read everything on All-Lens without an account. An account only saves your choices across devices.</p>
      <h2>What we store</h2>
      <ul>
        <li><strong>Without an account:</strong> your choices and the time of your last visit, in a cookie on your device.</li>
        <li><strong>With an account:</strong> your email address or mobile number (for sign-in), your choices (topics, places, languages, kinds of sources, reminder time, app language, preferred AI assistant), the stories you follow, source suggestions you send, and when you last visited.</li>
        <li><strong>We do not store</strong> which articles you open, your location, or anything you ask an AI assistant. &ldquo;Ask your AI&rdquo; opens the assistant you choose directly; what you do there is between you and that service.</li>
      </ul>
      <h2>What we never do</h2>
      <ul>
        <li>We never sell or share your reading choices.</li>
        <li>No advertising trackers.</li>
        <li>No ranking or recommendation based on you beyond the choices you set.</li>
      </ul>
      <h2>How long we keep it</h2>
      <ul>
        <li>Your data stays while you use the service. Accounts unused for 12 months get an email warning and are deleted 30 days later if still unused.</li>
        <li>You can delete your account at any time in Settings. Deletion is immediate and removes your choices and follows.</li>
      </ul>
      <h2>Your rights</h2>
      <p>
        Under India&rsquo;s Digital Personal Data Protection Act you can ask to see, correct or erase your data, and
        raise a grievance. Write to <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>. Other questions:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <h2>Services we use</h2>
      <ul>
        <li>Supabase (database and sign-in), Vercel (website hosting), GitHub (scheduled collection), and an email provider for the daily reminder.</li>
        <li>Pictures and video thumbnails are loaded directly from each outlet&rsquo;s own site (or YouTube), so those sites can see your IP address when you view them, as when you visit them. We send them no information about you. &ldquo;Translate&rdquo; opens Google Translate with the article link only.</li>
      </ul>
    </article>
  );
}
