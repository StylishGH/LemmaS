import { Sparkles, Brain, Clock, Cpu, GraduationCap, CheckCircle2 } from "lucide-react";

export default function SobrePage() {
  const pilares = [
    {
      icon: "🧠",
      titulo: "Diagnóstico Cognitivo",
      desc: "Mapeamos se a sua dúvida ou erro decorre de álgebra básica, interpretação de texto, falha de axioma ou falta de repertório heurístico.",
    },
    {
      icon: "⏱️",
      titulo: "Repetição Espaçada (SM-2)",
      desc: "O algoritmo agenda revisões inteligentes no momento exato antes da curva de esquecimento, maximizando a retenção a longo prazo.",
    },
    {
      icon: "⚖️",
      titulo: "Arquitetura Multi-Modelo",
      desc: "Comparamos a dedução rigorosa (NVIDIA Nemotron) e o raciocínio heurístico (DeepSeek) para que você domine múltiplos caminhos de prova.",
    },
    {
      icon: "🎓",
      titulo: "Formação Rigorosa (UFF)",
      desc: "Desenvolvido por quem vive a Licenciatura em Matemática na Universidade Federal Fluminense e compreende os desafios reais do ensino.",
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* BANNER PRINCIPAL */}
      <div className="bg-[#13111f] border border-violet-900/40 p-8 rounded-2xl text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MANIFESTO PEDAGÓGICO • MATHAI 1.0</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          A IA que aprende como você pensa Matemática
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Bancos de questões tradicionais apenas conferem alternativas. O <strong>MathAI</strong> investiga seu processo metacognitivo, acelera a expansão de repertório e conecta a intuição geométrica ao rigor axiomático formal.
        </p>
      </div>

      {/* 4 PILARES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pilares.map((p, idx) => (
          <div
            key={idx}
            className="bg-[#13111f] border border-violet-900/40 p-6 rounded-2xl space-y-3 hover:border-violet-700/50 transition"
          >
            <div className="text-3xl">{p.icon}</div>
            <h3 className="font-bold text-base text-white">{p.titulo}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* METODOLOGIA E STACK */}
      <div className="bg-[#181528] border border-violet-900/40 p-6 rounded-2xl space-y-4 text-xs">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <span>🛠️</span> Arquitetura e Engenharia de Software
        </h3>
        <p className="text-zinc-400 leading-relaxed">
          Nesta fase de modernização web, mantivemos intacta toda a inteligência e o banco de dados analítico em Python (SQLite/Turso, SM-2, pipelines de ingestão), expondo-os através de um <strong>FastAPI Shim de alta performance</strong> para um frontend moderno construído com <strong>Next.js 14+ (App Router), TypeScript e Tailwind CSS</strong>.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {["FastAPI (Python)", "Next.js 16 (Turbopack)", "TypeScript", "Tailwind CSS", "SQLite Core", "NVIDIA NIM", "SM-2 Spaced Repetition"].map((tag, i) => (
            <span key={i} className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/40 text-[11px] font-mono">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
