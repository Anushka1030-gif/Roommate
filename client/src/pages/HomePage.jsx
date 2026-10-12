import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function HomePage() {
  const { user, isAuthenticated, isVerified } = useAuth();

  return (
    <div className="space-y-12 py-4">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <Badge variant="primary" size="lg" className="mx-auto">
          Campus-Verified Roommate Matching
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Find your ideal roommate without the guesswork.
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          RoomieMatch pairs university students based on sleep schedules, study habits,
          lifestyle compatibility, and housing budgets.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isAuthenticated ? (
            isVerified ? (
              <Link to="/matches">
                <Button variant="primary" size="lg">
                  Explore Matches &rarr;
                </Button>
              </Link>
            ) : (
              <Link to="/verify-email">
                <Button variant="primary" size="lg">
                  Verify Student Email &rarr;
                </Button>
              </Link>
            )
          ) : (
            <>
              <Link to="/register">
                <Button variant="primary" size="lg">
                  Get Started with College Email
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">
                  Log In
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Card hover className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg">
            🎓
          </div>
          <h2 className="text-lg font-bold text-slate-900">Verified Students Only</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Only institutional campus email domains (.edu, .ac.in) are permitted, ensuring a safe,
            curated peer community.
          </p>
        </Card>

        <Card hover className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
            ⚡
          </div>
          <h2 className="text-lg font-bold text-slate-900">Algorithmic Scoring</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Our multi-factor matching engine evaluates cleanliness, study hours, sleep habits,
            and budgets to minimize living friction.
          </p>
        </Card>

        <Card hover className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-lg">
            🔒
          </div>
          <h2 className="text-lg font-bold text-slate-900">Privacy & Contact Control</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Personal contact details remain completely private until both students mutually
            agree to confirm a roommate match.
          </p>
        </Card>
      </div>

      {/* Current User Quick Navigation banner if logged in */}
      {isAuthenticated && (
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-teal-50/70 to-emerald-50/70 border-teal-200/80 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-teal-800">
                Logged in as
              </p>
              <h2 className="text-lg font-bold text-slate-900">
                {user?.full_name || user?.email}
              </h2>
              <p className="text-xs text-slate-500">
                Role: <span className="font-semibold">{user?.role}</span> &bull; Verified:{' '}
                <span className="font-semibold">{user?.email_verified ? 'Yes' : 'No'}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/onboarding/profile">
                <Button variant="primary" size="sm">
                  Profile Setup
                </Button>
              </Link>
              <Link to="/matches">
                <Button variant="outline" size="sm">
                  View Matches
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
