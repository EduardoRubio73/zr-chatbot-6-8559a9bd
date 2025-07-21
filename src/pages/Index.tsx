
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/chat');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="animate-pulse text-green-600">Carregando...</div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to chat
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <Card className="w-96 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-green-700">ZRChat</CardTitle>
          <p className="text-gray-600">Sistema de chat inteligente</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-700">
            Bem-vindo ao ZRChat! Faça login para começar a conversar.
          </p>
          <Button 
            onClick={() => navigate('/login')}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Fazer Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
