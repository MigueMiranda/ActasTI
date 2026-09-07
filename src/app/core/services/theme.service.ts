import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'enterprise' | 'trust' | 'modern';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'actasti_theme';
  
  currentTheme = signal<Theme>(this.loadTheme());

  constructor() {
    // Apply theme immediately on construction
    this.applyTheme(this.currentTheme());
    
    effect(() => {
      this.applyTheme(this.currentTheme());
      this.saveTheme(this.currentTheme());
    });
  }

  private loadTheme(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme;
    return saved || 'trust';
  }

  private saveTheme(theme: Theme): void {
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    console.log('Theme applied:', theme); // Debug
  }

  getThemeLabel(theme: Theme): string {
    const labels: Record<Theme, string> = {
      enterprise: 'Enterprise Precision',
      trust: 'Trust & Clarity',
      modern: 'Modern SaaS'
    };
    return labels[theme];
  }

  getThemeOptions(): { value: Theme; label: string; description: string }[] {
    return [
      { value: 'enterprise', label: 'Enterprise Precision', description: 'Técnico, datos densos, navy oscuro' },
      { value: 'trust', label: 'Trust & Clarity', description: 'Accesible, azul profesional' },
      { value: 'modern', label: 'Modern SaaS', description: 'Espacioso, indigo moderno' }
    ];
  }
}