import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ShieldAlert } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setMessage({ text: 'Por favor, preencha todos os campos.', isError: true });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: 'A senha deve conter no mínimo 6 caracteres.', isError: true });
      return;
    }

    setLoading(true);
    setMessage({ text: '', isError: false });

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          setMessage({ text: 'Cadastro realizado com sucesso!', isError: false });
          onAuthSuccess(data.session.user);
        } else {
          // If confirmation is required, tell them nicely, of if they are ready we auto log them in
          if (data.user && !data.session) {
            setMessage({
              text: 'Conta criada! Se a confirmação estiver ativa, valide no seu e-mail. Caso contrário, já pode tentar entrar.',
              isError: false,
            });
            setIsRegistering(false);
          } else {
            setMessage({ text: 'Cadastro concluído!', isError: false });
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.user) {
          setMessage({ text: 'Acesso autorizado!', isError: false });
          onAuthSuccess(data.user);
        }
      }
    } catch (err: any) {
      console.error('Authentication failure:', err);
      let errorMsg = err.message || 'Ocorreu um erro ao processar o acesso.';
      
      // Polish Portuguese error messages translation for native user trust
      if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = 'Acesso negado. E-mail ou senha inválidos.';
      } else if (errorMsg.includes('User already registered')) {
        errorMsg = 'Este endereço de e-mail já está em uso.';
      } else if (errorMsg.includes('Email not confirmed')) {
        errorMsg = 'Seu e-mail ainda não foi confirmado.';
      } else if (errorMsg.includes('network')) {
        errorMsg = 'Erro de rede. Verifique sua conexão com a internet.';
      }
      setMessage({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="soft-bg w-full min-h-screen px-4 py-8 flex items-center justify-center">
      <section className="glass-panel w-full max-w-[420px] rounded-[30px] p-6 sm:p-8 fade-in shadow-xl border border-slate-200/60 bg-white/90">
        <header className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <ShieldCheck size={26} />
          </div>
          <p className="text-slate-400 uppercase font-black tracking-[0.2em] text-[10px] mb-1">
            cia c/ ba ap log
          </p>
          <h1 className="font-sans text-[26px] leading-tight text-slate-900 font-extrabold tracking-tight">
            Agenda Cb Alexandre
          </h1>
          <p className="text-slate-500 text-xs mt-2 font-medium">
            Central de Missões Protegida
          </p>
        </header>

        {/* Message Banner */}
        {message.text && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
              message.isError
                ? 'bg-rose-50 border-rose-100 text-rose-700'
                : 'bg-indigo-50 border-indigo-100 text-indigo-700'
            }`}
          >
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">{message.text}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label
              htmlFor="authEmail"
              className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5 text-slate-500"
            >
              E-mail militar ou pessoal
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail size={16} />
              </span>
              <input
                id="authEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="focus-ring w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="authPassword"
              className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5 text-slate-500"
            >
              Senha secreta
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={16} />
              </span>
              <input
                id="authPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="focus-ring w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 py-2.5 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="focus-ring w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md hover:translate-y-[-1px] disabled:translate-y-0 cursor-pointer mt-6"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                Carregando...
              </span>
            ) : isRegistering ? (
              'Criar Nova Conta'
            ) : (
              'Entrar Protegido'
            )}
          </button>
        </form>

        {/* View switcher */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium">
            {isRegistering ? 'Já possui uma conta?' : 'Novo por aqui?'}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage({ text: '', isError: false });
              }}
              className="text-indigo-600 font-bold ml-1.5 hover:underline cursor-pointer"
            >
              {isRegistering ? 'Entrar na minha conta' : 'Criar credencial de acesso'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
