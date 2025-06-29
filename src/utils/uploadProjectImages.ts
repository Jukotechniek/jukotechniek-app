import { supabase } from '@/integrations/supabase/client';

export const uploadProjectImages = async (files: File[], projectId: string) => {
  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `${projectId}/${fileName}`;
    const { error } = await supabase.storage.from('project-images').upload(filePath, file);
    if (error) {
      console.error('Error uploading image', error);
      continue;
    }
    const { data } = supabase.storage.from('project-images').getPublicUrl(filePath);
    if (data?.publicUrl) {
      urls.push(data.publicUrl);
    }
  }
  return urls;
};
