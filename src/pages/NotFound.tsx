
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <Card className="w-96 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">Página não encontrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            A página que você está procurando não existe.
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Voltar ao Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
