
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateProfileName, validateWhatsApp } from '@/utils/inputValidation';

interface ProfileFormProps {
  profile: any;
  onProfileUpdate: (updatedProfile: any) => void;
}

export function ProfileForm({ profile, onProfileUpdate }: ProfileFormProps) {
  const [name, setName] = useState(profile?.name || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: { name?: string; whatsapp?: string } = {};
    
    const nameValidation = validateProfileName(name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }
    
    const whatsappValidation = validateWhatsApp(whatsapp);
    if (!whatsappValidation.isValid) {
      newErrors.whatsapp = whatsappValidation.error;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          whatsapp: whatsapp.trim() || null,
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      onProfileUpdate(data);
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    
    // Limpar erro quando usuário começar a digitar
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWhatsapp(value);
    
    // Limpar erro quando usuário começar a digitar
    if (errors.whatsapp) {
      setErrors(prev => ({ ...prev, whatsapp: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="Seu nome completo"
          className={errors.name ? 'border-red-500' : ''}
          disabled={loading}
          required
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          type="tel"
          value={whatsapp}
          onChange={handleWhatsappChange}
          placeholder="+55 (11) 99999-9999"
          className={errors.whatsapp ? 'border-red-500' : ''}
          disabled={loading}
        />
        {errors.whatsapp && (
          <p className="text-red-500 text-sm">{errors.whatsapp}</p>
        )}
        <p className="text-gray-500 text-sm">
          Formato: +55 (XX) 9XXXX-XXXX
        </p>
      </div>

      <Button 
        type="submit" 
        disabled={loading || Object.keys(errors).length > 0}
        className="w-full"
      >
        {loading ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  );
}
