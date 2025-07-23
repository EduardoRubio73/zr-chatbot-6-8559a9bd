
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface GroupCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
  groupName: string;
  setGroupName: (name: string) => void;
  selectedUsers: string[];
  setSelectedUsers: (users: string[]) => void;
  users: any[];
}

export default function GroupCreationModal({
  isOpen,
  onClose,
  onCreateGroup,
  groupName,
  setGroupName,
  selectedUsers,
  setSelectedUsers,
  users
}: GroupCreationModalProps) {
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(
      selectedUsers.includes(userId)
        ? selectedUsers.filter(id => id !== userId)
        : [...selectedUsers, userId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Grupo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Nome do grupo"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded"
              >
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onCheckedChange={() => toggleUserSelection(user.id)}
                />
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
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onCreateGroup} disabled={!groupName.trim() || selectedUsers.length === 0}>
              Criar Grupo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
