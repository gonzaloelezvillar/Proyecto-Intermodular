import type {User} from 'firebase/auth';
import {createUserWithEmailAndPassword, deleteUser, signOut, updateProfile} from 'firebase/auth';
import {collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where, writeBatch} from 'firebase/firestore';
import {accountCreationAuth,db,prepareAccountCreationAuth} from './firebase';
import {modules, type RecordItem} from './model';

export const BOOTSTRAP_ADMIN_EMAILS = new Set(['pinsugonsu@gmail.com','admin@kilobyte.es']);
const ADMIN_KINDS = new Set(['users','roles','departments','webInbox','attendance','schedules']);
type ActivityItem={id:string;record_id:string;kind:string;action:string;actor:string;at:string};
export type NotificationItem={id:string;type:string;title:string;message:string;at:string;kind?:string;recordId?:string};
export type TimeEntry={id:string;userId:string;name:string;email:string;date:string;startedAt:string;endedAt?:string;markedAt:string;status:'En curso'|'Finalizada'};
export type Workspace={records:RecordItem[];activity:ActivityItem[];notifications:NotificationItem[];timeEntry:TimeEntry|null;me:{role:string;read:string[];write:string[]}};

const emailOf=(user:User)=>String(user.email||'').trim().toLowerCase();
const permissionLists=(value:string)=>{
  const entries=value.split(',').map(v=>v.trim()).filter(Boolean);
  return {
    read:[...new Set(entries.filter(v=>v.endsWith(':read')||!v.includes(':')).map(v=>v.split(':')[0]))],
    write:[...new Set(entries.filter(v=>v.endsWith(':write')||!v.includes(':')).map(v=>v.split(':')[0]))],
  };
};
const timestampIso=(value:unknown)=>{const date=(value as {toDate?:()=>Date}|undefined)?.toDate?.();return date?.toISOString()||String(value||'')};

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
  const recordKinds=readable.filter(kind=>!['webInbox','attendance'].includes(kind));
  const recordGroups=await Promise.all(recordKinds.map(async kind=>{
    const snapshot=await getDocs(query(collection(db,'records'),where('kind','==',kind)));
    return snapshot.docs.map(item=>({id:item.id,...item.data()} as RecordItem));
  }));
  if(!isAdmin&&access.roleId){
    const roleSnap=await getDoc(doc(db,'records',access.roleId));
    if(roleSnap.exists())recordGroups.push([{id:roleSnap.id,...roleSnap.data()} as RecordItem]);
  }
  if(isAdmin){
    const snapshot=await getDocs(collection(db,'web_inbox'));
    recordGroups.push(snapshot.docs.map(item=>{
      const raw=item.data() as Record<string,unknown>;
      const timestamp=raw.fecha as {toDate?:()=>Date}|undefined;
      const updatedAt=timestamp?.toDate?.()?.toISOString()||new Date().toISOString();
      const data={
        name:String(raw.nombre||''),email:String(raw.email||''),company:String(raw.empresa||''),
        type:String(raw.tipo||''),message:String(raw.mensaje||raw.pedido||''),status:String(raw.estado||'Pendiente'),
        phone:String(raw.telefono||''),reason:String(raw.motivo||''),total:String(raw.total||'0'),order:String(raw.pedido||''),
      };
      return {id:item.id,kind:'webInbox',data,revision:1,updatedAt,archived:0} as RecordItem;
    }));
    const attendance=await getDocs(collection(db,'time_entries'));
    recordGroups.push(attendance.docs.map(item=>{
      const raw=item.data();
      const data={name:String(raw.name||''),email:String(raw.email||''),date:String(raw.date||''),startedAt:timestampIso(raw.startedAt),endedAt:timestampIso(raw.endedAt),markedAt:timestampIso(raw.createdAt),status:String(raw.status||'En curso')};
      return {id:item.id,kind:'attendance',data,revision:1,updatedAt:timestampIso(raw.updatedAt||raw.createdAt),archived:0} as RecordItem;
    }));
  }
  const activityGroups=await Promise.all(recordKinds.map(async kind=>{
    const snapshot=await getDocs(query(collection(db,'activity'),where('kind','==',kind),limit(20)));
    return snapshot.docs.map(item=>({id:item.id,...item.data()} as ActivityItem));
  }));
  const notificationSnapshot=await getDocs(query(collection(db,'notifications'),limit(50)));
  const notifications=notificationSnapshot.docs.map(item=>{const raw=item.data();return {id:item.id,type:String(raw.type||''),title:String(raw.title||''),message:String(raw.message||''),at:timestampIso(raw.at),kind:raw.kind?String(raw.kind):undefined,recordId:raw.recordId?String(raw.recordId):undefined}}).sort((a,b)=>b.at.localeCompare(a.at));
  const timeSnapshot=await getDoc(doc(db,'time_entries',`${user.uid}_${new Date().toLocaleDateString('en-CA')}`));
  const rawTime=timeSnapshot.exists()?timeSnapshot.data():null;
  const timeEntry=rawTime?{id:timeSnapshot.id,userId:user.uid,name:String(rawTime.name||user.displayName||user.email||'Trabajador'),email:String(rawTime.email||user.email||''),date:String(rawTime.date),startedAt:timestampIso(rawTime.startedAt),endedAt:rawTime.endedAt?timestampIso(rawTime.endedAt):undefined,markedAt:timestampIso(rawTime.createdAt),status:rawTime.status==='Finalizada'?'Finalizada':'En curso'} as TimeEntry:null;
  return {records:recordGroups.flat().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),activity:activityGroups.flat().sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100),notifications,timeEntry,me:{role,read:[...new Set([...read,'dashboard'])],write}};
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
  if(kind==='tickets'&&!record){
    const notificationRef=doc(collection(db,'notifications'));
    batch.set(notificationRef,{type:'incidencia',title:'Nueva incidencia',message:data.name||'Se ha registrado una incidencia.',kind,recordId:id,at:serverTimestamp()});
  }
  await batch.commit();
}

export async function startWorkday(user:User){
  const date=new Date().toLocaleDateString('en-CA'),id=`${user.uid}_${date}`,ref=doc(db,'time_entries',id);
  const existing=await getDoc(ref);if(existing.exists())throw Error('Ya existe una ficha para hoy.');
  await setDoc(ref,{userId:user.uid,email:user.email||'',name:user.displayName||user.email||'Trabajador',date,startedAt:serverTimestamp(),endedAt:null,status:'En curso',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  return id;
}

export async function finishWorkday(user:User){
  const date=new Date().toLocaleDateString('en-CA'),ref=doc(db,'time_entries',`${user.uid}_${date}`),existing=await getDoc(ref);
  if(!existing.exists())throw Error('Primero debes iniciar la jornada.');
  if(existing.data().endedAt)throw Error('La ficha de hoy ya está cerrada.');
  await updateDoc(ref,{endedAt:serverTimestamp(),status:'Finalizada',updatedAt:serverTimestamp()});
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
