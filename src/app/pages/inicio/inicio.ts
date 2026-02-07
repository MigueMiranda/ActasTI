import { ChangeDetectorRef, Component, inject, OnInit, signal, viewChildren } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Chart, registerables } from 'chart.js';
import { MatCardModule } from '@angular/material/card';
import { DashboardService } from '../../core/services/dashboard.service';
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatSelect, MatOption } from "@angular/material/select";
import { FormsModule } from '@angular/forms';

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
    MatOption,
    FormsModule
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit {

  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);
  private tiendaEstadoService = inject(TiendaEstadoService);

  readonly chartDirectives = viewChildren(BaseChartDirective);

  // Signals para el filtro
  tiendas = signal<any[]>([]);
  tiendaSeleccionada = signal<number | null>(null);
  estadosSeleccionados = signal<string[]>([]);
  tiposSeleccionados = signal<string[]>([]); // ✅ CAMBIADO: Array para múltiple selección
  estados = this.tiendaEstadoService.estados;
  tipos = this.tiendaEstadoService.tipos;

  // KPIs con Signals
  totalActas = signal(0);
  totalActivos = signal(0);
  disponibles = signal(0);
  responsables = signal(0);

  // ✅ CORREGIDO: Tipos de gráficas
  public polarAreaChartType: ChartType = 'pie';
  public barChartType: ChartType = 'bar';
  public lineChartType: ChartType = 'line';

  // Opciones para Polar Area
  public polarAreaChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'right'
      }
    }
  };

  // Opciones para gráfica de barras
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };

  // Opciones para gráfica de línea
  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true
      }
    }
  };

  // Data de las gráficas
  pieChartData: ChartData<'polarArea'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  };

  barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Cantidad',
      backgroundColor: '#0066b3'
    }]
  };

  lineChartData: ChartData<'line'> = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [{
      data: [30, 10, 15, 40, 65, 25, 35, 55, 45, 50, 60, 20],
      label: 'Actas',
      tension: 0.4,
      borderColor: '#0066b3',
      backgroundColor: 'rgba(0, 102, 179, 0.1)',
      fill: true
    }]
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

  onTiendaChange(id: number | null) {
    this.tiendaSeleccionada.set(id);
    this.cargarDatos();
  }

  onEstadoChange(estados: string[]) {
    this.estadosSeleccionados.set(estados);
    this.cargarDatos();
  }

  // ✅ CORREGIDO: Ahora recibe array
  onTipoChange(tipos: string[]) {
    this.tiposSeleccionados.set(tipos);
    console.log('Tipos seleccionados:', tipos); // Debug
    console.log('Tipos en signal:', this.tiposSeleccionados()); // Debug
    this.cargarDatos();
  }

  cargarDatos() {
    const filtros = {
      tiendaId: this.tiendaSeleccionada(),
      estados: this.estadosSeleccionados(),
      tipos: this.tiposSeleccionados() // ✅ CAMBIADO: Enviar como 'tipos' (plural)
    };

    console.log('Filtros enviados:', filtros);

    this.dashboardService.getStats(filtros).subscribe({
      next: data => {
        console.log('Data recibida:', data);

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
    this.pieChartData = {
      labels: data.porTipo.map((t: any) => t.tipo),
      datasets: [{
        data: data.porTipo.map((t: any) => t.cantidad),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#E74C3C',
          '#C9CBCF',
          '#3498DB',
          '#F39C12',
          '#2ECC71',
          '#9B59B6'
        ]
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

    if (data.porMes) {
      this.lineChartData = {
        labels: data.porMes.map((m: any) => m.mes),
        datasets: [{
          data: data.porMes.map((m: any) => m.cantidad),
          label: 'Actas',
          tension: 0.4,
          borderColor: '#0066b3',
          backgroundColor: 'rgba(0, 102, 179, 0.1)',
          fill: true
        }]
      };
    }

    setTimeout(() => {
      this.chartDirectives().forEach(c => c.update());
    }, 0);
  }
}