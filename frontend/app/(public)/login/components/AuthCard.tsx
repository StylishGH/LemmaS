"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  User,
  KeyRound,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { validarRequisitosSenha } from "@/lib/validation";
import { LegalConsentCheckbox } from "@/components/LegalConsentCheckbox";
import "./Signup.css";

export function AuthCard() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab inicial a partir da query param: ?tab=signup ou ?tab=signin ou ?tab=forgot
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<"signup" | "signin" | "forgot">(
    tabParam === "signin" ? "signin" : tabParam === "forgot" ? "forgot" : "signup"
  );

  useEffect(() => {
    if (tabParam === "signin" || tabParam === "signup" || tabParam === "forgot") {
      setTab(tabParam);
    }
  }, [tabParam]);

  // Estados dos campos
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [concordaTermos, setConcordaTermos] = useState(true);

  // Estados de submissão e feedback
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Estados de Verificação de Código e Link
  const [aguardandoCodigo, setAguardandoCodigo] = useState(false);
  const [codigoOtp, setCodigoOtp] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [checandoLink, setChecandoLink] = useState(false);

  const requisitosSenha = validarRequisitosSenha(senha);

  const alternarTab = (novaTab: "signup" | "signin" | "forgot") => {
    setTab(novaTab);
    setErro(null);
    setMensagemSucesso(null);
    setAguardandoCodigo(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", novaTab);
    router.replace(`/login?${params.toString()}`);
  };

  // Polling automático enquanto aguarda confirmação: se o usuário clicar no link em outra aba/celular, detecta e redireciona
  useEffect(() => {
    if (!aguardandoCodigo) return;

    const interval = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
          clearInterval(interval);
          try {
            await supabase
              .from("usuarios")
              .update({ verificado: 1 })
              .eq("email", user.email);
          } catch {}

          setMensagemSucesso("E-mail confirmado com sucesso! Redirecionando...");
          setTimeout(() => {
            router.push("/onboarding");
          }, 800);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [aguardandoCodigo, router, supabase]);

  const handleChecarStatusConfirmacao = async () => {
    setErro(null);
    setChecandoLink(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        try {
          await supabase
            .from("usuarios")
            .update({ verificado: 1 })
            .eq("email", user.email);
        } catch {}

        setMensagemSucesso("E-mail confirmado com sucesso! Redirecionando...");
        setTimeout(() => {
          router.push("/onboarding");
        }, 800);
        return;
      }

      setErro("A confirmação ainda não foi detectada. Verifique se clicou no link recebido no seu e-mail.");
    } catch {
      setErro("Não foi possível verificar o status agora. Tente novamente em instantes.");
    } finally {
      setChecandoLink(false);
    }
  };

  const handleVerificarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    const tokenLimpo = codigoOtp.trim();
    if (!tokenLimpo || tokenLimpo.length < 6) {
      setErro("Por favor, digite o código de 6 dígitos recebido no seu e-mail.");
      return;
    }

    setLoading(true);
    try {
      // 1. Tenta validar como confirmação de cadastro (type: 'signup')
      let res = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: tokenLimpo,
        type: "signup",
      });

      // 2. Fallback para token geral de email se o primeiro falhar
      if (res.error) {
        res = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: tokenLimpo,
          type: "email",
        });
      }

      if (res.error) throw res.error;

      // Sincroniza verificado = 1 na tabela usuarios do Postgres
      try {
        await supabase
          .from("usuarios")
          .update({ verificado: 1 })
          .eq("email", email.trim());
      } catch (dbErr) {
        console.warn("Aviso ao atualizar verificado=1:", dbErr);
      }

      if (typeof window !== "undefined") {
        if (nome.trim()) localStorage.setItem("lemmas_user_name", nome.trim());
        localStorage.setItem("lemmas_user_email", email.trim());
      }

      setMensagemSucesso("E-mail verificado com sucesso! Redirecionando para o onboarding...");
      setTimeout(() => {
        router.push("/onboarding");
      }, 800);
    } catch (err: any) {
      setErro(err?.message || "Código inválido ou expirado. Verifique os dígitos e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleReenviarCodigo = async () => {
    setErro(null);
    setMensagemSucesso(null);
    setReenviando(true);
    try {
      const redirectUri = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/onboarding`
        : "/auth/callback?next=/onboarding";

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUri,
        },
      });
      if (error) throw error;
      setMensagemSucesso("Novo e-mail com link e código de confirmação enviado! Cheque sua caixa de entrada e spam.");
    } catch (err: any) {
      setErro(err?.message || "Não foi possível reenviar o e-mail agora. Tente novamente em instantes.");
    } finally {
      setReenviando(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);
    if (!email || !email.includes("@")) {
      setErro("Por favor, informe o e-mail cadastrado na sua conta.");
      return;
    }
    setLoading(true);
    try {
      const redirectUri = typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=/perfil&type=recovery`
        : "/auth/callback?next=/perfil&type=recovery";
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUri,
      });
      if (error) throw error;
      setMensagemSucesso(`Link de redefinição enviado para ${email.trim()}. Verifique sua caixa de entrada (e spam).`);
    } catch (err: any) {
      setErro(err?.message || "Não foi possível enviar o e-mail agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const redirecionarPosLogin = async (session: any) => {
    try {
      const email = session?.user?.email;
      if (!email) {
        router.push("/questoes");
        return;
      }

      const { data: dbUser } = await supabase
        .from("usuarios")
        .select("cpf, escolaridade")
        .eq("email", email)
        .maybeSingle();
        
      if (dbUser && (dbUser.cpf || dbUser.escolaridade)) {
        router.push("/questoes");
      } else {
        router.push("/onboarding");
      }
    } catch {
      router.push("/questoes");
    }
  };

  // Escuta ativa de eventos de autenticação (OAuth, Magic Link, etc.)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setErro(null);
        setMensagemSucesso("Autenticação concluída! Acessando a plataforma...");
        // Evita deadlock assíncrono dentro do callback síncrono do Supabase
        setTimeout(() => {
          redirecionarPosLogin(session);
        }, 0);
      }
    });

    // Se já houver sessão ativa válida e confirmada pelo servidor
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (user && !error) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            setErro(null);
            redirecionarPosLogin(session);
          }
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  useEffect(() => {
    // Se a URL contém access_token no fragmento de hash, o Supabase está processando a sessão; não exibe erro
    if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
      return;
    }

    const errorParam = searchParams.get("error");
    if (errorParam === "oauth_exchange_failed") {
      setErro("Falha ao concluir autenticação com Google. Verifique se o Google Provider está ativado no Supabase ou use email e senha.");
    } else if (errorParam) {
      setErro(`Erro de autenticação: ${errorParam}`);
    }
  }, [searchParams]);

  const handleOAuthGoogle = async () => {
    setErro(null);
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback?next=/onboarding`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) {
        if (
          error.message?.toLowerCase().includes("provider is not enabled") ||
          error.message?.toLowerCase().includes("unsupported provider")
        ) {
          throw new Error(
            "O login com Google precisa ser ativado no painel do Supabase (Authentication > Providers > Google). Insira o Client ID e Client Secret."
          );
        }
        throw error;
      }
    } catch (err: any) {
      setErro(err?.message || "Erro ao conectar com Google. Tente novamente.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagemSucesso(null);

    if (!email || !email.includes("@")) {
      setErro("Por favor, informe um endereço de e-mail válido.");
      return;
    }

    if (tab === "signup") {
      if (!nome.trim()) {
        setErro("Por favor, informe seu nome completo.");
        return;
      }
      if (!requisitosSenha.valida) {
        setErro("A senha deve cumprir todos os requisitos mínimos de segurança.");
        return;
      }
      if (!concordaTermos) {
        setErro("Você precisa concordar com os Termos de Serviço e Política de Privacidade para criar uma conta.");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              full_name: nome.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });

        if (error) throw error;

        // Armazena temporariamente dados de onboarding no localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("lemmas_user_name", nome.trim());
          localStorage.setItem("lemmas_user_email", email.trim());
        }

        // Se o Supabase já devolveu sessão direta (confirmação desligada)
        if (data?.session) {
          setMensagemSucesso("Conta criada com sucesso! Redirecionando para o onboarding...");
          setTimeout(() => {
            router.push("/onboarding");
          }, 800);
        } else {
          // Confirmação de e-mail ativa: link e código enviados para a caixa de entrada
          setAguardandoCodigo(true);
          setMensagemSucesso(`Enviamos um link de confirmação para ${email.trim()}. Clique nele para ativar sua conta ou use o código:`);
        }
      } catch (err: any) {
        setErro(err?.message || "Erro ao criar conta. Tente novamente.");
      } finally {
        setLoading(false);
      }
    } else {
      // Signin tradicional
      if (!senha) {
        setErro("Por favor, digite sua senha.");
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

        if (error) throw error;

        setMensagemSucesso("Login realizado com sucesso! Redirecionando...");
        setTimeout(() => {
          router.push("/questoes");
        }, 600);
      } catch (err: any) {
        if (err?.message?.toLowerCase().includes("email not confirmed")) {
          setErro("Seu e-mail ainda não foi confirmado. Clique no link que enviamos para sua caixa de entrada ou digite o código abaixo.");
          setAguardandoCodigo(true);
        } else {
          setErro(
            err?.message === "Invalid login credentials"
              ? "E-mail ou senha incorretos. Verifique suas credenciais."
              : err?.message || "Falha ao entrar. Tente novamente."
          );
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="lemmas-signup-container max-w-md mx-auto">
      <div className="lemmas-signup-card border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Badge do LEMMAS */}
        <div className="lemmas-founder-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)]">
          <Sparkles size={14} /> Plataforma Cognitiva · LEMMAS
        </div>

        {/* Mensagens de Erro ou Sucesso */}
        {erro && (
          <div className="p-3 rounded-xl bg-[var(--marker-red-dim)] border border-[var(--marker-red-border)] text-[var(--marker-red)] text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {mensagemSucesso && (
          <div className="p-3 rounded-xl bg-[var(--marker-green-dim)] border border-[var(--marker-green-border)] text-[var(--marker-green)] text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {aguardandoCodigo ? (
          /* TELA DE CONFIRMAÇÃO POR LINK DE E-MAIL */
          <div className="space-y-6 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] flex items-center justify-center mx-auto shadow-sm">
              <Mail size={32} className="animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-serif-math font-bold text-[var(--ink-primary)]">
                Confirme seu E-mail
              </h3>
              <p className="text-xs text-[var(--ink-secondary)]">
                Enviamos um link de ativação para:
              </p>
              <div className="inline-block px-3 py-1.5 rounded-lg bg-[var(--marker-blue-dim)] dark:bg-[var(--marker-amber-dim)] border border-[var(--marker-blue-border)] dark:border-[var(--marker-amber-border)] text-xs font-mono font-bold text-[var(--marker-blue)] dark:text-[var(--marker-amber)] break-all">
                {email}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs space-y-2 text-[var(--ink-secondary)] text-left">
              <p className="font-semibold text-[var(--ink-primary)] flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-[var(--marker-green)] shrink-0" />
                Basta 1 clique para ativar sua conta:
              </p>
              <p className="text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                Abra seu e-mail e clique no botão <strong>Confirm your email</strong>. Sua conta será confirmada na hora e liberará o acesso à plataforma.
              </p>
              <p className="text-[10px] text-[var(--ink-muted)] italic pt-1 border-t border-[var(--border-subtle)]">
                Não encontrou? Dê uma olhada na pasta de Spam ou Lixo Eletrônico.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleChecarStatusConfirmacao}
                disabled={checandoLink}
                className="w-full lemmas-gold-cta py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors hover:scale-[1.01] cursor-pointer disabled:opacity-50"
              >
                {checandoLink ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Verificando ativação...
                  </>
                ) : (
                  <>
                    Já cliquei no link do e-mail <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
                <button
                  type="button"
                  onClick={handleReenviarCodigo}
                  disabled={reenviando}
                  className="text-[var(--ink-secondary)] hover:text-[var(--marker-blue)] dark:hover:text-[var(--marker-amber)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <RotateCcw size={13} className={reenviando ? "animate-spin" : ""} />
                  <span>{reenviando ? "Reenviando..." : "Não recebeu? Reenviar e-mail"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAguardandoCodigo(false);
                    setErro(null);
                    setMensagemSucesso(null);
                  }}
                  className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-semibold hover:underline cursor-pointer"
                >
                  Corrigir e-mail / Voltar
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO PADRÃO COM GOOGLE E EMAIL/SENHA */
          <>
            {/* Título e Subtítulo */}
            <div className="space-y-1">
              <h2 className="text-2xl font-serif-math font-normal text-[var(--ink-primary)]">
                {tab === "signup" ? (
                  <>Criar sua conta no <em className="italic text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">LEMMAS</em></>
                ) : tab === "forgot" ? (
                  <>Redefinir sua senha</>
                ) : (
                  <>Acessar sua conta no <em className="italic text-[var(--marker-blue)] dark:text-[var(--marker-amber)]">LEMMAS</em></>
                )}
              </h2>
              <p className="text-xs text-[var(--ink-secondary)]">
                {tab === "signup"
                  ? "Entre rapidamente e calibre seu plano de estudo socrático."
                  : tab === "forgot"
                  ? "Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
                  : "Bem-vindo de volta! Acesse suas listas de estudo e simulados."}
              </p>
            </div>

            {/* ── TELA DE RECUPERAÇÃO DE SENHA ── */}
            {tab === "forgot" ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="text-xs font-bold text-[var(--ink-secondary)] flex items-center gap-1.5">
                    <Mail size={14} className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" /> Endereço de E-mail
                  </label>
                  <input
                    type="email"
                    id="forgot-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--marker-blue)] dark:focus:ring-[var(--marker-amber)]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full lemmas-gold-cta py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors hover:scale-[1.01] cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                  ) : (
                    <><KeyRound size={15} /> Enviar link de redefinição</>
                  )}
                </button>

                <div className="text-center text-xs text-[var(--ink-muted)] pt-1 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => alternarTab("signin")}
                    className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold hover:underline cursor-pointer"
                  >
                    ← Voltar para o login
                  </button>
                </div>
              </form>
            ) : (
            <>
            {/* Alternância de Abas (Tabs) */}
            <div className="flex p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold">
              <button
                type="button"
                onClick={() => alternarTab("signup")}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  tab === "signup"
                    ? "bg-[var(--marker-blue)] text-white dark:bg-[var(--marker-amber)] dark:text-[#101316] shadow-sm"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
              >
                Cadastrar-se
              </button>
              <button
                type="button"
                onClick={() => alternarTab("signin")}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  tab === "signin"
                    ? "bg-[var(--marker-blue)] text-white dark:bg-[var(--marker-amber)] dark:text-[#101316] shadow-sm"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
              >
                Já tenho conta
              </button>
            </div>

            {/* Botão Google OAuth */}
            <div className="lemmas-oauth-methods">
              <button
                type="button"
                onClick={handleOAuthGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-subtle)]" />
              </div>
              <span className="relative px-3 bg-[var(--bg-card)] text-[11px] text-[var(--ink-muted)] font-mono">
                ou credenciais com email
              </span>
            </div>

            {/* Formulário Principal */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "signup" && (
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-bold text-[var(--ink-secondary)] flex items-center gap-1.5">
                    <User size={14} className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" /> Nome Completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--marker-blue)] dark:focus:ring-[var(--marker-amber)]"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold text-[var(--ink-secondary)] flex items-center gap-1.5">
                  <Mail size={14} className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" /> Endereço de E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--marker-blue)] dark:focus:ring-[var(--marker-amber)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-bold text-[var(--ink-secondary)] flex items-center gap-1.5">
                    <Lock size={14} className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)]" /> Senha de Acesso
                  </label>
                  <div className="flex items-center gap-3">
                    {tab === "signin" && (
                      <button
                        type="button"
                        onClick={() => alternarTab("forgot")}
                        className="text-[11px] text-[var(--marker-blue)] dark:text-[var(--marker-amber)] hover:underline cursor-pointer"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--marker-blue)] dark:hover:text-[var(--marker-amber)] flex items-center gap-1 transition-colors"
                    >
                      {mostrarSenha ? <EyeOff size={13} /> : <Eye size={13} />}
                      {mostrarSenha ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  id="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder={tab === "signup" ? "Crie uma senha forte" : "Sua senha"}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--marker-blue)] dark:focus:ring-[var(--marker-amber)]"
                  required
                />

                {/* Checklist de Requisitos Mínimos (Aba de Cadastro) */}
                {tab === "signup" && senha.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {requisitosSenha.minimoCaracteres ? (
                        <CheckCircle2 size={13} className="text-[var(--marker-green)] shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-[var(--ink-muted)] shrink-0" />
                      )}
                      <span className={requisitosSenha.minimoCaracteres ? "text-[var(--marker-green)] font-semibold" : "text-[var(--ink-muted)]"}>
                        Mínimo de 8 caracteres
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {requisitosSenha.temNumero ? (
                        <CheckCircle2 size={13} className="text-[var(--marker-green)] shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-[var(--ink-muted)] shrink-0" />
                      )}
                      <span className={requisitosSenha.temNumero ? "text-[var(--marker-green)] font-semibold" : "text-[var(--ink-muted)]"}>
                        Pelo menos 1 número (0-9)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {requisitosSenha.temSimbolo ? (
                        <CheckCircle2 size={13} className="text-[var(--marker-green)] shrink-0" />
                      ) : (
                        <XCircle size={13} className="text-[var(--ink-muted)] shrink-0" />
                      )}
                      <span className={requisitosSenha.temSimbolo ? "text-[var(--marker-green)] font-semibold" : "text-[var(--ink-muted)]"}>
                        Pelo menos 1 símbolo especial (!@#$%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Aceite Legal Obrigatório (Cadastro) */}
              {tab === "signup" && (
                <LegalConsentCheckbox
                  defaultChecked={concordaTermos}
                  onConsentChange={(aceito) => setConcordaTermos(aceito)}
                />
              )}

              {/* Botão de Submissão */}
              <button
                type="submit"
                disabled={loading}
                className="w-full lemmas-gold-cta py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors hover:scale-[1.01] cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processando...
                  </>
                ) : tab === "signup" ? (
                  <>
                    Criar Conta Gratuita <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    Entrar na Plataforma <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Rodapé Alternador de Estado */}
            <div className="pt-2 text-center text-xs text-[var(--ink-muted)] border-t border-[var(--border-subtle)]">
              {tab === "signup" ? (
                <p>
                  Já tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => alternarTab("signin")}
                    className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold hover:underline cursor-pointer"
                  >
                    Entrar
                  </button>
                </p>
              ) : (
                <p>
                  Não tem uma conta ainda?{" "}
                  <button
                    type="button"
                    onClick={() => alternarTab("signup")}
                    className="text-[var(--marker-blue)] dark:text-[var(--marker-amber)] font-bold hover:underline cursor-pointer"
                  >
                    Cadastre-se gratuitamente
                  </button>
                </p>
              )}
            </div>
            </>
            )} {/* fim do ternário forgot */}
          </>
        )}
      </div>
    </div>
  );
}


