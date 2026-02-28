import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable, concat, firstValueFrom, from, of, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';

import { InventarioModel } from '../models/inventario.model';

interface InventarioEnvelope {
  items: InventarioModel[];
  total: number | null;
  limit: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class InventarioService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/elementos`;
  private inventarioCache$?: Observable<InventarioModel[]>;
  private readonly defaultPageSize = 100;
  private readonly allItemsLimit = 50000;
  private readonly maxPaginationRequests = 400;

  getInventario(forceRefresh = false): Observable<InventarioModel[]> {
    if (forceRefresh || !this.inventarioCache$) {
      const initial$ = this.fetchInventarioEnvelope();

      this.inventarioCache$ = initial$.pipe(
        switchMap((initial) => {
          if (initial.items.length === 0) {
            return of([] as InventarioModel[]);
          }

          const full$ = from(this.fetchFullInventory(initial)).pipe(
            catchError(() => of(initial.items))
          );

          return concat(
            of(initial.items),
            full$
          );
        }),
        map((items) => this.mergeUniqueItems(items)),
        distinctUntilChanged((prev, curr) => prev.length === curr.length),
        catchError((err) => {
          this.inventarioCache$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.inventarioCache$;
  }

  buscarPorCampo(valor: string, campo: 'serial' | 'placa'): Observable<InventarioModel> {
    const safeValue = encodeURIComponent(valor.trim());
    return this.http.get<InventarioModel>(`${this.apiUrl}/${campo}/${safeValue}`);
  }

  invalidateCache(): void {
    this.inventarioCache$ = undefined;
  }

  private fetchInventarioEnvelope(params?: HttpParams): Observable<InventarioEnvelope> {
    return this.http.get<unknown>(this.apiUrl, { params }).pipe(
      map((payload) => this.normalizeInventarioResponse(payload))
    );
  }

  private async fetchFullInventory(initial: InventarioEnvelope): Promise<InventarioModel[]> {
    if (initial.total !== null && initial.total <= initial.items.length) {
      return initial.items;
    }

    const boosted = await this.tryLargeLimit(initial);
    if (boosted.length > initial.items.length) {
      return boosted;
    }

    const mightBePaginated = initial.total !== null
      ? initial.total > initial.items.length
      : initial.items.length >= this.defaultPageSize;

    if (!mightBePaginated) {
      return initial.items;
    }

    return this.fetchByPagination(initial);
  }

  private async tryLargeLimit(initial: InventarioEnvelope): Promise<InventarioModel[]> {
    const requestedLimit = Math.max(initial.total ?? 0, this.allItemsLimit);
    const attempts = [
      new HttpParams().set('limit', String(requestedLimit)),
      new HttpParams().set('pageSize', String(requestedLimit)),
      new HttpParams().set('size', String(requestedLimit)),
      new HttpParams().set('perPage', String(requestedLimit)),
      new HttpParams().set('per_page', String(requestedLimit)),
      new HttpParams().set('paginate', 'false'),
      new HttpParams().set('all', 'true'),
    ];

    let best = initial.items;
    for (const params of attempts) {
      try {
        const payload = await firstValueFrom(this.fetchInventarioEnvelope(params));
        const items = this.mergeUniqueItems(payload.items);
        if (items.length > best.length) {
          best = items;
        }
      } catch {
        // Siguiente formato de query
      }
    }

    return best;
  }

  private async fetchByPagination(initial: InventarioEnvelope): Promise<InventarioModel[]> {
    const base = this.mergeUniqueItems(initial.items);
    const pageSize = Math.max(
      initial.limit ?? base.length ?? this.defaultPageSize,
      this.defaultPageSize
    );
    const targetTotal = initial.total;
    const seen = new Map<string, InventarioModel>();

    base.forEach((item) => seen.set(this.getItemKey(item), item));

    let offset = base.length;
    let page = 2;
    let requests = 0;

    while (requests < this.maxPaginationRequests) {
      const next = await this.fetchPageWithFallback(pageSize, offset, page, seen);
      const nextItems = this.mergeUniqueItems(next.items);

      if (nextItems.length === 0) {
        break;
      }

      const sizeBefore = seen.size;
      nextItems.forEach((item) => seen.set(this.getItemKey(item), item));
      const added = seen.size - sizeBefore;

      if (added === 0) {
        break;
      }

      if (targetTotal !== null && seen.size >= targetTotal) {
        break;
      }

      if (nextItems.length < pageSize) {
        break;
      }

      offset += nextItems.length;
      page += 1;
      requests += 1;
    }

    return Array.from(seen.values());
  }

  private async fetchPageWithFallback(
    limit: number,
    offset: number,
    page: number,
    seen: Map<string, InventarioModel>
  ): Promise<InventarioEnvelope> {
    const attempts = [
      new HttpParams().set('limit', String(limit)).set('offset', String(offset)),
      new HttpParams().set('limit', String(limit)).set('page', String(page)),
      new HttpParams().set('page', String(page)).set('pageSize', String(limit)),
      new HttpParams().set('page', String(page)).set('size', String(limit)),
      new HttpParams().set('page', String(page)).set('perPage', String(limit)),
      new HttpParams().set('page', String(page)).set('per_page', String(limit)),
      new HttpParams().set('skip', String(offset)).set('take', String(limit)),
      new HttpParams().set('start', String(offset)).set('limit', String(limit)),
    ];

    let lastError: unknown;
    let best: InventarioEnvelope = { items: [], total: null, limit };
    let bestNewCount = 0;

    for (const params of attempts) {
      try {
        const current = await firstValueFrom(this.fetchInventarioEnvelope(params));
        const currentItems = this.mergeUniqueItems(current.items);
        const newCount = currentItems.reduce((count, item) => {
          return seen.has(this.getItemKey(item)) ? count : count + 1;
        }, 0);

        if (newCount > bestNewCount) {
          bestNewCount = newCount;
          best = { ...current, items: currentItems };
        }

        if (newCount > 0) {
          return best;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (bestNewCount > 0) {
      return best;
    }

    if (lastError) {
      throw lastError;
    }

    return { items: [], total: null, limit };
  }

  private normalizeInventarioResponse(payload: unknown): InventarioEnvelope {
    if (Array.isArray(payload)) {
      return {
        items: payload as InventarioModel[],
        total: null,
        limit: null
      };
    }

    if (!payload || typeof payload !== 'object') {
      return { items: [], total: null, limit: null };
    }

    const record = payload as Record<string, unknown>;
    const candidates = [record['data'], record['rows'], record['elementos'], record['inventario']];
    const arrayCandidate = candidates.find(Array.isArray);
    const items = Array.isArray(arrayCandidate) ? (arrayCandidate as InventarioModel[]) : [];

    const total = this.toPositiveNumber(
      record['count']
      ?? record['total']
      ?? record['totalItems']
      ?? record['totalCount']
      ?? this.readNested(record, 'meta', 'total')
      ?? this.readNested(record, 'pagination', 'total')
    );

    const limit = this.toPositiveNumber(
      record['limit']
      ?? record['pageSize']
      ?? record['perPage']
      ?? this.readNested(record, 'meta', 'limit')
      ?? this.readNested(record, 'pagination', 'limit')
      ?? (items.length > 0 ? items.length : null)
    );

    return { items, total, limit };
  }

  private readNested(source: Record<string, unknown>, key: string, nestedKey: string): unknown {
    const nested = source[key];
    if (!nested || typeof nested !== 'object') {
      return null;
    }

    return (nested as Record<string, unknown>)[nestedKey];
  }

  private toPositiveNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }

  private mergeUniqueItems(items: InventarioModel[]): InventarioModel[] {
    const unique = new Map<string, InventarioModel>();
    items.forEach((item) => unique.set(this.getItemKey(item), item));
    return Array.from(unique.values());
  }

  private getItemKey(item: InventarioModel): string {
    const serial = (item.serial ?? '').trim();
    const placa = (item.placa ?? '').trim();
    return serial || placa || JSON.stringify(item);
  }
}
