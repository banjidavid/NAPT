// Optional Firebase integration. Local single-player works without configuration.
const byId = (id) => document.getElementById(id);
const status = (message) => { byId('cloudStatus').textContent = message; };
const setActions = (ready) => {
  for (const id of ['cloudSave','cloudLoad','cloudSignOut']) byId(id).disabled = !ready;
};
let auth, db, currentUser, firebaseAuth, firestore;
try {
  const { firebaseConfig } = await import('/firebase-config.js');
  if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId || !firebaseConfig?.appId) {
    status('Cloud saving is not configured. Local profiles and all gameplay work normally. See FIREBASE_SETUP.md.');
  } else {
    const app = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');
    firebaseAuth = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');
    firestore = await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');
    const firebase = app.initializeApp(firebaseConfig);
    auth = firebaseAuth.getAuth(firebase);
    db = firestore.getFirestore(firebase);
    firebaseAuth.onAuthStateChanged(auth, (user) => {
      currentUser = user;
      setActions(Boolean(user));
      status(user ? `Signed in as ${user.email}. Cloud backups require manual save/load.` : 'Not signed in. Enter your email and password to enable cloud backups.');
    });
  }
} catch (error) {
  status('Cloud setup unavailable: ' + (error?.message || 'Check Firebase configuration and network.'));
}
function credentials() {
  const email = byId('cloudEmail').value.trim();
  const password = byId('cloudPassword').value;
  if (!email || password.length < 6) throw Error('Enter an email and a password of at least six characters.');
  if (!auth) throw Error('Cloud saving is not configured. See FIREBASE_SETUP.md.');
  return {email, password};
}
byId('cloudForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {const {email,password}=credentials(); await firebaseAuth.signInWithEmailAndPassword(auth,email,password);byId('cloudPassword').value='';}
  catch(e){status('Sign-in failed: '+e.message);}
});
byId('cloudRegister').addEventListener('click', async () => {
  try {const {email,password}=credentials();await firebaseAuth.createUserWithEmailAndPassword(auth,email,password);byId('cloudPassword').value='';}
  catch(e){status('Account creation failed: '+e.message);}
});
byId('cloudSignOut').addEventListener('click', async () => {
  try {await firebaseAuth.signOut(auth);status('Signed out of cloud. Local progress remains saved.');}
  catch(e){status('Sign-out failed: '+e.message);}
});
function gameDoc(){
  if(!currentUser || !db) throw Error('Sign in first.');
  const name=window.NAPT_PROFILE?.name();
  if(!name) throw Error('Choose a player first.');
  // Each account has a separate document per player name.
  return firestore.doc(db,'users',currentUser.uid,'games',encodeURIComponent(name.toLowerCase()));
}
byId('cloudSave').addEventListener('click', async () => {
  if(!confirm('Replace this player’s existing cloud backup with the current local game?')) return;
  try {const data=window.NAPT_PROFILE.snapshot(),target=gameDoc();await firestore.setDoc(target,data);status(`Saved ${data.player}'s progress to Firebase at ${new Date().toLocaleString()}.`);}
  catch(e){status('Cloud save failed: '+e.message);}
});
byId('cloudLoad').addEventListener('click', async () => {
  if(!confirm('Replace this player’s LOCAL answers with their cloud backup? Download your local progress first if you need a copy.')) return;
  try {const player=window.NAPT_PROFILE.name(),uid=currentUser?.uid,target=gameDoc();const snapshot=await firestore.getDoc(target);if(player!==window.NAPT_PROFILE.name()||uid!==currentUser?.uid){status('Player or account changed during loading. Cloud data was not applied.');return;}if(!snapshot.exists()) {status('No cloud backup exists for this player.');return;}
    window.NAPT_PROFILE.restore(snapshot.data());status('Cloud backup loaded. Answers were marked unverified to prevent relying on stale checks; check them again online.');}
  catch(e){status('Cloud load failed: '+e.message);}
});
