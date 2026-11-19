import type {User} from 'firebase/auth';
import {createUserWithEmailAndPassword, deleteUser, signOut, updateProfile} from 'firebase/auth';
import {collection, doc, getDoc, getDocs, limit, query, setDoc, where, writeBatch} from 'firebase/firestore';
import {accountCreationAuth,db,prepareAccountCreationAuth} from './firebase';
import {modules, type RecordItem} from './model';

export const BOOTSTRAP_ADMIN_EMAILS = new Set(['pinsugonsu@gmail.com','admin@kilobyte.es']);
const ADMIN_KINDS = new Set(['users','roles','departments']);
type ActivityItem={id:string;record_id:string;kind:string;action:string;actor:string;at:string};
export type Workspace={records:RecordItem[];activity:ActivityItem[];me:{role:string;read:string[];write:string[]}};

const emailOf=(user:User)=>String(user.email||'').trim().toLowerCase();
const permissionLists=(value:string)=>{
  const entries=value.split(',').map(v=>v.trim()).filter(Boolean);
  return {
    read:[...new Set(entries.filter(v=>v.endsWith(':read')||!v.includes(':')).map(v=>v.split(':')[0]))],
    write:[...new Set(entries.filter(v=>v.endsWith(':write')||!v.includes(':')).map(v=>v.split(':')[0]))],
  };
};

async function createEmployeeAccount(email:string,password:string,name:string){
  await prepareAccountCreationAuth();
  let created:User|undefined;
  try{
    const credential=await createUserWithEmailAndPassword(accountCreationAuth,email.trim().toLowerCase(),password);
    created=credential.user;
    await updateProfile(credential.user,{displayName:name});
    return credential.user;
  }catch(error){
    if(created)await deleteUser(created).catch(()=>undefined);
    const code=String((error as {code?:string})?.code||'');
    if(code==='auth/email-already-in-use')throw Error('Ya existe una cuenta de acceso con ese correo. Usa “He olvidado mi contraseña” para establecer una nueva.');
    if(code==='auth/weak-password')throw Error('La contraseña debe tener al menos 8 caracteres.');
    if(code==='auth/operation-not-allowed')throw Error('El acceso con correo y contraseña todavía no está habilitado en Firebase.');
    throw Error('No se pudo crear la cuenta de acceso en Firebase.');
  }
}

async function ensureAccess(user:User){
  const email=emailOf(user);if(!email)throw Error('La cuenta interna no tiene un identificador válido.');
  if(BOOTSTRAP_ADMIN_EMAILS.has(email))return {admin:true,roleId:'',status:'Activo'};
  const inviteRef=doc(db,'invitations',email),accessRef=doc(db,'access',user.uid);
  const [inviteSnap,accessSnap]=await Promise.all([getDoc(inviteRef),getDoc(accessRef)]);
  if(!inviteSnap.exists())throw Error('Tu correo todavía no está autorizado. Un administrador debe crearte desde Usuarios.');
  const invite=inviteSnap.data();
  if(invite.status!=='Activo')throw Error('Tu acceso está suspendido. Contacta con un administrador.');
  const desired={email,name:user.displayName||invite.name||email,roleId:invite.roleId,departmentId:invite.departmentId,status:invite.status,admin:false,updatedAt:new Date().toISOString()};
  const current=accessSnap.data();
  if(!accessSnap.exists()||current?.roleId!==desired.roleId||current?.departmentId!==desired.departmentId||current?.status!==desired.status)await setDoc(accessRef,desired,{merge:true});
  return desired;
}

export async function loadWorkspace(user:User):Promise<Workspace>{
  const access=await ensureAccess(user),isAdmin=Boolean(access.admin);
  let role='Administrador',read=Object.keys(modules),write=Object.keys(modules);
  if(!isAdmin){
    const roleSnap=await getDoc(doc(db,'records',access.roleId));
    if(!roleSnap.exists()||roleSnap.data().kind!=='roles')throw Error('Tu usuario no tiene un rol válido asignado.');
    const roleRecord=roleSnap.data() as RecordItem;
    const parsed=permissionLists(roleRecord.data.permissions||'');
    role=roleRecord.data.name||'Rol interno';read=parsed.read;write=parsed.write;
  }
  const readable=isAdmin?Object.keys(modules):read.filter(kind=>!ADMIN_KINDS.has(kind));
  const recordGroups=await Promise.all(readable.map(async kind=>{
    const snapshot=await getDocs(query(collection(db,'records'),where('kind','==',kind)));
    return snapshot.docs.map(item=>({id:item.id,...item.data()} as RecordItem));
  }));
  if(!isAdmin&&access.roleId){
    const roleSnap=await getDoc(doc(db,'records',access.roleId));
    if(roleSnap.exists())recordGroups.push([{id:roleSnap.id,...roleSnap.data()} as RecordItem]);
  }
  const activityGroups=await Promise.all(readable.map(async kind=>{
    const snapshot=await getDocs(query(collection(db,'activity'),where('kind','==',kind),limit(20)));
    return snapshot.docs.map(item=>({id:item.id,...item.data()} as ActivityItem));
  }));
  return {records:recordGroups.flat().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),activity:activityGroups.flat().sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100),me:{role,read:[...new Set([...read,'dashboard'])],write}};
}

export async function saveWorkspaceRecord(user:User,kind:string,data:Record<string,string>,record?:RecordItem,archived=0){
  const now=new Date().toISOString(),id=record?.id||crypto.randomUUID(),recordRef=doc(db,'records',id),actor=user.email||user.displayName||'Usuario';
  const permissions=kind==='roles'?permissionLists(data.permissions||''):null;
  const email=kind==='users'?String(data.email||'').trim().toLowerCase():'';
  if(kind==='users'&&!email)throw Error('El usuario necesita un correo de acceso.');
  if(kind==='users'&&record&&email!==String(record.data.email||'').trim().toLowerCase())throw Error('El correo de acceso no se puede cambiar. Archiva este usuario y crea uno nuevo con el correo correcto.');
  const linkedAccess=kind==='users'?await getDocs(query(collection(db,'access'),where('email','==',email))):null;
  const previousEmail=kind==='users'?String(record?.data.email||'').trim().toLowerCase():'';
  const batch=writeBatch(db);
  const item={kind,data,revision:(record?.revision||0)+1,createdAt:record?.createdAt||now,createdBy:record?.createdBy||actor,updatedAt:now,updatedBy:actor,archived, ...(permissions?{readPermissions:permissions.read,writePermissions:permissions.write}:{})};
  batch.set(recordRef,item);
  const activityRef=doc(collection(db,'activity'));
  batch.set(activityRef,{record_id:id,kind,action:record?(archived!==record.archived?(archived?'Archivado':'Restaurado'):'Actualizado'):'Creado',actor,at:now});
  if(kind==='users'){
    const accessStatus=archived?'Suspendido':data.status;
    batch.set(doc(db,'invitations',email),{name:data.name,email,roleId:data.role,departmentId:data.department,status:accessStatus,updatedAt:now});
    linkedAccess?.docs.forEach(item=>batch.update(item.ref,{name:data.name,roleId:data.role,departmentId:data.department,status:accessStatus,updatedAt:now}));
    if(previousEmail&&previousEmail!==email)batch.delete(doc(db,'invitations',previousEmail));
  }
  await batch.commit();
}

export async function createEmployeeWorkspaceAccount(actor:User,data:Record<string,string>,password:string){
  let created:User|undefined;
  try{
    created=await createEmployeeAccount(data.email,password,data.name);
    await saveWorkspaceRecord(actor,'users',data);
  }catch(error){
    if(created)await deleteUser(created).catch(()=>undefined);
    throw error;
  }finally{
    await signOut(accountCreationAuth).catch(()=>undefined);
  }
}
