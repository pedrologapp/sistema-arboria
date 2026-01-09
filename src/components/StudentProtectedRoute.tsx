import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StudentProtectedRouteProps {
  children: React.ReactNode;
}

const StudentProtectedRoute = ({ children }: StudentProtectedRouteProps) => {
  const { user, isAdmin, isLoading, adminCheckComplete } = useAuth();
  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);
  const [checkComplete, setCheckComplete] = useState(false);

  useEffect(() => {
    const checkStudentRole = async () => {
      if (!user?.id) {
        setCheckComplete(true);
        return;
      }

      try {
        // Check if user has 'user' role (student)
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'user')
          .maybeSingle();

        setIsStudent(!!roleData);

        // Check if must change password
        const { data: profileData } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('id', user.id)
          .single();

        setMustChangePassword(profileData?.must_change_password ?? false);
      } catch (error) {
        console.error('Error checking student role:', error);
        setIsStudent(false);
      } finally {
        setCheckComplete(true);
      }
    };

    if (!isLoading && adminCheckComplete) {
      checkStudentRole();
    }
  }, [user?.id, isLoading, adminCheckComplete]);

  // Loading state
  if (isLoading || !adminCheckComplete || !checkComplete) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If admin, redirect to admin panel
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // If not a student (user role), redirect to login
  if (!isStudent) {
    return <Navigate to="/login" replace />;
  }

  // If must change password, redirect to change password page
  if (mustChangePassword) {
    return <Navigate to="/alterar-senha" replace />;
  }

  return <>{children}</>;
};

export default StudentProtectedRoute;
