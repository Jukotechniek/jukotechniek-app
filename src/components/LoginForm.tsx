
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const LoginForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [credentials, setCredentials] = useState({ 
    username: '', 
    password: '', 
    email: '', 
    fullName: '' 
  });
  const [loading, setLoading] = useState(false);
  const { login, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let success = false;
      
      if (isSignUp) {
        if (!credentials.email || !credentials.fullName) {
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        success = await signUp({
          username: credentials.username,
          password: credentials.password,
          email: credentials.email,
          fullName: credentials.fullName
        });
        
        if (success) {
          toast({
            title: "Account Created",
            description: "Please check your email to confirm your account"
          });
        }
      } else {
        success = await login({
          username: credentials.username,
          password: credentials.password
        });
        
        if (success) {
          toast({
            title: "Login Successful",
            description: "Welcome to JukoTechniek Work Hours"
          });
        }
      }
      
      if (!success) {
        toast({
          title: isSignUp ? "Signup Failed" : "Login Failed",
          description: isSignUp ? "Please check your information and try again" : "Invalid username or password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `An error occurred during ${isSignUp ? 'signup' : 'login'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-black">JukoTechniek</h1>
            <div className="w-16 h-1 bg-red-600 mx-auto mt-2"></div>
          </div>
          <CardTitle className="text-xl text-gray-800">
            {isSignUp ? 'Create Account' : 'Work Hours Tracker'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={credentials.fullName}
                    onChange={(e) => setCredentials({ ...credentials, fullName: e.target.value })}
                    placeholder="Enter your full name"
                    required
                    className="border-gray-300 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                    className="border-gray-300 focus:border-red-500"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                placeholder="Enter your username"
                required
                className="border-gray-300 focus:border-red-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="Enter your password"
                required
                className="border-gray-300 focus:border-red-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? (isSignUp ? 'Creating Account...' : 'Logging in...') : (isSignUp ? 'Create Account' : 'Login')}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-red-600 hover:text-red-700"
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginForm;
