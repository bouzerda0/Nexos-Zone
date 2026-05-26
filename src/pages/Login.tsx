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
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="w-full max-w-md border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-12 h-12 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-4 border border-primary/20">
              <Fingerprint className="w-6 h-6" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Zone01 Intra</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sign in with your 01Edu credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Username / Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="name@student.1337.ma or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                  required
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
                  disabled={loginMutation.isPending}
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
