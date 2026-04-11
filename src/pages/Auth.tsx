import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { getPasswordErrors } from '@/lib/validation';

// ─── Constants ────────────────────────────────────────────────────────────────
const FAILED_LOGIN_COOLDOWN_S = 15; // seconds to wait after a failed login

// ─── Helpers ──────────────────────────────────────────────────────────────────
function PasswordStrengthHint({ password }: { password: string }) {
  if (!password) return null;
  const errors = getPasswordErrors(password);
  const rules = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'At least one uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'At least one number', pass: /[0-9]/.test(password) },
    { label: 'At least one special character', pass: /[^a-zA-Z0-9]/.test(password) },
  ];

  return (
    <ul className="mt-2 space-y-1 text-xs">
      {rules.map((r) => (
        <li key={r.label} className={`flex items-center gap-1 ${r.pass ? 'text-green-600' : 'text-muted-foreground'}`}>
          {r.pass
            ? <CheckCircle2 className="h-3 w-3 shrink-0" />
            : <XCircle className="h-3 w-3 shrink-0" />}
          {r.label}
        </li>
      ))}
    </ul>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  // Redirect already-authenticated users
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await redirectByApproval(session.user.id);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) await redirectByApproval(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(cooldownRef.current!);
  }, [cooldown]);

  const redirectByApproval = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', userId)
      .single();
    navigate(profile?.approved ? '/' : '/pending-approval');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (cooldown > 0) return;

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          // Generic message — don't confirm whether email/password was wrong
          setError('Invalid credentials. Please check your email and password and try again.');
          setCooldown(FAILED_LOGIN_COOLDOWN_S);
        }
        // On success, onAuthStateChange handles the redirect
      } else {
        // Validate password strength before calling Supabase
        const passwordErrors = getPasswordErrors(password);
        if (passwordErrors.length > 0) {
          setError(passwordErrors[0]);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          // Never confirm whether an email is registered — always show the same message
          setEmailSent(true);
        } else {
          setEmailSent(true);
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Email-sent confirmation screen ──────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-musg-navy via-musg-navy/95 to-musg-gold/10 p-4">
        <Card className="p-8 w-full max-w-md shadow-2xl text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Mail className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-musg-navy">Check your email</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We've sent a confirmation link to <strong>{email}</strong>. Click the link in
            the email to verify your account. After confirming, an administrator will need
            to approve your access before you can log in.
          </p>
          <p className="text-xs text-muted-foreground">
            Didn't receive it? Check your spam folder or{' '}
            <button
              className="underline text-primary hover:text-primary/80"
              onClick={() => setEmailSent(false)}
            >
              try again
            </button>
            .
          </p>
          <Button variant="outline" className="w-full" onClick={() => { setEmailSent(false); setIsLogin(true); }}>
            Back to Sign In
          </Button>
        </Card>
      </div>
    );
  }

  // ── Main auth form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-musg-navy via-musg-navy/95 to-musg-gold/10 p-4">
      <Card className="p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-musg-navy mb-2">MUSG Constitution</h1>
          <p className="text-muted-foreground">
            {isLogin ? 'Committee Chair Login' : 'Create Admin Account'}
          </p>
        </div>

        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="chair@marquette.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete={isLogin ? 'username' : 'email'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={isLogin ? 1 : 8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            {!isLogin && <PasswordStrengthHint password={password} />}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || cooldown > 0}
          >
            {loading
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : null}
            {cooldown > 0
              ? `Try again in ${cooldown}s`
              : isLogin ? 'Sign In' : 'Create Account'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => { setIsLogin(!isLogin); setError(''); setPassword(''); }}
            className="w-full"
            disabled={loading}
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground"
          >
            ← Back to Constitution
          </Button>
        </div>
      </Card>
    </div>
  );
}
