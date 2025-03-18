import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}