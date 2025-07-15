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
