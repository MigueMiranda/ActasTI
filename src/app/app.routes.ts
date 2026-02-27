import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Inicio } from './pages/inicio/inicio';
import { CrearActaComponent } from './pages/actas/crear-acta/crear-acta';
import { ListarActa } from './pages/actas/listar-acta/listar-acta';
import { InventarioComponent } from './pages/activos/inventario/inventario';
import { Layout } from './components/layout/layout';
import { Aprobar } from './pages/actas/aprobar/aprobar';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [

    { path: '', component: Login, pathMatch: 'full' },
    {
        path: '',
        component: Layout,
        canActivateChild: [AuthGuard],
        children: [
            { path: 'inicio', component: Inicio },
            { path: 'crear-acta', component: CrearActaComponent },
            { path: 'listar-acta', component: ListarActa },
            { path: 'inventario', component: InventarioComponent },
        ]
    },
    { path: 'aprobar', component: Aprobar },
    { path: '**', redirectTo: '' }


];
