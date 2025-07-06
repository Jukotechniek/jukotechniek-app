import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const LoginForm = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const success = await login({
        email: credentials.email,
        password: credentials.password,
      });
      if (!success) {
        toast({
          title: 'Login mislukt',
          description: 'Verkeerde email of wachtwoord',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Foutmelding',
        description: 'Er is een fout opgetreden tijdens het inloggen. Probeer het later opnieuw.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Reset email verzonden',
          description: 'Kijk in je inbox voor verdere instructies.',
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Er is een fout opgetreden bij het verzenden van de reset email. Probeer het later opnieuw.',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Achtergrondfoto */}
      <div className="absolute inset-0 z-0">
        <img
          src="/Juko_Achtergrond.jpg" // <-- Zet hier jouw industrie-foto
          alt="Achtergrond"
          className="object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      {/* Login card */}
     <motion.div
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className="relative z-10 flex flex-col w-full items-center justify-center min-h-screen"
>
  <Card
    className="
      w-full
      max-w-xs
      sm:max-w-md
      px-2 py-6
      sm:px-8 sm:py-10
      border-2 border-black/10
      rounded-2xl
      shadow-2xl
      bg-white/95
      backdrop-blur-lg
      mx-2
      sm:mx-auto
      overflow-hidden"
  >
    <CardHeader className="text-center pb-8">
      <img
        src="/logo_WEB.png"
        alt="JukoTechniek Logo"
        className="mx-auto mb-4 h-14 w-auto sm:h-20 md:h-24 drop-shadow-md"
      />
      <CardTitle className="text-lg text-gray-700 mt-6">
        {showForgotPassword ? 'Wachtwoord vergeten' : 'Log in om verder te gaan'}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {showForgotPassword ? (
        <form onSubmit={handleForgotPassword} className="space-y-5 animate-in fade-in">
          <div>
            <Label htmlFor="resetEmail" className="text-gray-700 font-medium">E-mail adres</Label>
            <Input
              id="resetEmail"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="Vul je e-mailadres in"
              required
              className="mt-2 rounded-xl border-gray-300 focus:border-red-600 focus:ring-red-600 transition"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl font-semibold bg-red-600 hover:bg-red-700 transition text-white shadow"
            disabled={resetLoading}
          >
            {resetLoading ? 'Verzenden...' : 'Stuur reset e-mail'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-xl text-gray-500 hover:text-black"
            onClick={() => setShowForgotPassword(false)}
          >
            Terug naar login
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in">
          <div>
            <Label htmlFor="email" className="text-gray-700 font-medium">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              placeholder="Vul je e-mailadres in"
              required
              className="mt-2 rounded-xl border-gray-300 focus:border-red-600 focus:ring-red-600 transition"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-gray-700 font-medium">Wachtwoord</Label>
            <Input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Vul je wachtwoord in"
              required
              className="mt-2 rounded-xl border-gray-300 focus:border-red-600 focus:ring-red-600 transition"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl font-semibold bg-red-600 hover:bg-red-700 transition text-white shadow"
            disabled={loading}
          >
            {loading ? 'Bezig...' : 'Login'}
          </Button>
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-red-600 hover:underline hover:text-red-700 transition"
              onClick={() => setShowForgotPassword(true)}
            >
              Wachtwoord vergeten?
            </button>
          </div>
        </form>
      )}
    </CardContent>
  </Card>
  <div className="text-center mt-8">
    <span className="text-xs text-white drop-shadow">&copy; {new Date().getFullYear()} JukoTechniek - All rights reserved.</span>
  </div>
</motion.div>




    </div>
  );
};

export default LoginForm;
