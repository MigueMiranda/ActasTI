import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarActa } from './listar-acta';

describe('ListarActa', () => {
  let component: ListarActa;
  let fixture: ComponentFixture<ListarActa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarActa]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListarActa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
