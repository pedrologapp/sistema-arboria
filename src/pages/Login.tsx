import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BGPattern } from "@/components/ui/bg-pattern";
import { NeonButton } from "@/components/ui/neon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Lock, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const { user, isAdmin, signIn, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [instituicao, setInstituicao] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarMe, setLembrarMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setLembrarMe(true);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !senha) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, senha);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Por favor, confirme seu email antes de fazer login');
        } else {
          toast.error(error.message);
        }
        return;
      }

      // Save or remove email based on "remember me"
      if (lembrarMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Check if it's admin login
      if (instituicao.toLowerCase() === 'administrador') {
        toast.success('Bem-vindo, Administrador!');
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
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
        {/* Grid Background */}
        <BGPattern 
          variant="grid" 
          mask="fade-edges" 
          size={24} 
          fill="#252525" 
          className="absolute inset-0" 
        />

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
            {/* Instituição */}
            <div className="space-y-2">
              <Label htmlFor="instituicao" className="text-white/80 text-sm">
                Instituição
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="instituicao"
                  type="text"
                  placeholder="Nome da instituição (ou 'administrador')"
                  value={instituicao}
                  onChange={(e) => setInstituicao(e.target.value)}
                  className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                />
              </div>
            </div>

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
              <a
                href="#"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Esqueci minha senha
              </a>
            </div>

            {/* Botão Entrar */}
            <NeonButton
              type="submit"
              size="lg"
              className="w-full text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar no Sistema'}
            </NeonButton>
          </form>
        </div>
      </div>

      {/* Lado Direito - Branding */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center relative overflow-hidden">
        {/* Grid Background mais intenso */}
        <BGPattern 
          variant="grid" 
          mask="fade-center" 
          size={24} 
          fill="#3f3f46" 
          className="absolute inset-0" 
        />

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-black [mask-image:radial-gradient(500px_400px_at_center,transparent_30%,white)]" />
      </div>
    </div>
  );
};

export default Login;
