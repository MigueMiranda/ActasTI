import { Injectable } from '@angular/core';
import { InventarioModel } from '../models/inventario.model';
import { INVENTARIO_MOCK } from '../mocks/inventario.mock';

@Injectable({
  providedIn: 'root',
})
export class InventarioService {

  getInventario(): InventarioModel[] {
    return INVENTARIO_MOCK;
  }

  buscarPorCampo(valor: string, campo: 'serial' | 'placa' | 'placaAx'): InventarioModel | undefined {
    return INVENTARIO_MOCK.find(
      a => a[campo].toLowerCase() === valor.toLowerCase()
    );
  }

}
