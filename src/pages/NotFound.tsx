import { useNavigate } from "react-router-dom";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-elegant">
            <Scale className="h-8 w-8 text-gold" />
          </div>
        </div>
        <div>
          <p className="text-7xl font-bold text-muted-foreground/20 leading-none">404</p>
          <h1 className="text-xl font-semibold text-foreground mt-2">Page not found</h1>
          <p className="text-sm text-muted-foreground mt-1">This page doesn't exist or you don't have access.</p>
        </div>
        <Button onClick={() => navigate('/')}>Return home</Button>
      </div>
    </div>
  );
};

export default NotFound;
