// Límite de intentos en memoria (por instancia del servidor).
// Es una primera barrera rápida; la barrera "fuerte" es el conteo por ip_hash en la base de datos.

const intentos = new Map<string, number[]>();

export function excedeLimite(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const recientes = (intentos.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);

  if (recientes.length >= maximo) {
    intentos.set(clave, recientes);
    return true;
  }

  recientes.push(ahora);
  intentos.set(clave, recientes);

  // Limpieza ocasional para que el mapa no crezca sin control
  if (intentos.size > 5000) {
    intentos.forEach((marcas, k) => {
      if (marcas.every((t) => ahora - t >= ventanaMs)) intentos.delete(k);
    });
  }
  return false;
}
