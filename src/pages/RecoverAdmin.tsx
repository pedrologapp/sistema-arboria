import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, KeyRound, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RecoverAdmin = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !newPassword || !recoveryCode) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-recovery', {
        body: { 
          email: email.trim().toLowerCase(), 
          newPassword, 
          recoveryCode 
        }
      });

      if (error) {
        console.error("Recovery error:", error);
        toast.error(error.message || "Erro ao recuperar senha");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.success) {
        toast.success(`Senha redefinida para ${data.email}! Você já pode fazer login.`);
        setRecoveryCode("");
      }
    } catch (error: any) {
      console.error("Recovery error:", error);
      toast.error("Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/5 border-violet-500/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-amber-500" />
          </div>
          <CardTitle className="text-white text-xl">Recuperação de Admin</CardTitle>
          <CardDescription className="text-white/60">
            Use o código de recuperação para redefinir a senha do administrador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecover} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80 text-sm">
                Email do Admin
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-violet-500/10 text-white"
                  placeholder="admin@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-white/80 text-sm">
                Nova Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="newPassword"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-violet-500/10 text-white"
                  placeholder="Nova senha"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recoveryCode" className="text-white/80 text-sm">
                Código de Recuperação
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="recoveryCode"
                  type="password"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  className="pl-10 bg-white/5 border-violet-500/10 text-white"
                  placeholder="Cole o código secreto aqui"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Processando..." : "Redefinir Senha"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-violet-500/10">
            <Link 
              to="/login" 
              className="flex items-center justify-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecoverAdmin;
