import { ChangeDetectorRef, Component, inject, OnInit, signal, viewChild, viewChildren } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Chart, registerables } from 'chart.js';
import { MatCardModule } from '@angular/material/card';
import { DashboardService } from '../../core/services/dashboard.service';
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatSelect, MatOption } from "@angular/material/select";

import { TiendaEstadoService } from '../../core/services/tienda-estado.service';

Chart.register(...registerables);

@Component({
  selector: 'app-inicio',
  imports: [
    BaseChartDirective,
    MatCardModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit {

  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);
  private tiendaEstadoService = inject(TiendaEstadoService);

  // Referencia a las gráficas para forzar actualización
  readonly chartDirectives = viewChildren(BaseChartDirective);

  // Signals para el filtro
  tiendas = signal<any[]>([]);
  tiendaSeleccionada = signal<number | null>(null);
  estadosSeleccionados = signal<string[]>([]);
  tipoSeleccionado = signal<string | null>(null);
  estados = this.tiendaEstadoService.estados;
  tipos = this.tiendaEstadoService.tipos;

  // KPIs con Signals
  totalActas = signal(0);
  totalActivos = signal(0);
  disponibles = signal(0);
  responsables = signal(0);

  // Data de las gráficas (Estructura inicial vacía)
  pieChartData: ChartData<'pie'> = { labels: [], datasets: [{ data: [] }] };
  barChartData: ChartData<'bar'> = { labels: [], datasets: [{ data: [], label: 'Activos' }] };
  lineChartData: ChartData<'line'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [{ data: [], label: 'Actas', tension: 0.4 }]
  };

  ngOnInit() {
    this.cargarTiendas();
    this.cargarDatos();
  }

  cargarTiendas() {
    this.tiendaEstadoService.getTienda().subscribe({
      next: (data) => {
        this.tiendas.set(data);
      },
      error: (err) => console.error("Error al cargar tiendas", err)
    });
  }

  // Cambio de Tienda
  onTiendaChange(id: number | null) {
    this.tiendaSeleccionada.set(id);
    this.cargarDatos();
  }

  // Cambio de Estados (Recibe array de strings)
  onEstadoChange(estados: string[]) {
    this.estadosSeleccionados.set(estados);
    this.cargarDatos();
  }

  // Se ejecuta cada vez que el usuario cambia el select
  onFilterChange(id: any) {
    this.tiendaSeleccionada.set(id);
    this.cargarDatos();
  }

  onTipoChange(tipo: string | null) {
    this.tipoSeleccionado.set(tipo);
    this.cargarDatos();
  }

  cargarDatos() {
    const filtros = {
      tiendaId: this.tiendaSeleccionada(),
      estados: this.estadosSeleccionados(),
      tipo: this.tipoSeleccionado()
    };

    this.dashboardService.getStats(filtros).subscribe({
      next: data => {
        this.totalActas.set(data.kpis.totalActas);
        this.totalActivos.set(data.kpis.totalActivos);
        this.disponibles.set(data.kpis.disponibles);
        this.responsables.set(data.kpis.responsables);

        this.actualizarGraficas(data);
        this.cdr.detectChanges();
      },
      error: err => console.error('Error dashboard', err)
    });
  }

  actualizarGraficas(data: any) {
    // ... tu lógica de mapeo de gráficas (pieChartData, barChartData, etc)
    this.pieChartData = {
      labels: data.porTipo.map((t: any) => t.tipo),
      datasets: [{
        data: data.porTipo.map((t: any) => t.cantidad),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      }]
    };

    this.barChartData = {
      labels: data.porEstado.map((e: any) => e.estado),
      datasets: [{
        label: 'Cantidad',
        data: data.porEstado.map((e: any) => e.cantidad),
        backgroundColor: '#0066b3'
      }]
    };

    // Forzar redibujado
    this.chartDirectives().forEach(c => c.update());
  }
}
