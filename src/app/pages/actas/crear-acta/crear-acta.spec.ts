import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearActa } from './crear-acta';

describe('CrearActa', () => {
  let component: CrearActa;
  let fixture: ComponentFixture<CrearActa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearActa]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearActa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
