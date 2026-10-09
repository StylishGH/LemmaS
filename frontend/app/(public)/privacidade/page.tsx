"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Moon, Sun, Database, UserCheck, Mail } from "lucide-react";
import { BoardFrame } from "../landing/components/BoardFrame";
import { Logo } from "../landing/components/Logo";
import "../landing/components/BoardFrame.css";
import "../landing/components/Logo.css";
import "../landing/components/LandingPage.css";

export default function PrivacidadePage() {
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
              href="/termos"
              className="text-xs text-slate-600 dark:text-[#a9aaa1] hover:underline"
            >
              Termos de Uso
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <Shield size={14} />
            <span>LGPD (Lei nº 13.709/2018) · Proteção de Dados</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-math font-normal text-slate-900 dark:text-[#f5f0df] tracking-tight">
            Política de <em className="italic text-emerald-600 dark:text-emerald-400">Privacidade.</em>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#a9aaa1]">
            Última atualização: <strong>Outubro de 2026</strong>. O LEMMAS tem o compromisso inegociável de transparência, privacidade e segurança com seus usuários.
          </p>
        </header>

        {/* Conteúdo Jurídico LGPD */}
        <div className="pt-8 space-y-8 text-sm leading-relaxed text-slate-700 dark:text-[#dedbd0]">
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-emerald-500">1.</span> Bases Legais e Coleta de Dados
            </h2>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-1">
                <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                  • Execução de Contrato e Acesso
                </span>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Coletamos nome e e-mail para autenticação, controle de sessão e suporte ao usuário.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-1">
                <span className="font-bold text-xs text-amber-600 dark:text-amber-400 block">
                  • Cumprimento de Obrigação Legal e Fiscal
                </span>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Coletamos CPF, telefone e endereço completo estritamente para faturamento, prevenção a fraudes financeiras e emissão de Notas Fiscais (NFS-e).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-1">
                <span className="font-bold text-xs text-blue-600 dark:text-blue-400 block">
                  • Aprimoramento Pedagógico (Legítimo Interesse)
                </span>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Coletamos histórico de respostas, acertos, erros e tempos de conclusão para calibrar o motor cognitivo e gerar relatórios de desempenho individual.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-emerald-500">2.</span> Compartilhamento com Operadores de Dados
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
              <li>Não comercializamos nem alugamos dados pessoais a terceiros sob nenhuma hipótese.</li>
              <li>
                Os dados são compartilhados apenas com parceiros essenciais à operação: provedores de infraestrutura de nuvem, serviços de e-mail transacional e processadoras de pagamento seguras.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-emerald-500">3.</span> Segurança da Informação
            </h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs">
              <li>Todas as comunicações ocorrem sob tráfego criptografado via SSL/TLS (HTTPS).</li>
              <li>
                Credenciais sensíveis e dados cadastrais são armazenados com criptografia em repouso e políticas rigorosas de controle de acesso (Row Level Security no Postgres).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-emerald-500">4.</span> Direitos do Titular (Art. 18 da LGPD)
            </h2>
            <p className="text-xs">
              O usuário pode solicitar a qualquer momento a confirmação de tratamento, correção de dados, portabilidade ou eliminação de informações não obrigatórias por legislação tributária, enviando solicitação para o canal oficial de suporte (<strong>privacidade@lemmas.ai</strong>).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-emerald-500">5.</span> Compartilhamento Seguro e Subprocessadores
            </h2>
            <p>
              O LEMMAS <strong>NUNCA comercializa, aluga ou cede</strong> dados pessoais a corretores de dados, empresas de publicidade terceirizadas ou corretores de marketing.
            </p>
            <p>
              O compartilhamento ocorre exclusivamente com parceiros tecnológicos essenciais à operação:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li><strong>Supabase:</strong> Banco de dados relacional criptografado e infraestrutura de autenticação;</li>
              <li><strong>Vercel / Render:</strong> Hospedagem de infraestrutura web com certificação SOC-2;</li>
              <li><strong>Gateways de Pagamento (Asaas, Stripe):</strong> Processamento de transações e emissão de notas fiscais;</li>
              <li><strong>APIs de Modelos de Linguagem (Google Cloud / NVIDIA NIM):</strong> Processamento de prompts pedagógicos sob acordos rígidos de confidencialidade onde os dados do usuário não são usados para treinamento público.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#f5f0df] flex items-center gap-2">
              <span className="text-emerald-500">6.</span> Canal de Atendimento e Encarregado (DPO)
            </h2>
            <p>
              Para esclarecer dúvidas sobre esta Política, exercer seus direitos da LGPD ou solicitar a exclusão definitiva da sua conta e dados associados, entre em contato diretamente com o nosso Encarregado de Proteção de Dados (DPO):
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-xs space-y-1">
              <p><strong>Encarregado pelo Tratamento de Dados (DPO):</strong> Equipe de Segurança & Privacidade LEMMAS</p>
              <p><strong>E-mail de Contato:</strong> <a href="mailto:privacidade@lemmas.ai" className="text-emerald-500 underline font-semibold">privacidade@lemmas.ai</a></p>
              <p><strong>Tempo máximo de resposta:</strong> Até 5 (cinco) dias úteis.</p>
            </div>
          </section>
        </div>

        {/* Rodapé do Documento */}
        <footer className="mt-12 pt-6 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-500">
          <span>LEMMAS © 2026. Em conformidade com a LGPD.</span>
          <div className="flex items-center gap-4">
            <Link href="/termos" className="hover:text-emerald-500">
              Termos de Uso
            </Link>
            <Link href="/login?tab=signup" className="hover:text-emerald-500 font-semibold">
              Criar Conta
            </Link>
          </div>
        </footer>
      </div>
    </BoardFrame>
  );
}
