import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function AdminPage() {
  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card className="p-8 text-center space-y-4">
        <Badge variant="warning" size="md">
          Step 14 Staff Only
        </Badge>
        <Card.Title as="h1" className="text-3xl font-bold">
          Admin Moderation Dashboard
        </Card.Title>
        <p className="text-slate-600 max-w-lg mx-auto">
          User moderation, incident report review, university domain configurations, and audit logs. Coming in Step 14.
        </p>
      </Card>
    </div>
  );
}
