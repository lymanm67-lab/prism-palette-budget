import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import prismLogo from '@/assets/prism-budget-logo.png';

type View = 'login' | 'signup' | 'forgot';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const journeyFromOnboarding = searchParams.get('journey');
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
      options: {
        emailRedirectTo: window.location.origin,
        data: journeyFromOnboarding ? { financial_journey: journeyFromOnboarding } : undefined,
      },
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

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: 'Google login failed', description: String(error), variant: 'destructive' });
    }
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
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
          >
            <img src={prismLogo} alt="PrismBudget" className="h-16 w-16 rounded-2xl object-contain" />
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
              <>
                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="w-full mb-4 border-white/15 bg-white/5 text-white hover:bg-white/10 gap-3 font-medium h-11"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </Button>

                <div className="relative mb-4">
                  <Separator className="bg-white/10" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-white/30">or</span>
                </div>

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
              </>
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
