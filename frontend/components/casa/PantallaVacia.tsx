import type { LucideIcon } from 'lucide-react';

/** Pantalla sin funcionalidad todavía: dice qué va a haber, sin inventar datos. */
export default function PantallaVacia({
  icono: Icono,
  titulo,
  texto,
  detalle,
}: {
  icono: LucideIcon;
  titulo: string;
  texto: string;
  detalle?: string;
}) {
  return (
    <section className="flex flex-col items-center rounded-3xl border border-dashed border-casa-borde bg-casa-panel/50 px-6 py-14 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-casa-acento/12 text-casa-acento">
        <Icono size={26} />
      </span>
      <h2 className="mb-2 font-playfair text-xl text-casa-texto">{titulo}</h2>
      <p className="max-w-xs text-sm leading-relaxed text-casa-suave">{texto}</p>
      {detalle && <p className="mt-4 max-w-xs text-xs leading-relaxed text-casa-suave/80">{detalle}</p>}
    </section>
  );
}
