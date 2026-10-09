"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Moon, Sun, Scale, FileText, CheckCircle2 } from "lucide-react";
import { BoardFrame } from "../landing/components/BoardFrame";
import { Logo } from "../landing/components/Logo";
import "../landing/components/BoardFrame.css";
import "../landing/components/Logo.css";
import "../landing/components/LandingPage.css";

export default function TermosPage() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = light ? "lemmas-light" : "lemmas-dark";
    document.documentElement.style.colorScheme = light ? "light" : "dark";
  }, [light]);

  return (
    <BoardFrame>
      <div className="lemmas-page max-w-4xl mx-auto px-4 py-8">
        {/* Barra de Navegação */}
        <nav className="flex items-center justify-between pb-6 border-b border-amber-500/20 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-[#a9aaa1] hover:text-amber-500 transition-colors"
            >
              <ArrowLeft size={16} /> Voltar ao Início
            </Link>
            <div className="h-4 w-px bg-amber-500/20" />
            <Logo compact />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/privacidade"
              className="text-xs text-slate-600 dark:text-[#a9aaa1] hover:underline"
            >
              Privacidade (LGPD)
            </Link>
            <button
              type="button"
              className="lemmas-theme-toggle p-2 rounded-xl border border-amber-500/20 text-slate-600 dark:text-[#d9b452] hover:bg-amber-500/10 transition-colors"
              onClick={() => setLight((v) => !v)}
              aria-label={light ? "Ativar quadro negro" : "Ativar quadro branco"}
            >
              {light ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </nav>

        {/* Cabeçalho do Documento */}
        <header className="space-y-3 pb-8 border-b border-amber-500/20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-[#d9b452] text-xs font-semibold">
            <Scale size={14} />
            <span>Documento Jurídico Vinculante · Versão 1.2</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-math font-normal text-slate-900 dark:text-[#f5f0df] tracking-tight">
            Termos de Uso e <em className="italic text-amber-600 dark:text-[#d9b452]">Serviço.</em>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#a9aaa1]">
            Última atualização: <strong>Outubro de 2026</strong>. Aplicável a todos os usuários, estudantes, assinantes e parceiros da plataforma <strong>LEMMAS</strong>.
          </p>
        </header>

        {/* Corpo do Documento */}
        <div className="pt-8 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-[#dedbd0]">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-amber-500">1.</span> Objeto da Plataforma e Finalidade Educacional
            </h2>
            <p>
              O <strong>LEMMAS</strong> (operado pela MathAI Engine) é um ecossistema cognitivo dedicado ao aprendizado, treinamento analítico, resolução estruturada de problemas matemáticos e preparação para exames militares e acadêmicos de alta exigência.
            </p>
            <p>
              A plataforma oferece ferramentas de repetição espaçada determinística (SM-2 e FSRS-v4), tutoria socrática baseada em inteligência artificial multimodal, diagnóstico de raciocínio passo a passo e banco indexado de questões e teoremas fundamentais.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-amber-500">2.</span> Propriedade Intelectual e Proteção contra Scraping
            </h2>
            <p>
              Todos os elementos que compõem o LEMMAS — incluindo, mas não se limitando a: códigos-fonte, algoritmos de agendamento, grafos de conhecimento de lemas matemáticos, formulações didáticas, resoluções autorais, identidade visual, marca e design editorial — são de propriedade intelectual exclusiva do LEMMAS e de seus criadores.
            </p>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck size={16} /> É estritamente vedado:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Qualquer tipo de raspagem automatizada de dados (web scraping, crawlers, harvest de APIs não documentadas);</li>
                <li>Engenharia reversa ou descompilação dos motores de avaliação e modelos cognitivos;</li>
                <li>Revenda, redistribuição ou compartilhamento comercial de materiais pedagógicos proprietários.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-amber-500">3.</span> Acesso, Criação de Contas e Individualidade
            </h2>
            <p>
              O cadastro no LEMMAS exige o fornecimento de credenciais válidas e verídicas. O acesso à conta é <strong>estritamente individual e intransferível</strong>.
            </p>
            <p>
              O compartilhamento simultâneo de credenciais com terceiros ou a utilização de uma mesma conta por múltiplos estudantes acarreta a detecção por telemetria e a <strong>suspensão preventiva imediata do acesso</strong>, sem direito a ressarcimento.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-amber-500">4.</span> Planos Pagos e Reembolso
            </h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>As assinaturas e compras avulsas seguem os valores vigentes no checkout.</li>
              <li>
                Conforme o <strong>Artigo 49 do Código de Defesa do Consumidor (CDC)</strong>, o usuário poderá solicitar o cancelamento e reembolso integral em até <strong>7 (sete) dias corridos</strong> a partir da confirmação do primeiro pagamento.
              </li>
              <li>
                Para cumprimento das obrigações fiscais e emissão de Nota Fiscal Eletrônica (NFS-e), o usuário cadastrará seus dados fiscais na seção de{" "}
                <Link href="/perfil/faturamento" className="text-amber-500 underline font-semibold">
                  Faturamento
                </Link>.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-amber-500">5.</span> Rescisão
            </h2>
            <p>
              O descumprimento de qualquer cláusula autoriza o <strong>LEMMAS</strong> a encerrar ou suspender o acesso do usuário à plataforma sem prejuízo de eventuais reparações legais.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-amber-500">6.</span> Uso Ético dos Modelos de Inteligência Artificial
            </h2>
            <p>
              O MathAI Engine atua como um <em>tutor socrático</em> pedagógico, projetado para orientar o raciocínio matemático e a autonomia analítica. O estudante compromete-se a:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>Não utilizar a plataforma para obter respostas em avaliações oficiais ao vivo ou fraudes acadêmicas;</li>
              <li>Não submeter conteúdos ilícitos, ofensivos ou que violem direitos de terceiros em imagens ou rascunhos para OCR;</li>
              <li>Compreender que as hipóteses geradas por inteligência artificial são instrumentos de suporte e não substituem o rigor das bancas examinadoras.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-amber-500">7.</span> Legislação Aplicável e Foro
            </h2>
            <p>
              Estes Termos de Uso são regidos e interpretados segundo as leis da República Federativa do Brasil. Para a solução de quaisquer controvérsias decorrentes deste contrato, as partes elegem o foro da Comarca do domicílio do usuário consumidor ou o Foro da Comarca de Niterói/RJ.
            </p>
          </section>
        </div>

        {/* Rodapé do Documento */}
        <footer className="mt-12 pt-6 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-500">
          <span>LEMMAS © 2026. Todos os direitos reservados.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacidade" className="hover:text-amber-500">
              Política de Privacidade
            </Link>
            <Link href="/login?tab=signup" className="hover:text-amber-500 font-semibold">
              Criar Conta
            </Link>
          </div>
        </footer>
      </div>
    </BoardFrame>
  );
}
