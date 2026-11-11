import { Check, GraduationCap, Database, BrainCircuit, Sparkles } from "lucide-react";
import "./AboutTeacher.css";

export function AboutTeacher() {
  return (
    <section id="sobre" className="lemmas-section">
      <div className="lemmas-section-heading">
        <span className="lemmas-eyebrow">QUEM ESTÁ POR TRÁS & ARQUITETURA DO PROJETO</span>
        <h2>Matemática, Ciência de Dados e Inteligência Artificial integradas na prática.</h2>
        <p>
          O LEMMAS é o ponto de convergência entre Educação Matemática, Ciência de Dados, Machine Learning e Inteligência Artificial Generativa — transformando a resolução de problemas em modelagem cognitiva explicável.
        </p>
      </div>

      <div className="lemmas-authority-card">
        <div className="lemmas-crest" aria-hidden="true">
          <div className="lemmas-crest-circle lemmas-crest-circle-a" />
          <div className="lemmas-crest-circle lemmas-crest-circle-b" />
          <div className="lemmas-crest-line" />
          <span>GH</span>
        </div>

        <div className="lemmas-authority-copy">
          <span className="lemmas-eyebrow">CRIADOR & PESQUISADOR</span>
          <h3>Guilherme Henrique (GH)</h3>
          <p>
            Graduando em Licenciatura em Matemática (UFF) com foco prático em Ciência de Dados e Machine Learning. Desenvolvi o LEMMAS para unir o rigor matemático a desafios concretos do mercado: pipelines de dados analíticos, representação vetorial em NLP e agentes generativos com orquestração multi-modelo para tutoria especializada.
          </p>

          <div className="lemmas-badges" style={{ flexWrap: 'wrap' }}>
            <div className="lemmas-badge">
              <GraduationCap size={17} />
              <span>Matemática · UFF</span>
            </div>
            <div className="lemmas-badge">
              <Database size={17} />
              <span>Ciência de Dados (Python & SQL)</span>
            </div>
            <div className="lemmas-badge">
              <BrainCircuit size={17} />
              <span>Machine Learning & NLP (BGE-M3)</span>
            </div>
            <div className="lemmas-badge">
              <Sparkles size={17} />
              <span>GenAI Multi-LLM (Nemotron/DeepSeek)</span>
            </div>
          </div>
        </div>

        <div className="lemmas-proof-list">
          <div><Check size={15} /> EDA & Governança de 21.000+ Questões</div>
          <div><Check size={15} /> Vetorização Híbrida: BGE-M3 + TF-IDF LaTeX</div>
          <div><Check size={15} /> Cognitive Engine Multi-LLM & Visão Multimodal</div>
          <div><Check size={15} /> Modelagem Cognitiva & Repetição Espaçada (SM-2/FSRS)</div>
        </div>
      </div>
    </section>
  );
}
