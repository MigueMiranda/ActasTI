import { Component, computed, DestroyRef, inject, Injector, OnInit, signal, viewChildren } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Chart, registerables } from 'chart.js';
import { MatCardModule } from '@angular/material/card';
import {
  DashboardFilters,
  DashboardMonthlyLabels,
  DashboardMonthlySeries,
  DashboardPorMesItem,
  DashboardService,
  DashboardStatsResponse,
} from '../../core/services/dashboard.service';
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatSelect, MatOption } from "@angular/material/select";
import { MatButtonModule } from '@angular/material/button';
import {
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
  tap
} from 'rxjs';

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
    MatButtonModule,
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit {

  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  private tiendaEstadoService = inject(TiendaEstadoService);

  readonly chartDirectives = viewChildren(BaseChartDirective);
  private monthlyStatsCache = new Map<string, DashboardStatsResponse>();
  private monthlyStatsInFlight = new Map<string, Observable<DashboardStatsResponse>>();
  private readonly monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  private readonly pieColors = [
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
    '#9B59B6',
  ];
  private readonly monthAlias: Record<string, number> = {
    ene: 0,
    enero: 0,
    jan: 0,
    january: 0,
    feb: 1,
    febrero: 1,
    february: 1,
    mar: 2,
    marzo: 2,
    march: 2,
    abr: 3,
    abril: 3,
    apr: 3,
    april: 3,
    may: 4,
    mayo: 4,
    jun: 5,
    junio: 5,
    june: 5,
    jul: 6,
    julio: 6,
    july: 6,
    ago: 7,
    agosto: 7,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    septiembre: 8,
    september: 8,
    set: 8,
    oct: 9,
    octubre: 9,
    october: 9,
    nov: 10,
    noviembre: 10,
    november: 10,
    dic: 11,
    diciembre: 11,
    dec: 11,
    december: 11,
  };

  // Signals para el filtro
  tiendas = signal<any[]>([]);
  tiendaSeleccionada = signal<number | null>(null);
  estadosSeleccionados = signal<string[]>([]);
  tiposSeleccionados = signal<string[]>([]);
  estados = this.tiendaEstadoService.estados;
  tipos = this.tiendaEstadoService.tipos;
  isLoading = signal(false);

  private filtros = computed<DashboardFilters>(() => ({
    tiendaId: this.tiendaSeleccionada(),
    estados: this.estadosSeleccionados(),
    tipos: this.tiposSeleccionados(),
  }));

  // KPIs con Signals
  totalActas = signal(0);
  totalActivos = signal(0);
  disponibles = signal(0);
  responsables = signal(0);

  public pieChartType: ChartType = 'pie';
  public barChartType: ChartType = 'bar';
  public lineChartType: ChartType = 'line';

  // Opciones para pie
  public pieChartOptions: ChartConfiguration['options'] = {
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
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    }
  };

  // Data de las gráficas
  pieChartData: ChartData<'pie'> = {
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
    labels: this.monthLabels,
    datasets: [{
      data: Array(12).fill(0),
      label: 'Actas',
      tension: 0.4,
      borderColor: '#0066b3',
      backgroundColor: 'rgba(0, 102, 179, 0.1)',
      fill: true
    }]
  };

  ngOnInit() {
    this.cargarTiendas();
    this.inicializarDashboard();
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
    this.tiendaSeleccionada.set(id ?? null);
  }

  onEstadoChange(estados: string[] | null) {
    this.estadosSeleccionados.set([...(estados ?? [])]);
  }

  onTipoChange(tipos: string[] | null) {
    this.tiposSeleccionados.set([...(tipos ?? [])]);
  }

  limpiarFiltros() {
    this.tiendaSeleccionada.set(null);
    this.estadosSeleccionados.set([]);
    this.tiposSeleccionados.set([]);
  }

  private inicializarDashboard() {
    toObservable(this.filtros, { injector: this.injector })
      .pipe(
        debounceTime(250),
        distinctUntilChanged((prev, curr) => this.filtersAreEqual(prev, curr)),
        tap(() => this.isLoading.set(true)),
        switchMap((filtros) => {
          const filteredRequest = this.dashboardService.getStats(filtros);
          const monthlyRequest = this.getMonthlyStatsCached(filtros.tiendaId ?? null);

          const request$ = this.shouldDecoupleMonthlyChart(filtros)
            ? forkJoin({
              filtered: filteredRequest,
              monthly: monthlyRequest,
            })
            : filteredRequest.pipe(
              map((data) => ({ filtered: data, monthly: data }))
            );

          return request$.pipe(
            catchError((err) => {
              console.error('Error dashboard', err);
              this.resetDashboard();
              return of(null);
            }),
            finalize(() => this.isLoading.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.totalActas.set(response.filtered.kpis.totalActas);
        this.totalActivos.set(response.filtered.kpis.totalActivos);
        this.disponibles.set(response.filtered.kpis.disponibles);
        this.responsables.set(response.filtered.kpis.responsables);
        this.actualizarGraficas(response.filtered, response.monthly);
      });
  }

  private resetDashboard() {
    this.totalActas.set(0);
    this.totalActivos.set(0);
    this.disponibles.set(0);
    this.responsables.set(0);

    this.pieChartData = {
      labels: [],
      datasets: [{ data: [], backgroundColor: [] }]
    };

    this.barChartData = {
      labels: [],
      datasets: [{ label: 'Cantidad', data: [], backgroundColor: '#0066b3' }]
    };

    this.lineChartData = {
      labels: this.monthLabels,
      datasets: [{
        data: Array(12).fill(0),
        label: 'Actas',
        tension: 0.4,
        borderColor: '#0066b3',
        backgroundColor: 'rgba(0, 102, 179, 0.1)',
        fill: true
      }]
    };

    queueMicrotask(() => {
      this.chartDirectives().forEach(c => c.update());
    });
  }

  private shouldDecoupleMonthlyChart(filters: DashboardFilters): boolean {
    const hasEstadoFilter = (filters.estados?.length ?? 0) > 0;
    const hasTipoFilter = (filters.tipos?.length ?? 0) > 0;
    return hasEstadoFilter || hasTipoFilter;
  }

  private getMonthlyStatsCached(tiendaId: number | null): Observable<DashboardStatsResponse> {
    const cacheKey = tiendaId === null ? 'all' : String(tiendaId);

    const cached = this.monthlyStatsCache.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    const inFlight = this.monthlyStatsInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const request$ = this.dashboardService.getStats({ tiendaId }).pipe(
      tap((data) => this.monthlyStatsCache.set(cacheKey, data)),
      finalize(() => this.monthlyStatsInFlight.delete(cacheKey)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.monthlyStatsInFlight.set(cacheKey, request$);
    return request$;
  }

  private filtersAreEqual(a: DashboardFilters, b: DashboardFilters): boolean {
    if ((a.tiendaId ?? null) !== (b.tiendaId ?? null)) {
      return false;
    }

    const estadosA = this.normalizeSelections(a.estados);
    const estadosB = this.normalizeSelections(b.estados);
    if (!this.sameArray(estadosA, estadosB)) {
      return false;
    }

    const tiposA = this.normalizeSelections(a.tipos);
    const tiposB = this.normalizeSelections(b.tipos);
    return this.sameArray(tiposA, tiposB);
  }

  private normalizeSelections(values?: string[]): string[] {
    return [...new Set(
      (values ?? [])
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )].sort((a, b) => a.localeCompare(b, 'es'));
  }

  private sameArray(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => value === b[index]);
  }

  actualizarGraficas(data: DashboardStatsResponse, monthlyData: DashboardStatsResponse = data) {
    const porTipo = data.porTipo ?? [];
    this.pieChartData = {
      labels: porTipo.map((t) => t.tipo),
      datasets: [{
        data: porTipo.map((t) => t.cantidad),
        backgroundColor: this.pieColors
      }]
    };

    const porEstado = data.porEstado ?? [];
    this.barChartData = {
      labels: porEstado.map((e) => e.estado),
      datasets: [{
        label: 'Cantidad',
        data: porEstado.map((e) => e.cantidad),
        backgroundColor: '#0066b3'
      }]
    };

    const monthlyChart = this.buildMonthlyChartSource(monthlyData);

    this.lineChartData = {
      labels: monthlyChart.labels,
      datasets: [{
        data: monthlyChart.series,
        label: 'Actas',
        tension: 0.4,
        borderColor: '#0066b3',
        backgroundColor: 'rgba(0, 102, 179, 0.1)',
        fill: true
      }]
    };

    queueMicrotask(() => {
      this.chartDirectives().forEach(c => c.update());
    });
  }

  private buildMonthlyChartSource(data: DashboardStatsResponse): { labels: string[]; series: number[] } {
    const seriesFromArray = this.extractMonthlySeries(data);
    if (seriesFromArray) {
      return seriesFromArray;
    }

    const porMes = this.extractMonthlyRows(data);
    if (porMes.length === 0 && data.kpis.totalActas > 0) {
      console.warn(
        'porMes viene vacio aunque totalActas es mayor a cero. Revisar filtros del query de backend (acta/aprobado/rango de fechas).',
        data
      );
    }

    const monthlySeries = this.buildMonthlySeries(porMes);
    if (porMes.length > 0 && monthlySeries.every((value) => value === 0)) {
      console.warn('La API envio porMes, pero no se pudo mapear a valores numericos utiles:', porMes);
    }

    return {
      labels: this.monthLabels,
      series: monthlySeries,
    };
  }

  private extractMonthlySeries(data: DashboardStatsResponse): { labels: string[]; series: number[] } | null {
    const raw = data as unknown as Record<string, unknown>;
    const seriesCandidates: unknown[] = [
      raw['actasMensuales'],
      raw['actas_mensuales'],
      this.readNested(raw, 'graficas', 'actasMensuales'),
      this.readNested(raw, 'graficas', 'actas_mensuales'),
    ];

    const rawSeries = seriesCandidates.find(Array.isArray);
    if (!Array.isArray(rawSeries) || rawSeries.length === 0) {
      return null;
    }

    const series = this.normalizeMonthlySeries(rawSeries);
    const labels = this.extractMonthlyLabels(raw, series.length);
    return { labels, series };
  }

  private normalizeMonthlySeries(series: DashboardMonthlySeries): number[] {
    return series.map((value) => this.toNumberValue(value) ?? 0);
  }

  private extractMonthlyLabels(raw: Record<string, unknown>, expectedLength: number): string[] {
    const labelCandidates: unknown[] = [
      raw['meses'],
      raw['labelsMeses'],
      raw['labels'],
      raw['periodos'],
      this.readNested(raw, 'graficas', 'meses'),
      this.readNested(raw, 'graficas', 'labelsMeses'),
      this.readNested(raw, 'graficas', 'labels'),
      this.readNested(raw, 'graficas', 'periodos'),
    ];

    const source = labelCandidates.find(Array.isArray) as DashboardMonthlyLabels | undefined;
    if (Array.isArray(source) && source.length === expectedLength) {
      return source.map((value) => this.formatMonthLabel(value));
    }

    return this.buildRollingMonthLabels(expectedLength);
  }

  private buildRollingMonthLabels(length: number): string[] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const labels: string[] = [];

    for (let index = length - 1; index >= 0; index--) {
      const monthIndex = (currentMonth - index + 12) % 12;
      labels.push(this.monthLabels[monthIndex]);
    }

    return labels;
  }

  private formatMonthLabel(value: string | number): string {
    if (typeof value === 'number') {
      const monthIndex = this.getMonthIndex(value);
      if (monthIndex !== null) {
        return this.monthLabels[monthIndex];
      }
      return String(value);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const monthIndex = this.getMonthIndex(trimmed);
    if (monthIndex !== null) {
      return this.monthLabels[monthIndex];
    }

    return trimmed;
  }

  private extractMonthlyRows(data: DashboardStatsResponse): DashboardPorMesItem[] {
    const raw = data as unknown as Record<string, unknown>;
    const sourceCandidates: unknown[] = [
      raw['porMes'],
      raw['por_mes'],
      raw['actasPorMes'],
      raw['actas_por_mes'],
      raw['asignacionesPorMes'],
      this.readNested(raw, 'graficas', 'porMes'),
      this.readNested(raw, 'graficas', 'por_mes'),
    ];

    const rawArray = sourceCandidates.find(Array.isArray);
    if (!Array.isArray(rawArray)) {
      return [];
    }

    return rawArray
      .map((row) => this.normalizeMonthlyRow(row))
      .filter((row): row is DashboardPorMesItem => row !== null);
  }

  private readNested(
    source: Record<string, unknown>,
    key: string,
    nestedKey: string
  ): unknown {
    const nested = source[key];
    if (!nested || typeof nested !== 'object') {
      return undefined;
    }
    return (nested as Record<string, unknown>)[nestedKey];
  }

  private normalizeMonthlyRow(row: unknown): DashboardPorMesItem | null {
    if (!row || typeof row !== 'object') {
      return null;
    }

    const normalized = row as Record<string, unknown>;
    const mes = this.toMonthValue(
      normalized['mes']
      ?? normalized['month']
      ?? normalized['periodo']
      ?? normalized['fecha']
      ?? normalized['created_at']
      ?? normalized['createdAt']
    );

    const cantidad = this.toNumberValue(
      normalized['cantidad']
      ?? normalized['count']
      ?? normalized['total']
      ?? normalized['valor']
      ?? normalized['value']
    );

    if (mes === null || cantidad === null) {
      return null;
    }

    return { mes, cantidad };
  }

  private toMonthValue(value: unknown): string | number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  }

  private toNumberValue(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const direct = Number(trimmed);
      if (Number.isFinite(direct)) {
        return direct;
      }

      const normalized = Number(trimmed.replace(',', '.'));
      return Number.isFinite(normalized) ? normalized : null;
    }

    return null;
  }

  private buildMonthlySeries(porMes: DashboardPorMesItem[]): number[] {
    const series = Array(12).fill(0) as number[];
    for (const item of porMes) {
      const index = this.getMonthIndex(item.mes);
      if (index === null) {
        continue;
      }
      const value = Number(item.cantidad);
      series[index] += Number.isFinite(value) ? value : 0;
    }
    return series;
  }

  private getMonthIndex(mes: string | number): number | null {
    if (typeof mes === 'number') {
      if (mes >= 1 && mes <= 12) {
        return mes - 1;
      }
      if (mes >= 0 && mes < 12) {
        return mes;
      }
      return null;
    }

    const normalized = mes.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const isoMonth = normalized.match(/^\d{4}[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
    if (isoMonth) {
      const monthFromDate = Number(isoMonth[1]);
      if (monthFromDate >= 1 && monthFromDate <= 12) {
        return monthFromDate - 1;
      }
      return null;
    }

    if (/^\d+$/.test(normalized)) {
      const numericMonth = Number(normalized);
      if (numericMonth >= 1 && numericMonth <= 12) {
        return numericMonth - 1;
      }
      if (numericMonth >= 0 && numericMonth < 12) {
        return numericMonth;
      }
      return null;
    }

    const plain = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.monthAlias[plain] ?? null;
  }
}
