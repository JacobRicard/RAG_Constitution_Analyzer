import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, LogOut } from 'lucide-react';

export default function PendingApproval() {
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserEmail(session.user.email || '');

      // Check if user is approved
      const checkApproval = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('approved')
          .eq('id', session.user.id)
          .single();

        if (profile?.approved) {
          navigate('/');
        }
      };

      checkApproval();
      
      // Check every 5 seconds
      const interval = setInterval(checkApproval, 5000);
      return () => clearInterval(interval);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-musg-navy via-musg-navy/95 to-musg-gold/10 p-4">
      <Card className="p-8 w-full max-w-md shadow-2xl">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-musg-gold/20 rounded-full flex items-center justify-center mb-6">
            <Clock className="h-8 w-8 text-musg-gold" />
          </div>
          
          <h1 className="text-2xl font-bold text-musg-navy mb-4">
            Pending Approval
          </h1>
          
          <Alert className="mb-6">
            <AlertDescription className="text-left">
              Your account (<strong>{userEmail}</strong>) has been created successfully and is awaiting approval from an administrator.
              <br /><br />
              You will be automatically redirected once your account is approved.
            </AlertDescription>
          </Alert>

          <p className="text-sm text-muted-foreground mb-6">
            This page will automatically refresh when your account is approved.
          </p>

          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}
