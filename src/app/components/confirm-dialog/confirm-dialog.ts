import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../core/confirm.service';

@Component({
  selector: 'sb-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.pending(); as p) {
      <div class="backdrop" (click)="confirm.resolve(false)">
        <div class="card panel" (click)="$event.stopPropagation()">
          <h3>{{ p.title }}</h3>
          <p class="msg">{{ p.message }}</p>
          <div class="actions">
            @if (p.cancelLabel) {
              <button class="btn btn-ghost" (click)="confirm.resolve(false)">
                {{ p.cancelLabel }}
              </button>
            }
            <button
              class="btn"
              [class.btn-danger]="p.danger"
              [class.btn-primary]="!p.danger"
              (click)="confirm.resolve(true)"
            >
              {{ p.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(2, 6, 23, 0.45);
        -webkit-backdrop-filter: blur(2px);
        backdrop-filter: blur(2px);
        display: grid;
        place-items: center;
        z-index: 1300;
        animation: fade 0.15s ease;
      }
      .card {
        width: min(92vw, 380px);
        padding: 22px;
        background: var(--paper-solid);
      }
      h3 {
        font-size: 17px;
        margin-bottom: 6px;
      }
      .msg {
        color: var(--ink-2);
        font-size: 14px;
        margin: 0 0 18px;
        line-height: 1.5;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  protected confirm = inject(ConfirmService);
}
