import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthModalService {
  private auth = inject(AuthService);
  readonly open = signal(false);
  private after: (() => void) | null = null;

  show(after?: () => void): void {
    this.after = after ?? null;
    this.open.set(true);
  }

  /** Run `action` now if signed in, otherwise open the modal and run it after login. */
  requireAuth(action: () => void): void {
    if (this.auth.isSignedIn()) action();
    else this.show(action);
  }

  close(): void {
    this.open.set(false);
    this.after = null;
  }

  succeeded(): void {
    const cb = this.after;
    this.open.set(false);
    this.after = null;
    if (cb) cb();
  }
}
