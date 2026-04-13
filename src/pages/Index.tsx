import { Link } from "react-router-dom";
import { SparklesCore } from "@/components/ui/sparkles";
import { NeonButton } from "@/components/ui/neon-button";

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6">
      <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-center text-white relative z-20 leading-tight">
        <span className="block sm:inline">Arboria</span>
      </h1>
      <div className="w-full max-w-[40rem] h-40 relative mt-4">
        {/* Gradient lines */}
        <div className="absolute left-[10%] right-[10%] top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] blur-sm" />
        <div className="absolute left-[10%] right-[10%] top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px" />
        <div className="absolute left-[30%] right-[30%] top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] blur-sm" />
        <div className="absolute left-[30%] right-[30%] top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px" />

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
