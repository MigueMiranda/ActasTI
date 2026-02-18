import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let service: AuthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    service = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
