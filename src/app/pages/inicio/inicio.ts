import { Component } from '@angular/core';
import { BaseChartDirective  } from 'ng2-charts';
import { ChartConfiguration, ChartType, Chart, registerables } from 'chart.js';
import { MatCardModule } from '@angular/material/card';

Chart.register(...registerables);

@Component({
  selector: 'app-inicio',
  imports: [
    BaseChartDirective , 
    MatCardModule
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {

  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        data: [5, 12, 8, 15, 10, 20],
        label: 'Actas creadas',
        fill: true,
        tension: 0.4
      }
    ]
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
  };

  pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: ['Laptops', 'Monitores', 'Impresoras', 'Otros'],
    datasets: [
      {
        data: [40, 25, 15, 20]
      }
    ]
  };

  pieChartType: ChartType = 'pie';

  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Asignados', 'Disponibles', 'En Mantenimiento'],
    datasets: [
      {
        data: [60, 30, 10],
        label: 'Activos'
      }
    ]
  };

  barChartType: ChartType = 'bar';




}
