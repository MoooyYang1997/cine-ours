const SUPABASE_URL = 'https://dirrnojiybbwotuqeqww.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Rbie_WEsyNAV38b-QKrbCw_bBwuxicP';

(function(){
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload = () => {
    window._sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.dispatchEvent(new Event('supabase-ready'));
  };
  document.head.appendChild(s);
})();

async function signUpEmail(email, password, username) {
  const { data, error } = await window._sb.auth.signUp({
    email, password,
    options: { data: { username, display_name: username } }
  });
  if (error) throw error;
  return data;
}

async function signInEmail(email, password) {
  const { data, error } = await window._sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await window._sb.auth.signOut();
}

function showSbToast(msg) {
  if (window.parent && window.parent.showToast) window.parent.showToast(msg);
  else alert(msg);
}
