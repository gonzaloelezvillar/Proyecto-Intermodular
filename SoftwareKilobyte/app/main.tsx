import {StrictMode,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {browserLocalPersistence,browserSessionPersistence,onAuthStateChanged,sendPasswordResetEmail,setPersistence,signInWithEmailAndPassword,signOut,type User} from 'firebase/auth';
import {BriefcaseBusiness,Eye,EyeOff,KeyRound,LoaderCircle,LockKeyhole,Mail,ShieldCheck} from 'lucide-react';
import {auth} from './firebase';
import Central from './central';
import './globals.css';

const authMessage=(error:unknown)=>{
  const code=String((error as {code?:string})?.code||'');
  if(['auth/invalid-credential','auth/user-not-found','auth/wrong-password'].includes(code))return 'Usuario o contraseña incorrectos.';
  if(code==='auth/too-many-requests')return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
  if(code==='auth/operation-not-allowed')return 'El acceso con usuario y contraseña todavía no está habilitado.';
  return 'No se ha podido iniciar sesión.';
};

function App(){
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false),[remember,setRemember]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[signing,setSigning]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,value=>{setUser(value);setReady(true)}),[]);
  async function login(event:React.FormEvent){event.preventDefault();setSigning(true);setError('');setNotice('');try{await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);await signInWithEmailAndPassword(auth,email.trim().toLowerCase(),password)}catch(value){setError(authMessage(value))}finally{setSigning(false)}}
  async function resetPassword(){if(!email.trim()){setError('Escribe primero tu usuario o correo.');return}setSigning(true);setError('');setNotice('');try{await sendPasswordResetEmail(auth,email.trim().toLowerCase(),{url:'https://soft-kb.web.app'});setNotice('Si la cuenta existe, recibirás un correo para establecer una nueva contraseña.')}catch{setError('No se pudo enviar el correo de recuperación.')}finally{setSigning(false)}}
  if(!ready)return <div className="auth-screen"><LoaderCircle className="spin"/><p>Preparando Kilobyte Central…</p></div>;
  if(user)return <Central userName={user.displayName||user.email||'Empleado'} user={user} signOut={()=>signOut(auth)}/>;
  return <main className="auth-screen"><section className="auth-card"><div className="auth-brand"><div className="brand-mark">k<span>·</span></div><div>KILOBYTE<span>CENTRAL / S.L.</span></div></div><span className="auth-icon"><BriefcaseBusiness size={25}/></span><p className="eyebrow">ACCESO INTERNO</p><h1>Tu espacio de trabajo.</h1><p>Entra con las credenciales que te haya creado un administrador de Kilobyte Central.</p><form className="auth-form" onSubmit={login}><label>Usuario o correo<div className="auth-field"><Mail size={18}/><input type="email" autoComplete="username" value={email} onChange={event=>setEmail(event.target.value)} placeholder="nombre@kilobyte.es" required/></div></label><label>Contraseña<div className="auth-field"><LockKeyhole size={18}/><input type={visible?'text':'password'} autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Tu contraseña" required/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><div className="auth-options"><label><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/> Recordarme</label><button type="button" onClick={resetPassword} disabled={signing}>He olvidado mi contraseña</button></div><button className="primary auth-login" disabled={signing}>{signing?<LoaderCircle className="spin" size={18}/>:<KeyRound size={18}/>} {signing?'Comprobando…':'Entrar en Kilobyte Central'}</button></form>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="auth-notice" role="status">{notice}</div>}<div className="auth-private"><ShieldCheck size={18}/><span>Solo pueden acceder las cuentas internas creadas por un administrador.</span></div></section></main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
