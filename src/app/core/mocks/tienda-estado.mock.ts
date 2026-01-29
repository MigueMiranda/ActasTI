import { TiendaModel, EstadoModel } from '../models/tienda-estado.model';

export const TIENDA_MOCK: TiendaModel[] = [
  {
    id: 41,
    nombre: 'Medellin San Juan',
  },
  {
    id: 40,
    nombre: 'Medellin Industriales',
  },
  {
    id: 44,
    nombre: 'Envigado',
  },
  {
    id: 43,
    nombre: 'Los Molinos',
  },
];

export const ESTADO_MOCK: EstadoModel[] = [
  {
    estado: 'Asignado',
  },
  {
    estado: 'Disponible',
  },
  {
    estado: 'Mantenimiento',
  },
  {
    estado: 'Transito',
  },
];