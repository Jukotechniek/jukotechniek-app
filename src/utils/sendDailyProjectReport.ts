import { supabase } from '@/integrations/supabase/client';

export const sendDailyProjectReport = async (date: string, email: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('project-report-email', {
      body: { date, email }
    });
    if (error) throw error;
    return data as { ok: boolean; count: number };
  } catch (err) {
    console.error('sendDailyProjectReport error', err);
    throw err;
  }
};

export const sendDailyReportForAll = async (date: string) => {
  try {
    const { data: techs, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'technician');
    if (error) throw error;

    const emails = (techs || []).map(t => (t as any).email).filter(Boolean);
    for (const email of emails) {
      await sendDailyProjectReport(date, email as string);
    }
  } catch (err) {
    console.error('sendDailyReportForAll error', err);
    throw err;
  }
};
