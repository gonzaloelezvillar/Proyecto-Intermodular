import type {RecordItem} from './model';
export function demoRecords():RecordItem[]{
 const date=(days:number)=>{const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};
 const opened=(hours:number)=>new Date(Date.now()-hours*3600000).toISOString();
 const rows:[string,string,Record<string,string>][]=[
 ['c1','clients',{name:'Asesoría Horizonte',contact:'Laura Martín',email:'oficina@horizonte.example',phone:'900 000 001',status:'Activo',address:'Toledo · Datos ficticios'}],
 ['c2','clients',{name:'Clínica Alameda',contact:'Pablo Ruiz',email:'contacto@alameda.example',status:'Activo'}],
 ['c3','clients',{name:'Estudio Norte',contact:'Marta López',email:'hola@norte.example',status:'Activo'}],
 ['c4','clients',{name:'Logística Tajo',contact:'Javier Díaz',email:'sistemas@tajo.example',status:'Prospecto'}],
 ['e1','employees',{name:'Ana García',area:'Soporte',email:'ana@kilobyte.example',status:'Activo'}],
 ['e2','employees',{name:'Diego Martín',area:'Sistemas',email:'diego@kilobyte.example',status:'Activo'}],
 ['e3','employees',{name:'Lucía Fernández',area:'Desarrollo',email:'lucia@kilobyte.example',status:'Activo'}],
 ['t1','tickets',{name:'Sin acceso a la carpeta compartida',client:'c1',service:'DF Server',priority:'Alta',status:'En curso',assignee:'e2',opened:opened(3),responded:opened(2),hours:'1',notes:'Revisar permisos del grupo de contabilidad y validar acceso.'}],
 ['t2','tickets',{name:'Conexión VPN intermitente',client:'c2',service:'Sophos Firewall',priority:'Crítica',status:'Abierta',assignee:'e2',opened:opened(23),hours:'0'}],
 ['t3','tickets',{name:'Preparación de dos puestos de trabajo',client:'c3',service:'Equipos y servidores',priority:'Media',status:'En espera',assignee:'e1',opened:opened(30),responded:opened(28),hours:'2'}],
 ['t4','tickets',{name:'Error en actualización de Windows',client:'c1',service:'Soporte informático',priority:'Media',status:'Abierta',assignee:'e1',opened:opened(5),hours:'0'}],
 ['t5','tickets',{name:'Restauración de archivo completada',client:'c3',service:'DF Server',priority:'Baja',status:'Resuelta',assignee:'e2',opened:opened(52),responded:opened(51),hours:'0.5'}],
 ['q1','equipment',{name:'Servidor Dell PowerEdge',client:'c1',type:'Servidor',serial:'DEMO-SRV-01',location:'Sala técnica',status:'Operativo',due:date(180)}],
 ['q2','equipment',{name:'Sophos XGS 107',client:'c2',type:'Firewall',serial:'DEMO-FW-01',status:'Operativo',due:date(120)}],
 ['q3','equipment',{name:'HP ProDesk 400',client:'c3',type:'Ordenador',serial:'DEMO-PC-01',status:'En reparación',due:date(90)}],
 ['q4','equipment',{name:'SAI APC Smart-UPS',client:'c1',type:'SAI',serial:'DEMO-SAI-01',status:'Operativo',due:date(250)}],
 ['l1','licenses',{name:'Sophos · Protección de red',client:'c2',vendor:'Sophos',quantity:'1',due:date(7),amount:'420',status:'Por renovar'}],
 ['l2','licenses',{name:'DF Server · Licencia empresa',client:'c1',vendor:'DF Server',quantity:'10',due:date(22),amount:'290',status:'Activa'}],
 ['co1','contracts',{name:'Mantenimiento integral',client:'c1',plan:'Soporte, servidor y copias',start:date(-180),due:date(185),amount:'290',status:'Activo'}],
 ['co2','contracts',{name:'Seguridad y soporte',client:'c2',plan:'Sophos y asistencia remota',start:date(-330),due:date(35),amount:'220',status:'Activo'}],
 ['co3','contracts',{name:'Soporte de oficina',client:'c3',plan:'Asistencia y mantenimiento',start:date(-60),due:date(305),amount:'150',status:'Activo'}],
 ['p1','quotes',{name:'Renovación de puestos de trabajo',client:'c4',date:date(-2),due:date(12),quantity:'4',amount:'650',tax:'21',status:'Enviado'}],
 ['p2','quotes',{name:'Ampliación de almacenamiento',client:'c1',date:date(-1),due:date(14),quantity:'1',amount:'890',tax:'21',status:'Borrador'}],
 ['i1','invoices',{name:'Mantenimiento mensual',client:'c1',reference:'DEMO-2026-001',date:date(-10),due:date(5),quantity:'1',amount:'290',tax:'21',status:'Pendiente'}],
 ['i2','invoices',{name:'Instalación de firewall',client:'c2',reference:'DEMO-2026-002',date:date(-20),due:date(-3),quantity:'1',amount:'780',tax:'21',status:'Pendiente'}],
 ['i3','invoices',{name:'Soporte mensual',client:'c3',reference:'DEMO-2026-003',date:date(-5),due:date(10),quantity:'1',amount:'150',tax:'21',status:'Pagada'}],
 ['a1','tasks',{name:'Verificar copia del servidor',client:'c1',assignee:'e2',area:'Sistemas',due:date(0),status:'Pendiente'}],
 ['a2','tasks',{name:'Preparar propuesta de renovación',client:'c4',assignee:'e1',area:'Soporte',due:date(1),status:'En curso'}],
 ['a3','tasks',{name:'Revisar formulario de la web',assignee:'e3',area:'Desarrollo',due:date(2),status:'Pendiente'}],
 ['d1','documents',{name:'Procedimiento de copias de seguridad',category:'Procedimiento',assignee:'e2',due:date(30),status:'En revisión',notes:'Ejemplo de documento interno. Añade el enlace a vuestro procedimiento.'}],
 ['d2','documents',{name:'Plan de empresa Kilobyte SL',category:'Plan de empresa',url:'https://kilobyte-sl.web.app/planificacion.html',status:'Pendiente'}],
 ];return rows.map(([id,kind,data])=>({id,kind,data,revision:1,updatedAt:new Date().toISOString(),archived:0}));
}
