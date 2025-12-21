import { Link } from "react-router-dom";
import { SparklesCore } from "@/components/ui/sparkles";
import { NeonButton } from "@/components/ui/neon-button";

const Index = () => {
  return (
    <div className="h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <h1 className="md:text-7xl text-3xl lg:text-8xl font-bold text-center text-white relative z-20">
        Sistema de Casas Arboria
      </h1>
      <div className="w-[40rem] h-40 relative">
        {/* Gradient lines */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

        {/* Sparkles effect */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />

        {/* Radial gradient mask */}
        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />
      </div>

      {/* Botão Entrar */}
      <div className="relative z-20 mt-8">
        <Link to="/login">
          <NeonButton size="lg" className="text-white">
            Entrar
          </NeonButton>
        </Link>
      </div>
    </div>
  );
};

export default Index;
