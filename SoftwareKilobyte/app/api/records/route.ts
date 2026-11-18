import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {modules,validate} from '../../model';
export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const adminKinds=new Set(['users','roles','departments']);
async function access(user:{userId:string;email:string}){
 const db=env.DB!;const administrator=Boolean(env.KILOBYTE_ADMIN_EMAIL&&user.email.toLowerCase()===env.KILOBYTE_ADMIN_EMAIL.toLowerCase());
 if(administrator)return {role:'Administrador',read:Object.keys(modules),write:Object.keys(modules)};
 const account:any=await db.prepare("SELECT * FROM records WHERE kind='users' AND archived=0 AND lower(json_extract(data,'$.email'))=lower(?) LIMIT 1").bind(user.email).first();
 if(!account||JSON.parse(account.data).status!=='Activo')return null;
 const roleId=JSON.parse(account.data).role;const role:any=await db.prepare("SELECT * FROM records WHERE id=? AND kind='roles' AND archived=0").bind(roleId).first();
 if(!role)return null;const entries=String(JSON.parse(role.data).permissions||'').split(',').map((s:string)=>s.trim());
 const read=new Set<string>(),write=new Set<string>();
 for(const entry of entries){const [kind,action]=entry.split(':');if(!modules[kind]||adminKinds.has(kind))continue;
 if(!action||action==='read')read.add(kind);if(!action||action==='write'){write.add(kind);read.add(kind)}}
 return {role:JSON.parse(role.data).name,read:[...read],write:[...write]};
}
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión para continuar.'},401);
 try{const grant=await access(user);if(!grant)return json({error:'Tu usuario aún no está activo en Kilobyte Central. Contacta con la administración.'},403);const db=env.DB!;const [rows,activity]=await Promise.all([db.prepare('SELECT * FROM records ORDER BY updated_at DESC').all(),db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 40').all()]);const visible=rows.results.filter((r:any)=>grant.read.includes(r.kind));const ids=new Set(visible.map((r:any)=>r.id));return json({records:visible.map((r:any)=>({id:r.id,kind:r.kind,data:JSON.parse(r.data),revision:r.revision,archived:r.archived,updatedAt:r.updated_at})),activity:activity.results.filter((a:any)=>ids.has(a.record_id)),me:grant});}catch{return json({error:'No se ha podido cargar la base de datos. Inténtalo de nuevo.'},503)}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Inicia sesión para continuar.'},401);
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'Origen no permitido.'},403);
 try{const text=await request.text();if(text.length>60000)return json({error:'Registro demasiado grande.'},413);const input=JSON.parse(text),db=env.DB!;if(!modules[input.kind])return json({error:'Módulo no válido.'},400);
 const grant=await access(user);if(!grant)return json({error:'Usuario sin acceso interno.'},403);if(!grant.write.includes(input.kind))return json({error:'Tu rol no permite escribir en esta sección.'},403);
 const data=validate(input.kind,input.data),id=input.id||crypto.randomUUID();let old:any=null;
 if(input.kind==='roles'){const entries=data.permissions.split(',').map((s:string)=>s.trim()).filter(Boolean);if(!entries.length||entries.some((s:string)=>{const [kind,action]=s.split(':');return !modules[kind]||adminKinds.has(kind)||!['read','write'].includes(action)}))return json({error:'Selecciona permisos de lectura o escritura válidos. La administración está reservada.'},400);data.permissions=[...new Set(entries)].join(',');}
 if(input.kind==='users'){for(const [key,kind] of [['role','roles'],['department','departments']]){const linked=await db.prepare('SELECT id FROM records WHERE id=? AND kind=? AND archived=0').bind(data[key],kind).first();if(!linked)return json({error:`Selecciona un ${key==='role'?'rol':'departamento'} válido.`},400)}const duplicate=await db.prepare("SELECT id FROM records WHERE kind='users' AND archived=0 AND lower(json_extract(data,'$.email'))=lower(?) AND id<>? LIMIT 1").bind(data.email,id).first();if(duplicate)return json({error:'Ya existe un usuario con ese correo.'},409);}
 if(input.id){old=await db.prepare('SELECT * FROM records WHERE id=?').bind(id).first();if(!old||old.kind!==input.kind)return json({error:'Registro no encontrado.'},404);if(old.revision!==input.revision)return json({error:'Otra sesión ha modificado el registro. Cierra la ficha y actualiza los datos.'},409);}
 for(const [key,kind] of [['client','clients'],['assignee','employees']])if(data[key]){const related=await db.prepare('SELECT id FROM records WHERE id=? AND kind=? AND archived=0').bind(data[key],kind).first();if(!related)return json({error:'Selecciona una ficha vinculada disponible.'},400);}
 const archived=input.archived===1?1:0;
 if(['clients','employees','roles','departments'].includes(input.kind)&&archived===1){const paths:Record<string,string>={clients:'$.client',employees:'$.assignee',roles:'$.role',departments:'$.department'};const linked=await db.prepare('SELECT id FROM records WHERE archived=0 AND json_extract(data,?)=? LIMIT 1').bind(paths[input.kind],id).first();if(linked)return json({error:'Hay registros vinculados. Archívalos o cambia su asignación antes.'},409);}
 const now=new Date().toISOString(),action=old?(archived?'Archivado':old.archived?'Restaurado':'Actualizado'):'Creado';
 const stmt=old?db.prepare('UPDATE records SET data=?,revision=revision+1,updated_at=?,updated_by=?,archived=? WHERE id=? AND revision=?').bind(JSON.stringify(data),now,user.userId,archived,id,input.revision):db.prepare('INSERT INTO records(id,kind,data,revision,updated_at,updated_by,archived) VALUES(?,?,?,1,?,?,0)').bind(id,input.kind,JSON.stringify(data),now,user.userId);
 const results=await db.batch([stmt,db.prepare('INSERT INTO audit(id,record_id,action,actor,at) SELECT ?,?,?,?,? WHERE changes() > 0').bind(crypto.randomUUID(),id,`${action} · ${modules[input.kind].singular} · ${data.name}`,user.displayName,now)]);
 if(!results[0].meta.changes)return json({error:'Conflicto de edición. Actualiza y vuelve a intentarlo.'},409);return json({ok:true,id});
 }catch(error){return json({error:error instanceof Error&&!(error.message.includes('D1')||error.message.includes('SQL'))?error.message:'No se ha podido guardar el registro.'},400)}
}
