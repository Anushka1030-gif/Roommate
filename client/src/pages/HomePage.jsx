import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function HomePage() {
  const { user, isAuthenticated, isVerified } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);

  // Determine user's next logical step when authenticated
  const getNextStep = () => {
    if (!isAuthenticated) {
      return { path: '/register', label: 'Get Started with College Email' };
    }
    if (!isVerified) {
      return { path: '/verify-email', label: 'Verify Student Email &rarr;' };
    }
    if (!user?.profile_completed) {
      return { path: '/onboarding/profile', label: 'Complete Your Profile &rarr;' };
    }
    return { path: '/matches', label: 'Explore Your Top Matches &rarr;' };
  };

  const nextStep = getNextStep();

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Who can join RoomieMatch?',
      a: 'RoomieMatch is exclusively for currently enrolled college and university students. Only official institutional campus email addresses (such as .ac.in or .edu) are permitted; generic public emails like Gmail or Yahoo are strictly blocked.',
    },
    {
      q: 'How does the matching algorithm work?',
      a: 'We evaluate 9 core dimensions of student living: sleep schedule, cleanliness standards, study habits, noise tolerance, food preferences, smoking/drinking habits, guest policies, and budget alignment. Our deterministic scoring ranks compatibility and Anthropic Claude AI generates customized pros, potential friction points, and icebreakers.',
    },
    {
      q: 'Can other students see my phone number or email address?',
      a: 'No. Your phone number and email are completely confidential by default. They are never shown on match discovery cards or in chat headers. Contact details are only revealed when both you and your match mutually click "Share my contact" inside your private chat.',
    },
    {
      q: 'What happens when I find a roommate?',
      a: 'Inside your conversation, either student can propose "We became roommates". When both of you confirm, you are marked as a confirmed roommate pair, you are automatically removed from future match discovery, and the platform north-star metric is celebrated!',
    },
    {
      q: 'Is RoomieMatch free for students?',
      a: 'Yes, 100% free. There are no fees, subscriptions, or paywalls for student matching, direct chat, or roommate confirmations.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-4 sm:py-8">
      {/* 1. Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          Campus-Verified Student Housing Community
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight sm:leading-tight">
          Find a roommate who{' '}
          <span className="bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-700 bg-clip-text text-transparent">
            actually fits your lifestyle
          </span>.
        </h1>

        <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Skip awkward housemate surprises. RoomieMatch pairs university students based on sleep routines, study habits, cleanliness scale, and shared budgets.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link to={nextStep.path}>
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto shadow-md shadow-teal-700/20 px-8 py-3.5 text-base"
            >
              {nextStep.label}
            </Button>
          </Link>

          {!isAuthenticated && (
            <Link to="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-6 py-3.5 text-base">
                Log In
              </Button>
            </Link>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Campus email required &bull; 100% private contact details &bull; Zero spam
        </p>
      </section>

      {/* Logged in Quick Status Pill */}
      {isAuthenticated && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 border border-teal-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 block">
              Welcome back
            </span>
            <span className="font-semibold text-slate-900 text-sm">
              {user?.full_name || user?.email}
            </span>
            <span className="text-xs text-slate-500 block">
              {user?.profile_completed ? 'Profile complete & active' : 'Complete profile to unlock matching'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link to={nextStep.path}>
              <Button variant="primary" size="sm">
                Continue to Next Step
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. 3-Step "How It Works" Section */}
      <section aria-labelledby="how-it-works-heading" className="space-y-8 max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <Badge variant="primary" size="sm">Simple & Algorithmic</Badge>
          <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How RoomieMatch Works
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            From registration to confirmed roommates in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <Card className="p-6 space-y-4 border-slate-200 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Create your profile
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Answer 16 quick questions about your living habits: sleep schedule, cleanliness rating, study environment, and food preferences.
            </p>
          </Card>

          {/* Step 2 */}
          <Card className="p-6 space-y-4 border-slate-200 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-lg">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Tell us what you want
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Specify your target city (starting in Bhopal), monthly rent budget bounds, room type preferences, and customize what matters most to you.
            </p>
          </Card>

          {/* Step 3 */}
          <Card className="p-6 space-y-4 border-slate-200 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center font-bold text-lg">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Meet your top 3 matches
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our deterministic algorithm ranks compatibility, Claude AI generates clear pros and watch-outs, and you chat safely in 1-on-1 real-time messages.
            </p>
          </Card>
        </div>
      </section>

      {/* 3. Trust & Safety Section */}
      <section aria-labelledby="trust-safety-heading" className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-8 sm:p-12 text-white shadow-xl space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs uppercase font-bold tracking-wider text-teal-400">
            Safety First
          </span>
          <h2 id="trust-safety-heading" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Built on Student Trust and Privacy
          </h2>
          <p className="text-sm text-slate-300">
            We designed RoomieMatch around student dignity and confidentiality from the ground up.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center text-lg">
              🎓
            </div>
            <h3 className="text-base font-bold text-white">Verified College Emails</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every member verifies an institutional (.ac.in / .edu) email address. No anonymous bots or unverified public accounts.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg">
              🔒
            </div>
            <h3 className="text-base font-bold text-white">You Control Your Contact Info</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your email and phone remain strictly hidden. They are only shared when both you and your match mutually agree inside chat.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-lg">
              🛡️
            </div>
            <h3 className="text-base font-bold text-white">Zero Tolerance Moderation</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Instant blocking, incident reports reviewed by campus staff, and immediate suspension for bad actors.
            </p>
          </div>
        </div>
      </section>

      {/* 4. FAQ Section */}
      <section aria-labelledby="faq-heading" className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="primary" size="sm">FAQ</Badge>
          <h2 id="faq-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-slate-500">
            Got questions about roommate matching? We&apos;ve got answers.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <Card
              key={idx}
              className="border-slate-200 overflow-hidden cursor-pointer transition-all"
              onClick={() => toggleFaq(idx)}
            >
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <h3 className="text-sm sm:text-base font-semibold text-slate-800">
                  {faq.q}
                </h3>
                <span className="text-slate-400 text-lg shrink-0">
                  {openFaq === idx ? '−' : '+'}
                </span>
              </div>
              {openFaq === idx && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {faq.a}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="text-center max-w-2xl mx-auto p-8 rounded-3xl bg-teal-50 border border-teal-200 space-y-4">
        <h2 className="text-2xl font-bold text-teal-950">
          Ready to find your compatible roommate?
        </h2>
        <p className="text-sm text-teal-800">
          Join verified peers across campus and take the stress out of living together.
        </p>
        <Link to={nextStep.path}>
          <Button variant="primary" size="lg" className="shadow-md">
            {nextStep.label}
          </Button>
        </Link>
      </section>
    </div>
  );
}
