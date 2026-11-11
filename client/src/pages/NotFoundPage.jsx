import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto py-12 sm:py-16 text-center px-4">
      <Card className="p-8 sm:p-10 space-y-5 border-slate-200 shadow-md">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center mx-auto text-2xl font-black">
          404
        </div>

        <div className="space-y-1">
          <Badge variant="neutral" size="sm">Page Missing</Badge>
          <Card.Title as="h1" className="text-2xl font-bold text-slate-900">
            Page Not Found
          </Card.Title>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
            The page you are looking for doesn&apos;t exist, has been moved, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="primary" size="md" fullWidth>
              Return Home
            </Button>
          </Link>
          <Link to="/matches" className="w-full sm:w-auto">
            <Button variant="outline" size="md" fullWidth>
              Explore Matches
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
