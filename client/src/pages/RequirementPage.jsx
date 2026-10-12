import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function RequirementPage() {
  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card className="p-8 text-center space-y-4">
        <Badge variant="info" size="md">
          Step 6 Foundation
        </Badge>
        <Card.Title as="h1" className="text-3xl font-bold">
          Housing & Roommate Requirements
        </Card.Title>
        <p className="text-slate-600 max-w-lg mx-auto">
          Specify your city, target budget, move-in timeline, and whether you have a room or need
          one. Coming in Step 6.
        </p>
      </Card>
    </div>
  );
}
