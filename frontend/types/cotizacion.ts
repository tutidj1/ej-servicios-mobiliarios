export interface Cotizacion {
  id?: string;
  nombre: string;
  whatsapp: string;
  fechaEvento: string; // Formato YYYY-MM-DD
  tipoEvento: string;
  cantidadInvitados: number;
  ubicacion?: string;
  mobiliarioSolicitado: string[];
  mensaje?: string;
  estado?: 'pendiente' | 'contactado' | 'confirmado' | 'cancelado';
  createdAt?: string;
  updatedAt?: string;
}
