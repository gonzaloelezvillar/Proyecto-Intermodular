import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {onAuthStateChanged, signInWithPopup, signOut, type User} from 'firebase/auth';
import {BriefcaseBusiness, LoaderCircle, LogIn, ShieldCheck} from 'lucide-react';
import {auth, googleProvider} from './firebase';
import Central from './central';
import './globals.css';

function App(){
  const [user,setUser]=useState<User|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[signing,setSigning]=useState(false);
  useEffect(()=>onAuthStateChanged(auth,value=>{setUser(value);setReady(true)}),[]);
  async function login(){setSigning(true);setError('');try{await signInWithPopup(auth,googleProvider)}catch(e){setError(e instanceof Error?e.message:'No se ha podido iniciar sesión.')}finally{setSigning(false)}}
  if(!ready)return <div className="auth-screen"><LoaderCircle className="spin"/><p>Preparando Kilobyte Central…</p></div>;
  if(user)return <Central userName={user.displayName||user.email||'Empleado'} user={user} signOut={()=>signOut(auth)}/>;
  return <main className="auth-screen"><section className="auth-card"><div className="auth-brand"><div className="brand-mark">k<span>·</span></div><div>KILOBYTE<span>CENTRAL / S.L.</span></div></div><span className="auth-icon"><BriefcaseBusiness size={25}/></span><p className="eyebrow">ESPACIO DE EMPLEADOS</p><h1>La empresa, conectada.</h1><p>Clientes, soporte, equipos, presupuestos y trabajo interno en un único lugar protegido.</p><button className="primary auth-login" onClick={login} disabled={signing}>{signing?<LoaderCircle className="spin" size={18}/>:<LogIn size={18}/>} {signing?'Abriendo Google…':'Entrar con Google'}</button>{error&&<div className="error" role="alert">{error}</div>}<div className="auth-private"><ShieldCheck size={18}/><span>Solo pueden acceder empleados invitados por un administrador.</span></div></section></main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
