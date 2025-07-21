import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarUpload from '@/components/profile/AvatarUpload';
import { ProfileForm } from '@/components/profile/ProfileForm';

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  whatsapp?: string;
  avatar_url?: string;
}

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      console.log('Loading user profile...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, redirecting to login');
        navigate('/login');
        return;
      }

      setUser(user);
      console.log('User loaded:', user.id);
      
      // Try to load existing profile first
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to avoid errors when no data found
        
      if (profileError) {
        console.error('Error loading profile:', profileError);
        return;
      }

      if (!profile) {
        // Create profile if it doesn't exist
        console.log('No profile found, creating new one...');
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || ''
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating profile:', createError);
          return;
        }
        
        console.log('Profile created:', newProfile);
        setProfile(newProfile);
      } else {
        console.log('Profile loaded:', profile);
        setProfile(profile);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setProfile(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : null);
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    setProfile(updatedProfile);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-green-600">Carregando perfil...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Erro ao carregar perfil</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/chat')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold">Perfil</h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={profile.avatar_url}
              userName={profile.name}
              onAvatarUpdate={handleAvatarUpdate}
            />
          </CardHeader>
          
          <CardContent>
            <ProfileForm
              profile={profile}
              onProfileUpdate={handleProfileUpdate}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
