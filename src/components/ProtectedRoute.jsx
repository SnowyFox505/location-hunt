import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, emailVerified } = useAuth();

  // Wait for Firebase Auth + emailVerified listener to resolve
  if (loading || (user && emailVerified === null)) {
    return (
      <div className="flex items-center justify-center h-full bg-game-bg">
        <div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (emailVerified === false) return <Navigate to="/verify-email" replace />;
  return children;
}
