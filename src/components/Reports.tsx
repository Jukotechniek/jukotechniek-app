
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/ui/page-layout';
import { sendDailyReportForAll } from '@/utils/sendDailyProjectReport';

const Reports = () => {
  const { toast } = useToast();

  const handleExportExcel = (reportType: string) => {
    toast({
      title: "Export Started",
      description: `${reportType} report is being generated and will be downloaded shortly`
    });
  };

  const handleImportExcel = () => {
    toast({
      title: "Import Ready",
      description: "Please select an Excel file to import work hours"
    });
  };

  const handleEmailReports = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await sendDailyReportForAll(today);
      toast({ title: 'Succes', description: 'Dagrapporten verzonden' });
    } catch (err) {
      toast({ title: 'Error', description: 'Rapporten versturen mislukt', variant: 'destructive' });
    }
  };

  return (
    <PageLayout 
      title="Rapporten" 
      subtitle="Genereer rapporten en beheer data import/export functionaliteit."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Reports */}
        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              📊 Export Rapporten
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={() => handleExportExcel('Monthly Summary')}
                className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
              >
                Export Maandoverzicht
              </Button>
              <Button
                onClick={() => handleExportExcel('Technician Details')}
                className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
              >
                Export Monteur Details
              </Button>
              <Button
                onClick={() => handleExportExcel('All Work Hours')}
                className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
              >
                Export Alle Werkuren
              </Button>
              <Button
                onClick={() => handleExportExcel('Manual vs Registered Hours')}
                className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
              >
                Export Handmatig vs Geregistreerd
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Data */}
        <Card className="bg-white shadow-lg border-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              📁 Importeer Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="space-y-3">
                <div className="text-3xl">📄</div>
                <h3 className="text-sm font-medium text-gray-900">Importeer Excel Bestand</h3>
                <p className="text-xs text-gray-600">
                  Upload CSV of XLSX bestanden met werkuren data
                </p>
                <Button
                  onClick={handleImportExcel}
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  Kies Bestand
                </Button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              <p><strong>Ondersteunde formaten:</strong> .csv, .xlsx</p>
              <p><strong>Vereiste kolommen:</strong> Monteur Naam, Datum, Uren, Beschrijving</p>
            </div>
          </CardContent>
        </Card>

        {/* Report Statistics */}
        <Card className="bg-white shadow-lg border-2 border-gray-200 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Rapport Samenvatting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">320</div>
                <div className="text-sm text-gray-600">Totaal Uren Deze Maand</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">45</div>
                <div className="text-sm text-gray-600">Totaal Entries</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">78%</div>
                <div className="text-sm text-gray-600">Geregistreerde Uren</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">22%</div>
                <div className="text-sm text-gray-600">Handmatige Entries</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white shadow-lg border-2 border-gray-200 mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Snelle Acties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={handleEmailReports}
            >
              📧 Email Rapporten
            </Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              📅 Plan Auto-Export
            </Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              🔍 Data Validatie Check
            </Button>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              📋 Genereer Samenvatting
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default Reports;
