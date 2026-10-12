import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function MatchesPage() {
  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card className="p-8 text-center space-y-4">
        <Badge variant="primary" size="md">
          Step 9 Foundation
        </Badge>
        <Card.Title as="h1" className="text-3xl font-bold">
          Roommate Matches
        </Card.Title>
        <p className="text-slate-600 max-w-lg mx-auto">
          Explore algorithmically calculated compatibility scores, AI summaries, and match
          recommendations. Coming in Step 9.
        </p>
      </Card>
    </div>
  );
}
