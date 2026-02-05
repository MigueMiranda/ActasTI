export interface InventarioModel {
  serial: string;          // PK real
  placa: string;
  tipo: string;
  fabricante: string;
  modelo: string;
  estado?: string;
  responsable: string;
  hostname: string;
  ubicacion: string;
  tienda: {
    tienda_id: number,
    nombre: string
  };
  usuario: {
    id: number,
    name: string,
    username: string,
    cargo: string
  }
}
