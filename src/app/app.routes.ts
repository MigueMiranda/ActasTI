import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Inicio } from './pages/inicio/inicio';
import { CrearActaComponent } from './pages/actas/crear-acta/crear-acta';
import { ListarActa } from './pages/actas/listar-acta/listar-acta';
import { Asignacion } from './pages/activos/asignacion/asignacion';
import { InventarioComponent } from './pages/activos/inventario/inventario';
import { ConfirmarToken } from './pages/aprobaciones/confirmar-token/confirmar-token';
import { Layout } from './components/layout/layout';
import { Aprobar } from './pages/actas/aprobar/aprobar';

export const routes: Routes = [

    { path: '', component: Login },
    {
        path: '',
        component: Layout,
        children: [
            { path: 'inicio', component: Inicio },
            { path: 'crear-acta', component: CrearActaComponent },
            { path: 'listar-acta', component: ListarActa },
            { path: 'asignacion', component: Asignacion },
            { path: 'inventario', component: InventarioComponent },
            { path: 'confirmar-token', component: ConfirmarToken }
        ]
    },
    { path: 'aprobar', component: Aprobar }


];
