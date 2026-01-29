import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarToken } from './confirmar-token';

describe('ConfirmarToken', () => {
  let component: ConfirmarToken;
  let fixture: ComponentFixture<ConfirmarToken>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarToken]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmarToken);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
