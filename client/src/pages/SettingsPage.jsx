import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card className="p-8 text-center space-y-4">
        <Badge variant="neutral" size="md">
          Step 15 Foundation
        </Badge>
        <Card.Title as="h1" className="text-3xl font-bold">
          Account Settings
        </Card.Title>
        <p className="text-slate-600 max-w-lg mx-auto">
          Manage your email notifications, privacy settings, blocked users, and account credentials. Coming in Step 15.
        </p>
      </Card>
    </div>
  );
}
