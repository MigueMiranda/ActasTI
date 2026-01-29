export interface InventarioModel {
  id: number;
  modelo: string;
  tipo: 'Laptop' | 'Monitor' | 'Móvil' | 'Otro';
  serial: string;
  placa: string;
  placaAx: string;
  asignadoA: string | null;
  estado: 'Asignado' | 'Disponible' | 'Mantenimiento';
  marca: string;
}
