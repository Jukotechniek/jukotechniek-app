
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Check, X } from 'lucide-react';

interface ClientPermission {
  id: string;
  clientId: string;
  clientName: string;
  canAssignTechnicians: boolean;
  grantedBy: string;
  grantedAt: string;
}

const ClientPermissions = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [clients, setClients] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<ClientPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchClientsAndPermissions();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchClientsAndPermissions = async () => {
    setLoading(true);
    try {
      // Fetch all opdrachtgevers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'opdrachtgever')
        .order('full_name');

      if (profilesError) {
        console.error('Error fetching clients:', profilesError);
        toast({
          title: "Error",
          description: "Failed to fetch clients",
          variant: "destructive"
        });
        return;
      }

      const formattedClients: User[] = (profiles || []).map(profile => ({
        id: profile.id,
        username: profile.username || '',
        email: '',
        role: 'opdrachtgever' as const,
        fullName: profile.full_name || '',
        createdAt: profile.created_at || new Date().toISOString()
      }));

      setClients(formattedClients);

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('client_permissions')
        .select(`
          *,
          profiles!client_permissions_client_id_fkey(full_name),
          granter:profiles!client_permissions_granted_by_fkey(full_name)
        `);

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError);
        return;
      }

      const formattedPermissions: ClientPermission[] = (permissionsData || []).map(permission => ({
        id: permission.id,
        clientId: permission.client_id,
        clientName: permission.profiles?.full_name || 'Unknown',
        canAssignTechnicians: permission.can_assign_technicians,
        grantedBy: permission.granter?.full_name || 'Unknown',
        grantedAt: permission.granted_at
      }));

      setPermissions(formattedPermissions);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (clientId: string, currentPermission: boolean) => {
    try {
      if (currentPermission) {
        // Remove permission
        const { error } = await supabase
          .from('client_permissions')
          .delete()
          .eq('client_id', clientId);

        if (error) {
          console.error('Error removing permission:', error);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
          return;
        }
      } else {
        // Grant permission
        const { error } = await supabase
          .from('client_permissions')
          .insert([{
            client_id: clientId,
            can_assign_technicians: true,
            granted_by: currentUser?.id
          }]);

        if (error) {
          console.error('Error granting permission:', error);
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: currentPermission ? "Rechten ingetrokken" : "Rechten toegekend"
      });

      fetchClientsAndPermissions();
    } catch (error) {
      console.error('Error toggling permission:', error);
      toast({
        title: "Error",
        description: "Kon rechten niet wijzigen",
        variant: "destructive"
      });
    }
  };

  const getPermissionForClient = (clientId: string) => {
    return permissions.find(p => p.clientId === clientId);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Geen Toegang</h1>
            <p className="text-gray-600">Alleen administrators kunnen deze pagina bekijken.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Opdrachtgever Rechten</h1>
          <p className="text-gray-600">Beheer welke opdrachtgevers monteurs kunnen toewijzen aan projecten</p>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-red-600" />
              Opdrachtgevers ({clients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-600">Naam</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Gebruikersnaam</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Toegekend door</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const permission = getPermissionForClient(client.id);
                    const hasPermission = !!permission;
                    
                    return (
                      <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">
                          {client.fullName}
                        </td>
                        <td className="py-3 text-gray-700">
                          {client.username}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                            hasPermission
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {hasPermission ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {hasPermission ? 'Mag monteurs toewijzen' : 'Geen rechten'}
                          </span>
                        </td>
                        <td className="py-3 text-gray-700">
                          {permission ? (
                            <div>
                              <div>{permission.grantedBy}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(permission.grantedAt).toLocaleDateString('nl-NL')}
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePermission(client.id, hasPermission)}
                            className={
                              hasPermission
                                ? "text-red-600 hover:text-red-800 border-red-600"
                                : "text-green-600 hover:text-green-800 border-green-600"
                            }
                          >
                            {hasPermission ? 'Rechten Intrekken' : 'Rechten Toekennen'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Geen opdrachtgevers gevonden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientPermissions;
