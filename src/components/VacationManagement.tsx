
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { VacationRequest } from '@/types/vacation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const VacationManagement = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    startDate: '',
    endDate: '',
    description: ''
  });

  const isAdmin = currentUser?.role === 'admin';
  const isTechnician = currentUser?.role === 'technician';

  useEffect(() => {
    fetchVacationRequests();
  }, [currentUser]);

  const fetchVacationRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('vacation_requests')
        .select(`
          *,
          profiles!vacation_requests_technician_id_fkey(full_name),
          approver:profiles!vacation_requests_approved_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      // If not admin, only show own requests
      if (!isAdmin) {
        query = query.eq('technician_id', currentUser?.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vacation requests:', error);
        toast({
          title: "Error",
          description: "Failed to fetch vacation requests",
          variant: "destructive"
        });
        return;
      }

      const formattedRequests: VacationRequest[] = (data || []).map(request => ({
        id: request.id,
        technicianId: request.technician_id,
        technicianName: request.profiles?.full_name || 'Unknown',
        startDate: request.start_date,
        endDate: request.end_date,
        description: request.description || '',
        status: request.status,
        createdAt: request.created_at,
        approvedBy: request.approver?.full_name,
        approvedAt: request.approved_at,
        rejectionReason: request.rejection_reason
      }));

      setVacationRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching vacation requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vacation requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRequest.startDate || !newRequest.endDate) {
      toast({
        title: "Error",
        description: "Vul alle vereiste velden in",
        variant: "destructive"
      });
      return;
    }

    if (new Date(newRequest.startDate) > new Date(newRequest.endDate)) {
      toast({
        title: "Error",
        description: "Einddatum moet na startdatum zijn",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('vacation_requests')
        .insert([{
          technician_id: currentUser?.id,
          start_date: newRequest.startDate,
          end_date: newRequest.endDate,
          description: newRequest.description,
          status: 'pending'
        }]);

      if (error) {
        console.error('Error creating vacation request:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Vakantieaanvraag succesvol ingediend"
      });

      setNewRequest({ startDate: '', endDate: '', description: '' });
      setShowRequestForm(false);
      fetchVacationRequests();
    } catch (error) {
      console.error('Error creating vacation request:', error);
      toast({
        title: "Error",
        description: "Kon vakantieaanvraag niet indienen",
        variant: "destructive"
      });
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('vacation_requests')
        .update({
          status: 'approved',
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error approving request:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Vakantieaanvraag goedgekeurd"
      });

      fetchVacationRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Kon aanvraag niet goedkeuren",
        variant: "destructive"
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const reason = window.prompt("Reden voor afwijzing (optioneel):");
    
    try {
      const { error } = await supabase
        .from('vacation_requests')
        .update({
          status: 'rejected',
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason || undefined
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting request:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Vakantieaanvraag afgewezen"
      });

      fetchVacationRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Kon aanvraag niet afwijzen",
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vakantie Beheer</h1>
          <p className="text-gray-600">
            {isAdmin ? 'Beheer vakantieaanvragen van monteurs' : 'Beheer je vakantieaanvragen'}
          </p>
        </div>

        {/* Request Form for Technicians */}
        {isTechnician && (
          <>
            <div className="mb-6 flex justify-end">
              <Button
                onClick={() => setShowRequestForm(!showRequestForm)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {showRequestForm ? 'Annuleren' : 'Vakantie Aanvragen'}
              </Button>
            </div>

            {showRequestForm && (
              <Card className="bg-white mb-6 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Nieuwe Vakantieaanvraag</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Startdatum *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newRequest.startDate}
                        onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Einddatum *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newRequest.endDate}
                        onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                        min={newRequest.startDate || new Date().toISOString().split('T')[0]}
                        required
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="description">Beschrijving (optioneel)</Label>
                      <Textarea
                        id="description"
                        value={newRequest.description}
                        onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                        placeholder="Extra informatie over je vakantieaanvraag..."
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                        Aanvraag Indienen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Vacation Requests Table */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {isAdmin ? 'Alle Vakantieaanvragen' : 'Mijn Vakantieaanvragen'} ({vacationRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    {isAdmin && <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>}
                    <th className="pb-3 text-sm font-medium text-gray-600">Startdatum</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Einddatum</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Beschrijving</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Aangemaakt</th>
                    {isAdmin && <th className="pb-3 text-sm font-medium text-gray-600">Acties</th>}
                  </tr>
                </thead>
                <tbody>
                  {vacationRequests.map((request) => (
                    <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {isAdmin && (
                        <td className="py-3 font-medium text-gray-900">
                          {request.technicianName}
                        </td>
                      )}
                      <td className="py-3 text-gray-700">
                        {new Date(request.startDate).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="py-3 text-gray-700">
                        {new Date(request.endDate).toLocaleDateString('nl-NL')}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                          request.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : request.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                          {request.status === 'rejected' && <XCircle className="h-3 w-3" />}
                          {request.status === 'pending' && <AlertCircle className="h-3 w-3" />}
                          {request.status === 'approved' ? 'Goedgekeurd' : 
                           request.status === 'rejected' ? 'Afgewezen' : 'In behandeling'}
                        </span>
                      </td>
                      <td className="py-3 text-gray-700">
                        {request.description || '-'}
                        {request.rejectionReason && (
                          <div className="text-red-600 text-sm mt-1">
                            Reden: {request.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-gray-700">
                        {new Date(request.createdAt).toLocaleDateString('nl-NL')}
                      </td>
                      {isAdmin && (
                        <td className="py-3">
                          {request.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveRequest(request.id)}
                                className="text-green-600 hover:text-green-800 border-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Goedkeuren
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectRequest(request.id)}
                                className="text-red-600 hover:text-red-800 border-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Afwijzen
                              </Button>
                            </div>
                          )}
                          {request.status !== 'pending' && (
                            <span className="text-sm text-gray-500">
                              {request.status === 'approved' ? 'Goedgekeurd' : 'Afgewezen'} door {request.approvedBy}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {vacationRequests.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-gray-500">
                        Geen vakantieaanvragen gevonden
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

export default VacationManagement;
