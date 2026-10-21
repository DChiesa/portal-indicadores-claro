(function(){
'use strict';
const ADMIN_IDS=['demetrius377','demetrius377@claro.com.br','demetrius377@gmail.com'];
let sb;const norm=v=>String(v||'').trim().toLowerCase();
const client=()=>sb||(sb=window.supabase&&window.PORTAL_CONFIG?window.supabase.createClient(window.PORTAL_CONFIG.SUPABASE_URL,window.PORTAL_CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null);
const isAdmin=email=>ADMIN_IDS.some(x=>norm(email).includes(norm(x)));
async function registrar(){try{const c=client();if(!c)return;const s=(await c.auth.getSession()).data.session;if(!s)return;const page=decodeURIComponent(location.pathname.split('/').pop()||'index.html');await c.rpc('portal_registrar_acesso',{p_pagina:page,p_login:s.user.email||s.user.user_metadata?.login||'',p_user_agent:navigator.userAgent.slice(0,500)});}catch(e){console.warn('Registro de acesso:',e)}}
async function inserir(){try{
 if(!/(^|\/)index\.html$/i.test(location.pathname)&&location.pathname!='/')return;
 const c=client();if(!c)return;const session=(await c.auth.getSession()).data.session;if(!session||!isAdmin(session.user.email))return;
 const header=[...document.querySelectorAll('*')].find(e=>/^Administra[cç][aã]o(?:\s+\d+\s+m[oó]dulos)?$/i.test((e.textContent||'').trim())&&e.children.length<4);if(!header)return;
 let section=header.parentElement,grid=section?.querySelector(':scope > div:last-child');if(!grid||grid===header)grid=section?.nextElementSibling;if(!grid)return;
 const exemplar=[...grid.children].find(x=>/Central de Logins|Gerenciar Relat[oó]rios|Administrar Permiss[oõ]es/i.test(x.textContent||''));
 function add(id,href,title,subtitle,detail,color){if(document.getElementById(id))return;const a=document.createElement('a');a.id=id;a.href=href;if(exemplar)a.className=exemplar.className;a.style.cssText='text-decoration:none;color:inherit';a.innerHTML='<div style="background:'+color+';color:#fff;min-height:138px;display:grid;place-items:center;padding:18px;border-radius:16px 16px 0 0;font-size:23px;font-weight:900;text-align:center">'+title+'</div><div style="background:#fff;padding:18px;border-radius:0 0 16px 16px;min-height:82px"><b>'+subtitle+'</b><div style="font-size:12px;color:#667085;margin-top:5px">'+detail+'</div></div>';grid.appendChild(a)}
 add('adminAccessLogCard','admin-acessos.html','LOG DE ACESSOS','Controle de acessos','Quem acessou, visualizações e frequência','linear-gradient(135deg,#12365a,#245c89)');
 add('adminWhatsappSummaryCard','central_de_resumos_watts.html','RESUMOS WHATSAPP','Compilador de indicadores','Cards, PNG e mensagem para envio','linear-gradient(135deg,#9f0009,#d71920)');
 header.textContent='Administração  6 módulos';
}catch(e){console.warn('Cards administrativos:',e)}}
async function start(){await registrar();await inserir();if(document.getElementById('adminWhatsappSummaryCard'))return;const o=new MutationObserver(async()=>{await inserir();if(document.getElementById('adminWhatsappSummaryCard'))o.disconnect()});o.observe(document.getElementById('categories')||document.body,{childList:true,subtree:true});setTimeout(inserir,1500);setTimeout(inserir,4000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
