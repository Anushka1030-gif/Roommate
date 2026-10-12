import { Link } from 'react-router-dom';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <Card className="p-8 space-y-4">
        <div className="text-5xl font-extrabold text-teal-600">404</div>
        <Card.Title as="h1" className="text-2xl font-bold">
          Page Not Found
        </Card.Title>
        <p className="text-sm text-slate-500">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to="/">
          <Button variant="primary" size="md">
            Return Home
          </Button>
        </Link>
      </Card>
    </div>
  );
}
