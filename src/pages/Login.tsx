import { useState } from "react";
import { Link } from "react-router-dom";
import { SparklesCore } from "@/components/ui/sparkles";
import { NeonButton } from "@/components/ui/neon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, User, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [instituicao, setInstituicao] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarMe, setLembrarMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar lógica de login
    console.log({ instituicao, nome, senha, lembrarMe });
  };

  return (
    <div className="min-h-screen w-full bg-black flex">
      {/* Lado Esquerdo - Formulário */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-12 relative">
        {/* Sparkles sutis no lado esquerdo */}
        <div className="absolute inset-0 overflow-hidden">
          <SparklesCore
            background="transparent"
            minSize={0.2}
            maxSize={0.6}
            particleDensity={100}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />
        </div>

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
                  placeholder="Nome da instituição"
                  value={instituicao}
                  onChange={(e) => setInstituicao(e.target.value)}
                  className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-white/80 text-sm">
                Nome de usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="nome"
                  type="text"
                  placeholder="Seu nome de usuário"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
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
            >
              Entrar no Sistema
            </NeonButton>
          </form>
        </div>
      </div>

      {/* Lado Direito - Branding */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center relative overflow-hidden">
        {/* Sparkles intensos */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={800}
          className="absolute inset-0 w-full h-full"
          particleColor="#FFFFFF"
        />


        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-black [mask-image:radial-gradient(500px_400px_at_center,transparent_30%,white)]" />

      </div>
    </div>
  );
};

export default Login;
