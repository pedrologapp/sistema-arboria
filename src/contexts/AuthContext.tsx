import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  /** Dono da plataforma (papel super_admin): acessa o Painel Arboria (/arboria) */
  isSuperAdmin: boolean;
  /** Coordenador pedagógico (papel coordenador): só LEITURA, escopo por segmento. Visor /coordenador. */
  isCoordenador: boolean;
  isLoading: boolean;
  adminCheckComplete: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, institution: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCoordenador, setIsCoordenador] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);

  const checkAdminRole = async (userId: string) => {
    try {
      // Verificar APENAS na tabela user_roles (seguro)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      return !!roleData;
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  };

  const checkSuperAdminRole = async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'super_admin' as never)
        .maybeSingle();
      return !!roleData;
    } catch {
      // Antes da migration do papel existir, a consulta falha: sem drama
      return false;
    }
  };

  const checkCoordenadorRole = async (userId: string) => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'coordenador' as never)
        .maybeSingle();
      return !!roleData;
    } catch {
      // Antes da migration do papel existir (enum app_role sem 'coordenador'),
      // a consulta falha: sem drama, cai em false.
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Reset admin check when auth state changes
        if (event === 'SIGNED_IN' && session?.user) {
          setAdminCheckComplete(false);
          // Defer admin check with setTimeout to avoid deadlock
          setTimeout(async () => {
            if (!isMounted) return;
            const [result, superResult, coordResult] = await Promise.all([
              checkAdminRole(session.user.id),
              checkSuperAdminRole(session.user.id),
              checkCoordenadorRole(session.user.id),
            ]);
            if (isMounted) {
              setIsAdmin(result);
              setIsSuperAdmin(superResult);
              setIsCoordenador(coordResult);
              setAdminCheckComplete(true);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsCoordenador(false);
          setAdminCheckComplete(true);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const [isAdminResult, isSuperResult, isCoordResult] = await Promise.all([
          checkAdminRole(session.user.id),
          checkSuperAdminRole(session.user.id),
          checkCoordenadorRole(session.user.id),
        ]);
        if (isMounted) {
          setIsAdmin(isAdminResult);
          setIsSuperAdmin(isSuperResult);
          setIsCoordenador(isCoordResult);
          setAdminCheckComplete(true);
          setIsLoading(false);
        }
      } else {
        if (isMounted) {
          setAdminCheckComplete(true);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data?.user) {
      import('@/utils/logActivity').then(({ logActivity }) =>
        logActivity(data.user.id, 'login')
      );
    }
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, institution: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          institution: institution,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Log before clearing session
    if (user) {
      import('@/utils/logActivity').then(({ logActivity }) =>
        logActivity(user.id, 'logout')
      );
    }

    // Use local sign-out to guarantee session cleanup even when backend session is already invalid/expired
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Sign out error:', error);
    }

    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsCoordenador(false);
    setAdminCheckComplete(true);
  };

  const value = {
    user,
    session,
    isAdmin,
    isSuperAdmin,
    isCoordenador,
    isLoading,
    adminCheckComplete,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
