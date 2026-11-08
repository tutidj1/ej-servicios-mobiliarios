import { Wallet } from 'lucide-react';
import PantallaVacia from '@/components/casa/PantallaVacia';

export default function Pagina() {
  return <PantallaVacia icono={Wallet} titulo="Sin gastos cargados" texto="Tus gastos personales van a aparecer acá. Los ves solo vos." detalle="Ni la pareja ni la administración técnica pueden verlos." />;
}
