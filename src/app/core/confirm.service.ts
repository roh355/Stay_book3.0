import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(req: Partial<ConfirmRequest> & { message: string }): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.pending.set({
        title: req.title ?? 'Are you sure?',
        message: req.message,
        confirmLabel: req.confirmLabel ?? 'Confirm',
        cancelLabel: req.cancelLabel !== undefined ? req.cancelLabel : 'Cancel',
        danger: req.danger ?? false,
        resolve,
      });
    });
  }

  alert(title: string, message: string): Promise<boolean> {
    return this.ask({
      title,
      message,
      confirmLabel: 'OK',
      cancelLabel: '',
      danger: true,
    });
  }

  resolve(ok: boolean): void {
    const p = this.pending();
    if (p) {
      p.resolve(ok);
      this.pending.set(null);
    }
  }
}
