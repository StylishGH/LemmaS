import { Award, BookOpen, Check, GraduationCap, Database, BrainCircuit, Code, Terminal } from "lucide-react";
import "./AboutTeacher.css";

export function AboutTeacher() {
  return (
    <section id="sobre" className="lemmas-section">
      <div className="lemmas-section-heading">
        <span className="lemmas-eyebrow">QUEM ESTÁ POR TRÁS & ARQUITETURA DO PROJETO</span>
        <h2>Matemática encontra Inteligência Artificial.</h2>
        <p>
          O LEMMAS é mais que uma plataforma de ensino. É o meu portfólio prático unindo Educação Matemática, Ciência de Dados, Engenharia de Dados e Machine Learning.
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
          <span className="lemmas-eyebrow">CRIADOR & ENGENHEIRO</span>
          <h3>Guilherme Henrique (GH)</h3>
          <p>
            Desenvolvedor com foco em Dados e IA. Criei o LEMMAS para resolver um problema real de aprendizado através de pipelines de dados, modelos LLM e algoritmos de recomendação.
          </p>

          <div className="lemmas-badges" style={{ flexWrap: 'wrap' }}>
            <div className="lemmas-badge">
              <GraduationCap size={17} />
              <span>Matemática · UFF</span>
            </div>
            <div className="lemmas-badge">
              <Database size={17} />
              <span>Engenharia de Dados</span>
            </div>
            <div className="lemmas-badge">
              <BrainCircuit size={17} />
              <span>Machine Learning & IA</span>
            </div>
            <div className="lemmas-badge">
              <Code size={17} />
              <span>Ciência de Dados</span>
            </div>
          </div>
        </div>

        <div className="lemmas-proof-list">
          <div><Check size={15} /> Arquitetura de Dados</div>
          <div><Check size={15} /> LLMs & Prompts (Gemini)</div>
          <div><Check size={15} /> Algoritmos de Repetição</div>
          <div><Check size={15} /> Data Analytics</div>
        </div>
      </div>
    </section>
  );
}
