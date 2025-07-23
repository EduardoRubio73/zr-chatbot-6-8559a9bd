
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface UserSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (userId: string) => void;
  users: any[];
}

export default function UserSelectionModal({ isOpen, onClose, onUserSelect, users }: UserSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Usuário</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Buscar usuário..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer"
                onClick={() => {
                  onUserSelect(user.id);
                  onClose();
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback>
                    {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{user.name || user.email}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
