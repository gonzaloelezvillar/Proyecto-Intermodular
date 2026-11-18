import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Kilobyte Central · Espacio de empleados',description:'Gestión interna de clientes, soporte, equipos y operaciones de Kilobyte SL.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="es"><body>{children}</body></html>}
