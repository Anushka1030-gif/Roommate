import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function ProfileOnboardingPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card className="p-8 text-center space-y-4">
        <Badge variant="info" size="md">
          Step 5 Foundation
        </Badge>
        <Card.Title as="h1" className="text-3xl font-bold">
          Student Profile Setup
        </Card.Title>
        <p className="text-slate-600 max-w-lg mx-auto">
          Welcome, <span className="font-semibold text-slate-900">{user?.full_name || user?.email}</span>!
          Your student profile and lifestyle preferences will be configured here in Step 5.
        </p>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs font-mono text-slate-600 max-w-md mx-auto space-y-1">
          <div><span className="text-slate-400">User ID:</span> {user?.id}</div>
          <div><span className="text-slate-400">Email:</span> {user?.email}</div>
          <div><span className="text-slate-400">Verified:</span> {String(user?.email_verified)}</div>
          <div><span className="text-slate-400">Status:</span> {user?.status}</div>
        </div>
      </Card>
    </div>
  );
}
