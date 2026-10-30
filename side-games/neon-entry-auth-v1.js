/* Bridges the existing Firebase Auth session to the welcome screen.
   Uses the same Firebase app as social/ and never signs in anonymously on boot. */
import {getApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const entry=window.NEON_XI_ENTRY;
async function attach(){
  if(!entry)return;
  for(let n=0;n<200&&!getApps().length;n++)await new Promise(resolve=>setTimeout(resolve,100));
  if(!getApps().length)throw new Error('Firebase henüz başlatılamadı.');
  const auth=getAuth(getApp());
  onAuthStateChanged(auth,user=>entry.resolveAuth(user),error=>entry.authError(error));
}
attach().catch(error=>entry?.authError(error));
