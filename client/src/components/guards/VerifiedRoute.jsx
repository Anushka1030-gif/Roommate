import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Spinner from '../ui/Spinner.jsx';

export default function VerifiedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">Checking verification status...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.email_verified) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />;
  }

  return children ? children : <Outlet />;
}
