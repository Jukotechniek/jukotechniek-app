
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
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'technician' as 'admin' | 'technician',
    password: ''
  });

  // Fetch users from Supabase
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const formattedUsers: User[] = data.map(profile => ({
        id: profile.id,
        username: profile.username || '',
        email: profile.username?.includes('@') ? profile.username : `${profile.username}@jukotechniek.nl`,
        role: (profile.role === 'admin' || profile.role === 'technician') ? profile.role : 'technician',
        fullName: profile.full_name || '',
        createdAt: profile.created_at
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.username || !newUser.email || !newUser.fullName || !newUser.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        user_metadata: {
          username: newUser.username,
          full_name: newUser.fullName,
          role: newUser.role
        },
        email_confirm: true
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `User ${newUser.fullName} added successfully`
      });

      setNewUser({
        username: '',
        email: '',
        fullName: '',
        role: 'technician',
        password: ''
      });
      setShowAddForm(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = async (user: User) => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editingUser.username,
          full_name: editingUser.fullName,
          role: editingUser.role
        })
        .eq('id', editingUser.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `User ${editingUser.fullName} updated successfully`
      });

      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Error",
        description: "Cannot delete your own account",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user ${userName}?`)) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `User ${userName} deleted successfully`
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            <p className="text-gray-600">Manage admin and technician accounts</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {showAddForm ? 'Cancel' : 'Add User'}
          </Button>
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Add New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    placeholder="John Doe"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="johndoe"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@jukotechniek.nl"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'technician' })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                    Add User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-600">Name</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Username</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Email</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Role</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Created</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">
                        {editingUser?.id === user.id ? (
                          <Input
                            value={editingUser.fullName}
                            onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          user.fullName
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
                            <option value="technician">Technician</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-700">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex space-x-2">
                          {editingUser?.id === user.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(editingUser)}
                                className="text-green-600 hover:text-green-800"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(null)}
                                className="text-gray-600 hover:text-gray-800"
                              >
                                Cancel
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
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id, user.fullName)}
                                className="text-red-600 hover:text-red-800 hover:border-red-600"
                                disabled={user.id === currentUser?.id}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;
