import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function TermsPage() {
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
          <Badge variant="primary" size="sm">Legal</Badge>
          <span className="text-xs text-slate-400">Last updated: November 2026</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Terms of Service
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Please read these Terms carefully before using the RoomieMatch student platform.
        </p>
      </div>

      {/* Main Content */}
      <Card className="p-6 sm:p-8 space-y-6 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or registering for RoomieMatch (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to all terms and conditions, you must not access or use the Service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">2. Student Eligibility & Campus Email Requirement</h2>
          <p>
            RoomieMatch is strictly restricted to currently enrolled university, college, or higher-education students. To maintain community safety:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>You must register using an official institutional email address (e.g., <code>.ac.in</code>, <code>.edu</code>). Public email providers are barred.</li>
            <li>You must verify your email via the one-time verification code (OTP).</li>
            <li>You agree to provide truthful, accurate, and up-to-date profile information regarding your lifestyle, habits, and housing preferences.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">3. Platform Purpose & Scope</h2>
          <p>
            RoomieMatch is an algorithmic and AI-assisted roommate discovery and communication platform. <strong>RoomieMatch is not a real estate broker, landlord, or property management agency.</strong> We do not lease apartments, execute tenancy agreements, or handle financial rent transactions. Students are solely responsible for inspecting properties and signing independent leases.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">4. Community Guidelines & Safety</h2>
          <p>
            Users must treat peers with dignity, respect, and courtesy. You agree NOT to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Harass, intimidate, stalk, threaten, or demean any student or platform moderator.</li>
            <li>Post fraudulent, misleading, offensive, defamatory, or unlawful content.</li>
            <li>Attempt to solicit commercial services, spam, or advertise unauthorized products.</li>
            <li>Evade user blocks or suspension penalties by creating duplicate accounts.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">5. Mutual Consent & Contact Sharing</h2>
          <p>
            Your email address and phone number are hidden by default from discovery feeds and candidate profiles. Contact details are only shared when both you and your matched roommate mutually confirm contact sharing inside your conversation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">6. Account Termination & Right to Deletion</h2>
          <p>
            You may deactivate and delete your account at any time via your <Link to="/settings" className="text-teal-700 font-semibold underline">Account Settings</Link>. Deletion anonymizes your personal information, removes your profile and requirements, redacts sent message content, and permanently deactivates your login.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">7. Limitation of Liability</h2>
          <p>
            RoomieMatch provides algorithmic suggestions for informational purposes only. We cannot guarantee roommate compatibility or housing availability. RoomieMatch shall not be liable for disputes, property loss, or damages arising between roommates.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Questions or Concerns?</h2>
          <p className="text-xs text-slate-500">
            For questions regarding these draft Terms of Service, please reach out to your university student housing coordinator or contact our campus safety desk at <span className="font-mono text-slate-700">support@roomiematch.edu</span>.
          </p>
        </section>
      </Card>
    </div>
  );
}

