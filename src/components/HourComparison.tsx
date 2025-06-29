
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HourComparison } from '@/types/webhook';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const HourComparisonComponent: React.FC = () => {
  const [comparisons, setComparisons] = useState<HourComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900">Toegang Geweigerd</h1>
          <p className="text-gray-600">Alleen beheerders kunnen urenvergelijking bekijken.</p>
        </div>
      </div>
    );
  }

  const fetchComparisons = async () => {
    setLoading(true);
    try {
      console.log('Fetching hour comparisons...');
      
      // 1. Haal alle handmatige uren
      const { data: manualRaw, error: manualError } = await supabase
        .from('work_hours')
        .select('id, technician_id, date, hours_worked')
        .eq('is_manual_entry', true);

      if (manualError) {
        console.error('Error fetching manual hours:', manualError);
        toast({
          title: "Error",
          description: "Failed to fetch manual hours",
          variant: "destructive"
        });
        return;
      }

      // 2. Haal alle webhook-uren
      const { data: webhookRaw, error: webhookError } = await supabase
        .from('webhook_hours')
        .select('id, technician_id, date, hours_worked, verified');

      if (webhookError) {
        console.error('Error fetching webhook hours:', webhookError);
        toast({
          title: "Error",
          description: "Failed to fetch webhook hours",
          variant: "destructive"
        });
        return;
      }

      // 3. Haal namen van monteurs
      const { data: profilesRaw, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      const profilesMap = new Map<string, string>(
        (profilesRaw || []).map(p => [p.id, p.full_name || p.id])
      );

      // 4. Zet data in één array met bronlabel
      const manualData = (manualRaw || []).map(e => ({ ...e, source: 'manual' as const }));
      const webhookData = (webhookRaw || []).map(e => ({ ...e, source: 'webhook' as const }));
      const all = [...manualData, ...webhookData];

      // 5. Groepeer per monteur+datum
      type Slot = {
        technicianId: string;
        technicianName: string;
        date: string;
        manualHours: number;
        webhookHours: number;
        manualIds: string[];
        webhookIds: string[];
        verified: boolean;
      };
      const map = new Map<string, Slot>();

      all.forEach(e => {
        const key = `${e.technician_id}-${e.date}`;
        if (!map.has(key)) {
          map.set(key, {
            technicianId: e.technician_id,
            technicianName: profilesMap.get(e.technician_id) || 'Onbekend',
            date: e.date,
            manualHours: 0,
            webhookHours: 0,
            manualIds: [],
            webhookIds: [],
            verified: true, // start als true, en 'AND' met elke webhook-entry
          });
        }
        const slot = map.get(key)!;
        if (e.source === 'manual') {
          slot.manualHours += e.hours_worked;
          slot.manualIds.push(e.id);
        } else {
          slot.webhookHours += e.hours_worked;
          slot.webhookIds.push(e.id);
          slot.verified = slot.verified && Boolean(e.verified);
        }
      });

      // 6. Bouw de HourComparison-array
      const comps: HourComparison[] = Array.from(map.values()).map(it => ({
        technicianId: it.technicianId,
        technicianName: it.technicianName,
        date: it.date,
        manualHours: it.manualHours,
        webhookHours: it.webhookHours,
        manualIds: it.manualIds,
        webhookIds: it.webhookIds,
        verified: it.webhookIds.length > 0 && it.verified,
        difference: it.webhookHours - it.manualHours,
        status:
          it.manualHours === it.webhookHours ? 'match'
          : it.manualHours === 0         ? 'missing_manual'
          : it.webhookHours === 0        ? 'missing_webhook'
          : 'discrepancy'
      }));

      // Auto-verify exact matches ONLY
      for (const c of comps) {
        if (c.status === 'match' && c.webhookIds && c.webhookIds.length > 0 && !c.verified) {
          const { error: updateError } = await supabase
            .from('webhook_hours')
            .update({ 
              verified: true,
              verified_by: user?.id,
              verified_at: new Date().toISOString()
            })
            .in('id', c.webhookIds);
          
          if (!updateError) {
            c.verified = true;
          }
        }
      }

      console.log('Processed', comps.length, 'hour comparisons');
      setComparisons(comps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Error in fetchComparisons:', error);
      toast({
        title: "Error",
        description: "Failed to fetch comparison data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
  }, []);

  const handleRefresh = () => {
    console.log('Refreshing hour comparisons...');
    fetchComparisons();
  };

  const handleVerify = async (comp: HourComparison) => {
    if (!comp.webhookIds || comp.webhookIds.length === 0) {
      toast({
        title: "Error",
        description: "No webhook hours to verify",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Manually verifying webhook hours for', comp.technicianName, 'on', comp.date);
      
      const { error } = await supabase
        .from('webhook_hours')
        .update({ 
          verified: true,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .in('id', comp.webhookIds);

      if (error) {
        console.error('Error verifying webhook hours:', error);
        toast({
          title: "Error",
          description: "Failed to verify hours",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Hours verified for ${comp.technicianName}`,
      });

      // Refresh the data
      fetchComparisons();
    } catch (error) {
      console.error('Error in handleVerify:', error);
      toast({
        title: "Error",
        description: "Failed to verify hours",
        variant: "destructive"
      });
    }
  };

  const handleUnverify = async (comp: HourComparison) => {
    if (!comp.webhookIds || comp.webhookIds.length === 0) {
      toast({
        title: "Error",
        description: "No webhook hours to unverify",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Unverifying webhook hours for', comp.technicianName, 'on', comp.date);
      
      const { error } = await supabase
        .from('webhook_hours')
        .update({ 
          verified: false,
          verified_by: null,
          verified_at: null
        })
        .in('id', comp.webhookIds);

      if (error) {
        console.error('Error unverifying webhook hours:', error);
        toast({
          title: "Error",
          description: "Failed to unverify hours",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Hours unverified for ${comp.technicianName}`,
      });

      // Refresh the data
      fetchComparisons();
    } catch (error) {
      console.error('Error in handleUnverify:', error);
      toast({
        title: "Error",
        description: "Failed to unverify hours",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (s: string) =>
    s === 'match'       ? <CheckCircle className="h-5 w-5 text-green-600" />
  : s === 'discrepancy' ? <AlertTriangle className="h-5 w-5 text-yellow-600" />
  :                      <XCircle className="h-5 w-5 text-red-600" />;

  const getStatusColor = (s: string) =>
    s === 'match'       ? 'bg-green-100 text-green-800'
  : s === 'discrepancy' ? 'bg-yellow-100 text-yellow-800'
  :                      'bg-red-100 text-red-800';

  const getStatusText = (s: string) => {
    switch (s) {
      case 'match': return 'MATCH';
      case 'discrepancy': return 'DISCREPANTIE';
      case 'missing_manual': return 'MISSENDE MANUALE UREN';
      case 'missing_webhook': return 'MISSENDE WEBHOOK';
      default: return s.toUpperCase();
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Uren verificatie</h1>
            <p className="text-gray-600">Vergelijk en verifieer handmatige vs webhook uren</p>
          </div>
          <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700 text-white">
            <RefreshCw className="h-4 w-4 mr-2" /> Vernieuwen
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6 flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-sm text-gray-600">Matches</p>
                <p className="text-2xl font-bold text-gray-900">
                  {comparisons.filter(c => c.status === 'match').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6 flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600 mr-4" />
              <div>
                <p className="text-sm text-gray-600">Discrepancies</p>
                <p className="text-2xl font-bold text-gray-900">
                  {comparisons.filter(c => c.status === 'discrepancy').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6 flex items-center">
              <XCircle className="h-8 w-8 text-red-600 mr-4" />
              <div>
                <p className="text-sm text-gray-600">Missende</p>
                <p className="text-2xl font-bold text-gray-900">
                  {comparisons.filter(c => c.status.includes('missing')).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6 flex items-center">
              <CheckCircle className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-900">
                  {comparisons.filter(c => c.verified).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Vergelijk resultaat ({comparisons.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Monteur</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Datum</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Handmatige Uren</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Webhook Uren</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Verschil</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c, i) => (
                    <tr
                      key={`${c.technicianId}-${c.date}`}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${c.verified ? 'bg-green-50' : ''}`}
                    >
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(c.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                            {getStatusText(c.status)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-medium text-gray-900">{c.technicianName}</td>
                      <td className="py-3 text-gray-700">{new Date(c.date).toLocaleDateString('nl-NL')}</td>
                      <td className="py-3 text-gray-700">{c.manualHours.toFixed(1)}h</td>
                      <td className="py-3 text-gray-700">{c.webhookHours.toFixed(1)}h</td>
                      <td className={`py-3 font-medium ${
                        c.difference > 0 ? 'text-green-600' : 
                        c.difference < 0 ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {c.difference > 0 ? `+${c.difference.toFixed(1)}h` : `${c.difference.toFixed(1)}h`}
                      </td>
                      <td className="py-3">
                        {c.verified ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-green-700 font-medium flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verified
                            </span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUnverify(c)}
                              className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Unverify
                            </Button>
                          </div>
                        ) : c.webhookIds && c.webhookIds.length > 0 ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleVerify(c)}
                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        ) : (
                          <span className="text-gray-500">Geen webhook gegevens</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {comparisons.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        Geen vergelijkingsgegevens beschikbaar
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

export default HourComparisonComponent;
