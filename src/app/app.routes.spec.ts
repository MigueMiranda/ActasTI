import { routes } from './app.routes';
import { AuthGuard } from './core/guards/auth.guard';
import { Login } from './pages/login/login';
import { Layout } from './components/layout/layout';
import { Aprobar } from './pages/actas/aprobar/aprobar';

describe('App Routes', () => {
  it('should define login route as default', () => {
    const root = routes.find((route) => route.path === '' && route.pathMatch === 'full');
    expect(root?.component).toBe(Login);
  });

  it('should define protected child routes under layout', () => {
    const layoutRoute = routes.find((route) => route.component === Layout);
    expect(layoutRoute).toBeTruthy();
    expect(layoutRoute?.canActivateChild).toEqual([AuthGuard]);
    expect(layoutRoute?.children?.some((child) => child.path === 'inicio')).toBe(true);
    expect(layoutRoute?.children?.some((child) => child.path === 'inventario')).toBe(true);
  });

  it('should expose public aprobar route', () => {
    const aprobarRoute = routes.find((route) => route.path === 'aprobar');
    expect(aprobarRoute?.component).toBe(Aprobar);
  });
});
