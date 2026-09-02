'use strict';
window.PORTAL_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://frxfoztyctrvsobbawmo.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_or6yc7T71Hpyajn9ctn1FA_BjsB6LhL',
  SUPABASE_ANON_KEY: 'sb_publishable_or6yc7T71Hpyajn9ctn1FA_BjsB6LhL',
  BUCKET: 'bases-tecnico',
  FILES: Object.freeze({
    'sla_pme_4h.html': 'atual/sla_pme_4h.xlsx'
  })
});

window.getPortalSupabase = function () {
  if (window.__PORTAL_SUPABASE__) return window.__PORTAL_SUPABASE__;
  if (!window.supabase || !window.supabase.createClient) throw new Error('Biblioteca Supabase nao carregada.');
  const c = window.PORTAL_CONFIG;
  window.__PORTAL_SUPABASE__ = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  return window.__PORTAL_SUPABASE__;
};
