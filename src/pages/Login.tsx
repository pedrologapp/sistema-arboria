import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const { user, isAdmin, signIn, isLoading: authLoading, adminCheckComplete } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarMe, setLembrarMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setLembrarMe(true);
    }
  }, []);

  // Redirect if already logged in - wait for admin check to complete
  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      if (!authLoading && user && adminCheckComplete) {
        if (isAdmin) {
          navigate('/admin');
          return;
        }
        
        // Check if user is professor
        const { data: professorRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'professor')
          .maybeSingle();
        
        if (professorRole) {
          navigate('/professor');
          return;
        }
        
        // Default: aluno goes to /aluno/missoes
        navigate('/aluno/missoes');
      }
    };
    
    checkRoleAndRedirect();
  }, [user, isAdmin, authLoading, adminCheckComplete, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submit
    if (isSubmittingRef.current || isLoading) return;
    
    if (!email || !senha) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    
    // Dismiss any previous toasts
    toast.dismiss();

    // Normalize email to prevent login issues from whitespace/case
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { error } = await signIn(normalizedEmail, senha);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos. Primeira vez? A senha padrão é: sobrenome123 (ex: silva123)');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Por favor, confirme seu email antes de fazer login');
        } else {
          toast.error(error.message);
        }
        return;
      }

        // Save or remove email based on "remember me"
        if (lembrarMe) {
          localStorage.setItem('rememberedEmail', normalizedEmail);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        // Toast de sucesso removido - o redirecionamento já indica sucesso
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black flex">
      {/* Lado Esquerdo - Formulário */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12 relative">

        <div className="relative z-10 max-w-md mx-auto w-full">
          {/* Link voltar */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>

          {/* Título */}
          <h1 className="text-3xl font-bold text-white mb-8">Sua casa te espera!</h1>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80 text-sm">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-white/80 text-sm">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="pl-11 pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Lembrar-me e Esqueci senha */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lembrar"
                  checked={lembrarMe}
                  onCheckedChange={(checked) => setLembrarMe(checked as boolean)}
                  className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                />
                <Label
                  htmlFor="lembrar"
                  className="text-sm text-white/60 cursor-pointer"
                >
                  Lembrar-me
                </Label>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast.error('Digite seu email para recuperar a senha');
                    return;
                  }
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    email.trim().toLowerCase(),
                    { redirectTo: `${window.location.origin}/redefinir-senha` }
                  );
                  if (error) {
                    toast.error('Erro ao enviar email de recuperação');
                  } else {
                    toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
                  }
                }}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Botão Entrar */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar no Sistema'}
            </Button>

            {/* Link para recuperação admin */}
            <div className="text-center">
              <Link
                to="/recuperar-admin"
                className="text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Acesso administrativo?
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Lado Direito - Branding */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center relative overflow-hidden bg-black">
      </div>
    </div>
  );
};

export default Login;
