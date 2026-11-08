import { TrendingUp } from 'lucide-react';
import PantallaVacia from '@/components/casa/PantallaVacia';

export default function Pagina() {
  return <PantallaVacia icono={TrendingUp} titulo="Sin inversiones cargadas" texto="Acá van a estar tus inversiones, con el rendimiento nominal y el real (ajustado por inflación) siempre juntos." detalle="Es privado: lo ves solo vos." />;
}
