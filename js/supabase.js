import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://uqywvtxcqimejfkxcquq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WxtU1i0N9CLhULXezl4yKA_H1mswFbh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);