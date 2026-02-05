import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Aprobar } from './aprobar';

describe('Aprobar', () => {
  let component: Aprobar;
  let fixture: ComponentFixture<Aprobar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Aprobar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Aprobar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
