import { TestBed } from '@angular/core/testing';

import { TiendaEstadoService } from './tienda-estado.service';

describe('TiendaEstadoService', () => {
  let service: TiendaEstadoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TiendaEstadoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
