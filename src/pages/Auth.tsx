import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

type View = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a confirmation link.' });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent a password reset link.' });
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center auth-gradient-bg px-4 overflow-hidden">
      {/* Floating orbs */}
      <div className="orb w-96 h-96 bg-prism-violet -top-20 -left-20" style={{ animationDelay: '0s' }} />
      <div className="orb w-80 h-80 bg-prism-sky top-1/2 -right-20" style={{ animationDelay: '-5s' }} />
      <div className="orb w-64 h-64 bg-prism-teal bottom-10 left-1/3" style={{ animationDelay: '-10s' }} />
      <div className="orb w-48 h-48 bg-prism-rose top-20 right-1/4" style={{ animationDelay: '-15s' }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl prism-gradient prism-glow"
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-white">
            Prism<span className="prism-gradient-text">Budget</span>
          </h1>
          <p className="mt-3 text-base text-white/50">Your finances, brilliantly clear.</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl prism-card-shine">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl text-white flex items-center justify-center gap-2">
              {view === 'login' ? <><LogIn className="h-5 w-5 text-prism-violet" /> Welcome back</> :
               view === 'signup' ? <><UserPlus className="h-5 w-5 text-prism-teal" /> Create account</> :
               <><Mail className="h-5 w-5 text-prism-amber" /> Reset password</>}
            </CardTitle>
            <CardDescription className="text-white/40">
              {view === 'login' ? 'Sign in to your account' : view === 'signup' ? 'Start tracking your finances' : 'Enter your email to receive a reset link'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                      className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-prism-violet" />
                  </div>
                </div>
                <Button type="submit" className="w-full prism-gradient hover:opacity-90 transition-opacity gap-2 font-semibold" disabled={loading}>
                  {loading ? 'Sending...' : <><ArrowRight className="h-4 w-4" /> Send Reset Link</>}
                </Button>
                <div className="text-center text-sm text-white/40">
                  <button onClick={() => setView('login')} className="text-prism-violet hover:text-prism-sky transition-colors underline-offset-4 hover:underline">Back to sign in</button>
                </div>
              </form>
            ) : (
              <form onSubmit={view === 'login' ? handleLogin : handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                      className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-prism-violet" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/70">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                      className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-prism-violet" />
                  </div>
                </div>

                {view === 'login' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)}
                        className="border-white/20 data-[state=checked]:bg-prism-violet data-[state=checked]:border-prism-violet" />
                      <Label htmlFor="remember" className="text-sm font-normal text-white/40 cursor-pointer">Remember me</Label>
                    </div>
                    <button type="button" onClick={() => setView('forgot')} className="text-sm text-prism-violet hover:text-prism-sky transition-colors underline-offset-4 hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full prism-gradient hover:opacity-90 transition-opacity gap-2 font-semibold text-base h-11" disabled={loading}>
                  {loading ? 'Loading...' : view === 'login' ? <><LogIn className="h-4 w-4" /> Sign In</> : <><UserPlus className="h-4 w-4" /> Sign Up</>}
                </Button>
              </form>
            )}

            {view !== 'forgot' && (
              <div className="mt-4 text-center text-sm text-white/40">
                {view === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button onClick={() => setView(view === 'login' ? 'signup' : 'login')} className="text-prism-violet hover:text-prism-sky transition-colors underline-offset-4 hover:underline font-medium">
                  {view === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-white/20">
          Secure • Encrypted • Private
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
