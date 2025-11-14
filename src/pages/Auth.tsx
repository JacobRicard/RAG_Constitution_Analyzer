import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user is approved
        const { data: profile } = await supabase
          .from('profiles')
          .select('approved')
          .eq('id', session.user.id)
          .single();

        if (profile?.approved) {
          navigate('/');
        } else {
          navigate('/pending-approval');
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Check if user is approved
        const { data: profile } = await supabase
          .from('profiles')
          .select('approved')
          .eq('id', session.user.id)
          .single();

        if (profile?.approved) {
          navigate('/');
        } else {
          navigate('/pending-approval');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else {
            setError(error.message);
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please login instead.');
          } else {
            setError(error.message);
          }
        } else {
          setError('Account created successfully! Your account is pending approval. Please wait for an administrator to approve your access.');
          setIsLogin(true);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-musg-navy via-musg-navy/95 to-musg-gold/10 p-4">
      <Card className="p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-musg-navy mb-2">
            MUSG Constitution
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? 'Committee Chair Login' : 'Create Admin Account'}
          </p>
        </div>

        {error && (
          <Alert className="mb-4" variant={error.includes('successfully') ? 'default' : 'destructive'}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="chair@musg.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
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
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="w-full"
            disabled={loading}
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
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
