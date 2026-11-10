import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Draft Notice Banner */}
      <div
        role="alert"
        className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs"
      >
        <span className="text-xl shrink-0" aria-hidden="true">⚠️</span>
        <div className="text-xs sm:text-sm space-y-1">
          <p className="font-bold uppercase tracking-wider text-amber-800">
            Legal Disclaimer & Draft Notice
          </p>
          <p className="text-amber-700 leading-relaxed">
            This document is a placeholder template provided for developmental reference. It is strictly marked as a <strong>DRAFT</strong> to be reviewed, customized, and approved by the platform owner and qualified legal counsel before production launch.
          </p>
        </div>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="primary" size="sm">Privacy</Badge>
          <span className="text-xs text-slate-400">Last updated: November 2026</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          How RoomieMatch collects, protects, and handles your personal information.
        </p>
      </div>

      {/* Main Content */}
      <Card className="p-6 sm:p-8 space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. Our Core Privacy Commitment</h2>
          <p>
            At RoomieMatch, student privacy and safety are paramount. We follow a strict principle of <strong>minimum data exposure</strong>. Your email address, phone number, and exact housing address are never visible on public pages or search engine listings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Account Credentials:</strong> Institutional email address, verified OTP verification status, and salted bcrypt password hashes.</li>
            <li><strong>Student Profile:</strong> Display name, college/university name, major, graduation year, age, gender, and living habits (sleep schedule, cleanliness scale 1-5, study preferences, smoking/drinking, food choices).</li>
            <li><strong>Housing Requirements:</strong> Target city, monthly budget ranges, room type preferences, and criteria importance weights.</li>
            <li><strong>Communications & Interactions:</strong> Direct chat messages sent to matched roommates, like/skip interaction states, blocks, and moderation reports.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. How Your Information Is Used</h2>
          <p>
            We process your information exclusively to provide the core roommate matching service:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Deterministic Matching:</strong> Computing weighted compatibility scores across lifestyle dimensions to suggest suitable peers.</li>
            <li><strong>AI Compatibility Insights:</strong> Generating qualitative &quot;Why you match&quot; summaries, pros, and conversation icebreakers using anonymized, PII-free inputs.</li>
            <li><strong>Direct Messaging:</strong> Enabling real-time socket chats between matched students.</li>
            <li><strong>Safety & Moderation:</strong> Enforcing user blocks, investigating incident reports, and protecting the student community from bad actors.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. Mutual Consent Contact Protection</h2>
          <p>
            We never share your telephone number or direct email with other users without your explicit, opt-in consent. Contact information is only revealed within a private conversation when <strong>both</strong> participants click &quot;Share my contact&quot; and confirm mutual agreement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">5. Data Retention & Anonymization (Right to Be Forgotten)</h2>
          <p>
            You have full control over your data. When you delete your account from <Link to="/settings" className="text-teal-700 font-semibold underline">Settings</Link>:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Your student profile, housing requirements, and match results are permanently deleted.</li>
            <li>Sent messages in conversations are permanently redacted and replaced with <code>[deleted]</code>.</li>
            <li>Your email address is replaced with a randomized anonymous identifier.</li>
            <li>Your account status is marked deactivated, cutting all access and socket connections.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">6. Security Measures</h2>
          <p>
            We employ modern industry security practices: HTTP-only Secure JWT cookies, Helmet HTTP headers, CORS restricted to our official frontend domain, IP rate-limiting on sensitive endpoints, and database encryption in transit.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Privacy Inquiries</h2>
          <p className="text-xs text-slate-500">
            If you have questions about our data practices or wish to submit an inquiry, please contact our data safety desk at <span className="font-mono text-slate-700">privacy@roomiematch.edu</span>.
          </p>
        </section>
      </Card>
    </div>
  );
}

