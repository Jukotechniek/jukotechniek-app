import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertTriangle, XCircle, Webhook, RefreshCw, Plus, Minus } from 'lucide-react';

interface HourImport {
  id: string;
  technician_id: string;
  date: string;
  webhook_hours: number;
  manual_hours: number | null;
  difference: number;
  status: string;
  created_at: string;
  technician_name?: string;
}

const HourComparisonComponent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hourImports, setHourImports] = useState<HourImport[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWebhookSetup, setShowWebhookSetup] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchHourImports();
    }
  }, [isAdmin]);

  const fetchHourImports = async () => {
    try {
      setIsLoading(true);
      
      // First get hour imports
      const { data: hourImportsData, error: hourImportsError } = await supabase
        .from('hour_imports')
        .select('*')
        .order('created_at', { ascending: false });

      if (hourImportsError) throw hourImportsError;

      // Then get profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (profilesError) throw profilesError;

      // Combine the data
      const transformedData = hourImportsData?.map(item => {
        const profile = profilesData?.find(p => p.id === item.technician_id);
        return {
          ...item,
          technician_name: profile?.full_name || 'Onbekend'
        };
      }) || [];
      
      setHourImports(transformedData);
    } catch (error) {
      console.error('Error fetching hour imports:', error);
      toast({
        title: "Fout",
        description: "Kon vergelijkingsdata niet laden",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Toegang Geweigerd</h2>
              <p className="text-gray-600">Alleen beheerders kunnen toegang krijgen tot urenvergelijking.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusIcon = (difference: number) => {
    if (difference === 0) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (Math.abs(difference) <= 1) {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusColor = (difference: number) => {
    if (difference === 0) {
      return 'bg-green-100 text-green-800';
    } else if (Math.abs(difference) <= 1) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-red-100 text-red-800';
    }
  };

  const getDifferenceDisplay = (difference: number) => {
    if (difference === 0) {
      return (
        <span className="flex items-center text-green-600 font-medium">
          <CheckCircle className="h-4 w-4 mr-1" />
          Perfect match
        </span>
      );
    } else if (difference > 0) {
      return (
        <span className="flex items-center text-green-600 font-medium">
          <Plus className="h-4 w-4 mr-1" />
          +{difference}u meer
        </span>
      );
    } else {
      return (
        <span className="flex items-center text-red-600 font-medium">
          <Minus className="h-4 w-4 mr-1" />
          {Math.abs(difference)}u minder
        </span>
      );
    }
  };

  const handleWebhookSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl) {
      toast({
        title: "Fout",
        description: "Voer een webhook URL in",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const testData = {
        test: true,
        message: 'JukoTechniek webhook test',
        timestamp: new Date().toISOString()
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(testData),
      });

      toast({
        title: "Succes",
        description: "Webhook succesvol geconfigureerd"
      });

      setShowWebhookSetup(false);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon webhook niet configureren",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchHourImports();
  };

  const matchCount = hourImports.filter(h => h.difference === 0).length;
  const discrepancyCount = hourImports.filter(h => h.difference !== 0 && Math.abs(h.difference) <= 1).length;
  const majorDiscrepancyCount = hourImports.filter(h => Math.abs(h.difference) > 1).length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Uren Verificatie</h1>
            <p className="text-gray-600">Vergelijk handmatige invoer met webhook data</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowWebhookSetup(!showWebhookSetup)}
              variant="outline"
              className="border-gray-300"
            >
              <Webhook className="h-4 w-4 mr-2" />
              Webhook Setup
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Vernieuwen
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Perfect Match</p>
                  <p className="text-2xl font-bold text-green-600">{matchCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Kleine Afwijking</p>
                  <p className="text-2xl font-bold text-yellow-600">{discrepancyCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Grote Afwijking</p>
                  <p className="text-2xl font-bold text-red-600">{majorDiscrepancyCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhook Setup */}
        {showWebhookSetup && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Webhook Configuratie</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWebhookSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook">Webhook URL voor Uren Data</Label>
                  <Input
                    id="webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://jouw-systeem.com/webhook/uren"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-sm text-gray-600">
                    Deze webhook ontvangt uren data voor verificatie tegen handmatige invoer.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm font-medium text-gray-900 mb-2">Webhook Endpoint:</p>
                    <code className="text-sm text-gray-600">
                      POST https://hwziukmxpmddsknqhfxn.supabase.co/functions/v1/webhook-hours-import
                    </code>
                    <p className="text-xs text-gray-500 mt-2">
                      Stuur uren data naar dit endpoint in JSON formaat: {`{"technician_id": "uuid", "date": "YYYY-MM-DD", "hours": 8.5}`}
                    </p>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? 'Testen...' : 'Webhook Configureren'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Hour Comparison Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Uren Vergelijking</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : hourImports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Geen vergelijkingsdata gevonden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Monteur</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Datum</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Webhook Uren</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Handmatige Uren</th>
                      <th className="pb-3 text-sm font-medium text-gray-600">Verschil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourImports.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(item.difference)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.difference)}`}>
                              {item.difference === 0 ? 'MATCH' : Math.abs(item.difference) <= 1 ? 'KLEIN' : 'GROOT'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 font-medium text-gray-900">
                          {item.technician_name || 'Onbekend'}
                        </td>
                        <td className="py-3 text-gray-700">
                          {new Date(item.date).toLocaleDateString('nl-NL')}
                        </td>
                        <td className="py-3 text-gray-700 font-medium">
                          {item.webhook_hours}u
                        </td>
                        <td className="py-3 text-gray-700">
                          {item.manual_hours ? `${item.manual_hours}u` : 'Geen data'}
                        </td>
                        <td className="py-3">
                          {getDifferenceDisplay(item.difference)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HourComparisonComponent;
