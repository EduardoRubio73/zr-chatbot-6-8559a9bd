
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
            data: {
              name: email.split('@')[0]
            }
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          // Create user profile
          await supabase.from('users').insert({
            id: data.user.id,
            name: email.split('@')[0],
            email: email,
          });
          
          toast({
            title: "Conta criada!",
            description: "Complete seu perfil para começar.",
          });
          
          // Login automaticamente após criar conta
          navigate('/profile');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        toast({
          title: "Login realizado!",
          description: "Bem-vindo ao ZRChat",
        });
        
        navigate('/chat');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="w-96 bg-white shadow-lg rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-green-700 mb-2">ZRChat</h1>
          <p className="text-gray-600">
            {isSignUp ? 'Criar nova conta' : 'Entre na sua conta'}
          </p>
        </div>
        
        <form method="post" onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="Email" 
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="Senha" 
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !email || !password}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
          >
            {loading ? 'Processando...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>
        
        <div className="text-center mt-6">
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            {isSignUp ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}
