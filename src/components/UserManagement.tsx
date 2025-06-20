
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const UserManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingCurrentUser, setEditingCurrentUser] = useState(false);
  const [currentUserForm, setCurrentUserForm] = useState({
    username: currentUser?.username || '',
    fullName: currentUser?.fullName || '',
    email: currentUser?.email || ''
  });
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'technician' as 'admin' | 'technician',
    password: ''
  });

  // Update form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCurrentUserForm({
        username: currentUser.username || '',
        fullName: currentUser.fullName || '',
        email: currentUser.email || ''
      });
    }
  }, [currentUser]);

  // Fetch users from Supabase auth.users and profiles
  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('Fetching users from auth and profiles...');
      
      // Get all users through the admin-users edge function
      const { data: adminData, error: adminError } = await supabase.functions.invoke('admin-users', {
        body: { action: 'listUsers' }
      });

      if (adminError) {
        console.error('Error fetching auth users:', adminError);
        toast({
          title: "Error",
          description: "Failed to fetch users from authentication",
          variant: "destructive"
        });
        return;
      }

      const authUsers = adminData as { users: any[] };

      // Get profiles data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Merge auth users with profiles
      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      
      const formattedUsers: User[] = (authUsers.users || []).map(authUser => {
        const profile = profilesMap.get(authUser.id);
        return {
          id: authUser.id,
          username: profile?.username || authUser.email || '',
          email: authUser.email || '',
          role: (profile?.role === 'admin' || profile?.role === 'technician') ? profile.role : 'technician',
          fullName: profile?.full_name || authUser.user_metadata?.full_name || '',
          createdAt: authUser.created_at
        };
      });

      console.log('Fetched', formattedUsers.length, 'users from auth and profiles');
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const handleUpdateCurrentUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;

    try {
      console.log('Updating current user profile...');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          username: currentUserForm.username,
          full_name: currentUserForm.fullName
        })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Je gegevens zijn succesvol bijgewerkt"
      });

      setEditingCurrentUser(false);
      if (currentUser?.role === 'admin') {
        fetchUsers();
      }
      
      // Refresh auth context by signing out and back in
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Er ging iets mis bij het bijwerken van je gegevens",
        variant: "destructive"
      });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.username || !newUser.email || !newUser.fullName || !newUser.password) {
      toast({
        title: "Error",
        description: "Vul alle vereiste velden in",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating new user:', newUser.email);
      
      // Create the auth user via the admin-users edge function
      const { data: createData, error: createError } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'createUser',
          email: newUser.email,
          password: newUser.password,
          user_metadata: {
            username: newUser.username,
            full_name: newUser.fullName,
            role: newUser.role
          }
        }
      });

      if (createError) {
        console.error('Auth creation error:', createError);
        toast({
          title: "Error",
          description: createError.message,
          variant: "destructive"
        });
        return;
      }

      if (!createData || !('user' in createData)) {
        toast({
          title: "Error",
          description: "Failed to create user",
          variant: "destructive"
        });
        return;
      }

      // Create/update the profile (the trigger should handle this, but let's be sure)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: (createData as any).user.id,
          username: newUser.username,
          full_name: newUser.fullName,
          role: newUser.role
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail completely, as the trigger might have handled it
      }

      toast({
        title: "Success",
        description: `Gebruiker ${newUser.fullName} succesvol toegevoegd`
      });

      setNewUser({
        username: '',
        email: '',
        fullName: '',
        role: 'technician',
        password: ''
      });
      setShowAddForm(false);
      
      // Refresh users list
      setTimeout(fetchUsers, 1000);
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Kon gebruiker niet aanmaken",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      console.log('Updating user:', editingUser.id);
      
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: editingUser.username,
          full_name: editingUser.fullName,
          role: editingUser.role
        })
        .eq('id', editingUser.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        toast({
          title: "Error",
          description: profileError.message,
          variant: "destructive"
        });
        return;
      }

      // Update auth user metadata via edge function
      const { error: authError } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'updateUser',
          id: editingUser.id,
          update: {
            user_metadata: {
              username: editingUser.username,
              full_name: editingUser.fullName,
              role: editingUser.role
            }
          }
        }
      });

      if (authError) {
        console.error('Error updating auth user:', authError);
        // Don't fail completely, profile update was successful
      }

      toast({
        title: "Success",
        description: `Gebruiker ${editingUser.fullName} succesvol bijgewerkt`
      });

      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Kon gebruiker niet bijwerken",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Error",
        description: "Je kunt je eigen account niet verwijderen",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm(`Weet je zeker dat je gebruiker ${userName} wilt verwijderen?`)) {
      return;
    }

    try {
      console.log('Deleting user:', userId);
      
      const { error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'deleteUser', id: userId }
      });

      if (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Error",
          description: (error as any).message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Gebruiker ${userName} succesvol verwijderd`
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Kon gebruiker niet verwijderen",
        variant: "destructive"
      });
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gebruikersbeheer</h1>
          <p className="text-gray-600">Beheer admin en monteur accounts</p>
        </div>

        {/* Current User Profile */}
        <Card className="bg-white mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
              👤 Mijn Account ({currentUser?.role})
              <Button
                onClick={() => setEditingCurrentUser(!editingCurrentUser)}
                variant="outline"
                size="sm"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                {editingCurrentUser ? 'Annuleren' : 'Bewerken'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingCurrentUser ? (
              <form onSubmit={handleUpdateCurrentUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentFullName">Volledige Naam</Label>
                  <Input
                    id="currentFullName"
                    value={currentUserForm.fullName}
                    onChange={(e) => setCurrentUserForm({ ...currentUserForm, fullName: e.target.value })}
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentUsername">Gebruikersnaam</Label>
                  <Input
                    id="currentUsername"
                    value={currentUserForm.username}
                    onChange={(e) => setCurrentUserForm({ ...currentUserForm, username: e.target.value })}
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentEmail">Email (alleen-lezen)</Label>
                  <Input
                    id="currentEmail"
                    value={currentUserForm.email}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div className="md:col-span-2 flex space-x-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    Opslaan
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setEditingCurrentUser(false)}
                  >
                    Annuleren
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Volledige Naam</p>
                  <p className="font-medium">{currentUser?.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Gebruikersnaam</p>
                  <p className="font-medium">{currentUser?.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{currentUser?.email}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin-only sections */}
        {currentUser?.role === 'admin' && (
          <>
            {/* Add User Button and Form */}
            <div className="mb-6 flex justify-end">
              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {showAddForm ? 'Annuleren' : 'Gebruiker Toevoegen'}
              </Button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
              <Card className="bg-white mb-6 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Nieuwe Gebruiker Toevoegen</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Volledige Naam *</Label>
                      <Input
                        id="fullName"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                        placeholder="Jan de Jong"
                        required
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Gebruikersnaam *</Label>
                      <Input
                        id="username"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="jan.dejong"
                        required
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="jan@jukotechniek.nl"
                        required
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Wachtwoord *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rol *</Label>
                      <select
                        id="role"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'technician' })}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="technician">Monteur</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                        Gebruiker Toevoegen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Users Table */}
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Gebruikers ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="pb-3 text-sm font-medium text-gray-600">Naam</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Gebruikersnaam</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Email</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Rol</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Aangemaakt</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${user.id === currentUser?.id ? 'bg-blue-50' : ''}`}>
                          <td className="py-3 font-medium text-gray-900">
                            {editingUser?.id === user.id ? (
                              <Input
                                value={editingUser.fullName}
                                onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              <>
                                {user.fullName}
                                {user.id === currentUser?.id && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">(Jij)</span>}
                              </>
                            )}
                          </td>
                          <td className="py-3 text-gray-700">
                            {editingUser?.id === user.id ? (
                              <Input
                                value={editingUser.username}
                                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                                className="h-8"
                              />
                            ) : (
                              user.username
                            )}
                          </td>
                          <td className="py-3 text-gray-700">{user.email}</td>
                          <td className="py-3">
                            {editingUser?.id === user.id ? (
                              <select
                                value={editingUser.role}
                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'technician' })}
                                className="h-8 px-2 border border-gray-300 rounded text-sm"
                              >
                                <option value="technician">Monteur</option>
                                <option value="admin">Admin</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'admin'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Monteur'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-gray-700">
                            {new Date(user.createdAt).toLocaleDateString('nl-NL')}
                          </td>
                          <td className="py-3">
                            <div className="flex space-x-2">
                              {editingUser?.id === user.id ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleEditUser}
                                    className="text-green-600 hover:text-green-800 border-green-600"
                                  >
                                    Opslaan
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingUser(null)}
                                    className="text-gray-600 hover:text-gray-800"
                                  >
                                    Annuleren
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingUser(user)}
                                    className="text-gray-600 hover:text-gray-800"
                                  >
                                    Bewerken
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id, user.fullName)}
                                    className="text-red-600 hover:text-red-800 hover:border-red-600"
                                    disabled={user.id === currentUser?.id}
                                  >
                                    Verwijderen
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            Geen gebruikers gevonden
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
