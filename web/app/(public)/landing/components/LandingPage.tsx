import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, Moon, Sun } from "lucide-react";
import { BackgroundAnimation } from "./BackgroundAnimation";
import { BoardFrame } from "./BoardFrame";
import { Logo } from "./Logo";
import { AboutTeacher } from "./AboutTeacher";
import { Pricing } from "./Pricing";
import "./BackgroundAnimation.css"; import "./BoardFrame.css"; import "./Logo.css"; import "./AboutTeacher.css"; import "./Pricing.css"; import "./LandingPage.css";

export function LandingPage(){
  const [light,setLight]=useState(false);
  useEffect(()=>{document.documentElement.dataset.theme=light?"lemmas-light":"lemmas-dark";document.documentElement.style.colorScheme=light?"light":"dark";},[light]);
  return <BoardFrame><div className="lemmas-page"><BackgroundAnimation/>
    <nav className="lemmas-nav"><Logo compact/><div className="lemmas-nav-links"><a href="#metodo">Método</a><a href="#sobre">Fundador</a><a href="#acesso">Acesso</a></div><button type="button" className="lemmas-theme-toggle" onClick={()=>setLight(v=>!v)} aria-label={light?"Ativar quadro negro":"Ativar quadro branco"}>{light?<Moon size={17}/>:<Sun size={17}/>}</button></nav>
    <section className="lemmas-hero"><div className="lemmas-hero-copy"><span className="lemmas-eyebrow">PLATAFORMA ADAPTATIVA DE MATEMÁTICA</span><h1>Aprenda como<br/><em>você pensa.</em></h1><p className="lemmas-hero-lede">O LEMMAS acompanha suas resoluções, identifica padrões no seu raciocínio e adapta a prática para transformar tentativa em domínio matemático.</p><div className="lemmas-hero-actions"><a className="lemmas-cta lemmas-cta-primary" href="#acesso">Entrar na Lista de Espera <ArrowRight size={17}/></a><a className="lemmas-cta lemmas-cta-secondary" href="#metodo">Conhecer o método</a></div><div className="lemmas-hero-note"><span/> Em desenvolvimento · acesso de fundador em breve</div></div></section>
    <div className="lemmas-math-ribbon" aria-hidden="true"><span>eⁱᵖⁱ + 1 = 0</span><span>∫ₐᵇ f′(x) dx = f(b) − f(a)</span><span>Σ 1/n² = π²/6</span><span>P(A|B) = P(B|A)P(A)/P(B)</span></div>
    <section id="metodo" className="lemmas-section"><div className="lemmas-section-heading"><span className="lemmas-eyebrow">A IDEIA</span><h2>Não basta acertar.<br/>É preciso entender como chegou lá.</h2><p>O LEMMAS trata cada resolução como informação sobre o aluno. Acertos, erros, tempo, confiança, estratégia e explicações ajudam a construir uma experiência que evolui junto com você.</p></div><div className="lemmas-principles"><article className="lemmas-principle"><BrainCircuit size={20} color="#d9b452"/><strong>Seu raciocínio</strong><p>O sistema observa como você resolve, não apenas se a resposta final está certa.</p></article><article className="lemmas-principle"><BrainCircuit size={20} color="#d9b452"/><strong>Outra perspectiva</strong><p>Dominar uma estratégia não significa ficar preso a ela. O LEMMAS incentiva novas abordagens.</p></article><article className="lemmas-principle"><BrainCircuit size={20} color="#d9b452"/><strong>Prática adaptativa</strong><p>A próxima questão deve fazer sentido para o seu momento de aprendizagem.</p></article></div></section>
    <AboutTeacher/><Pricing/><footer className="lemmas-footer"><Logo compact/><span>© {new Date().getFullYear()} LEMMAS · Matemática que aprende com você.</span></footer>
  </div></BoardFrame>;
}
