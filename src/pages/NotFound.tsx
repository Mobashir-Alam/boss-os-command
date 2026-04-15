import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-foreground flex items-center justify-center">
          <span className="text-background text-lg font-bold">F</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-muted-foreground">This page doesn't exist.</p>
        <Button variant="outline" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Founder OS
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
