import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Spinner from '../ui/Spinner.jsx';

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 gap-3">
        <Spinner size="lg" />
      </div>
    );
  }

  if (user) {
    if (!user.email_verified) {
      return <Navigate to="/verify-email" replace />;
    }
    return <Navigate to="/onboarding/profile" replace />;
  }

  return children ? children : <Outlet />;
}
