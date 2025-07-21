
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
    isIARA?: boolean;
    user_id?: string;
  } | null;
}

export default function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil do Usuário</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-6">
          <Avatar className="h-32 w-32">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-2xl">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-semibold">{user.name}</h2>
              {user.isIARA && (
                <Badge className="bg-red-500 text-white">AI Assistant</Badge>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-muted-foreground">
                {user.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
