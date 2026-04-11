import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, Scale } from 'lucide-react';

export default function PendingApproval() {
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/auth'); return; }
      setUserEmail(session.user.email ?? '');

      const check = async () => {
        const { data: profile } = await supabase
          .from('profiles').select('approved').eq('id', session.user.id).single();
        if (profile?.approved) navigate('/');
      };

      check();
      const interval = setInterval(check, 5000);
      return () => clearInterval(interval);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/auth');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Scale className="h-8 w-8 text-gold" />
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-elegant p-8 text-center space-y-5">
          {/* Status icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                <Clock className="h-7 w-7 text-amber-500" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-card animate-pulse" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">Account Pending Approval</h1>
            <p className="text-sm text-muted-foreground mt-1">
              An administrator needs to approve your access.
            </p>
          </div>

          {userEmail && (
            <div className="px-4 py-3 bg-muted rounded-xl text-sm text-muted-foreground break-all">
              {userEmail}
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            This page checks automatically every few seconds. You'll be redirected as soon as your account is approved.
          </p>

          <Button
            variant="outline"
            onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Marquette University Student Government
        </p>
      </div>
    </div>
  );
}
