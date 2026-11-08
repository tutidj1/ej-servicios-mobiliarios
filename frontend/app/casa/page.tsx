import { Home } from 'lucide-react';
import PantallaVacia from '@/components/casa/PantallaVacia';
import TarjetaHuella from '@/components/casa/TarjetaHuella';

export default function Inicio() {
  return (
    <>
      <TarjetaHuella />
      <PantallaVacia
        icono={Home}
        titulo="Todavía no hay datos"
        texto="Acá va a estar cuánto necesita la casa por mes y qué parte va cubierta."
        detalle="El piso se calcula con los gastos y obligaciones que se vayan cargando; necesita unos meses de datos para ser confiable."
      />
    </>
  );
}
