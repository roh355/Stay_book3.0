import { Injectable, signal, effect } from '@angular/core';
import { SCENE_THEMES, SceneTheme, ThemeName } from './theme';

const STORAGE_KEY = 'staybook.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeName>(this.initial());

  constructor() {
    effect(() => {
      const t = this.theme();
      const root = document.documentElement;
      if (t === 'dark') root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  scene(): SceneTheme {
    return SCENE_THEMES[this.theme()];
  }

  private initial(): ThemeName {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
