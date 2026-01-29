import { Injectable } from '@angular/core';

import { TiendaModel, EstadoModel } from '../models/tienda-estado.model';
import { TIENDA_MOCK, ESTADO_MOCK } from '../mocks/tienda-estado.mock';

@Injectable({
  providedIn: 'root',
})
export class TiendaEstadoService {

  getTienda(): TiendaModel[] {
    return TIENDA_MOCK;
  }

  getEstado(): EstadoModel[] {
    return ESTADO_MOCK;
  }
  
  
}
