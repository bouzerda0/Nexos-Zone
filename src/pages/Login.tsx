import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Fingerprint } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      console.log('Response:', data);
      toast.success("Login successful!");
      // Using both for maximum reliability: navigate for SPA transition, 
      // but window.location effectively clears any stale auth state if needed.
      // navigate("/"); 
      window.location.href = "/";
    },
    onError: (error) => {
      console.error('Login Error:', error);
      toast.error(error.message || "Invalid credentials");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { identifier, password };
    console.log('Submitting...', { identifier, password: '***' });
    
    if (!identifier || !password) {
      toast.error("Please fill in both fields");
      return;
    }
    
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md px-4"
      >
        <Card className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          <CardHeader className="text-center pb-6 pt-8 flex flex-col items-center">
            {/* Branding Zone: Premium Logo Lockup */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-white/10">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/50 drop-shadow-sm">
                Nexus
              </h1>
            </div>
            
            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground mt-4">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sign in with your 01Edu credentials
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium text-foreground/80 ml-1">Username / Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="name@student.1337.ma or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="rounded-xl h-11 bg-white/5 backdrop-blur-sm border-white/10 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground/80 ml-1">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="rounded-xl h-11 bg-white/5 backdrop-blur-sm border-white/10 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all"
                  required
                />
              </div>
              
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_-3px_var(--tw-shadow-color)] shadow-primary/30 transition-all font-medium text-base"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
