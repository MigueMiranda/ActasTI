import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { InventarioModel } from '../../../core/models/inventario.model';
import { InventarioService } from '../../../core/services/inventario.service';

@Component({
  selector: 'app-inventario',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.scss'],
})
export class InventarioComponent implements OnInit {

  inventario: InventarioModel[] = [];
  inventarioFiltrado: InventarioModel[] = [];
  searchTerm = '';

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.inventario = this.inventarioService.getInventario();
    this.inventarioFiltrado = this.inventario;
  }

  filtrarInventario(): void {
    const term = this.searchTerm.toLowerCase();

    this.inventarioFiltrado = this.inventario.filter(item =>
      item.modelo.toLowerCase().includes(term) ||
      item.serial.toLowerCase().includes(term) ||
      (item.asignadoA?.toLowerCase().includes(term) ?? false)
    );
  }
}
