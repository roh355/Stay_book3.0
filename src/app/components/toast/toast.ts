import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'sb-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-wrap">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.error]="t.kind === 'error'" [class.info]="t.kind === 'info'">
          <span class="dot"></span>
          <span class="msg">{{ t.message }}</span>
          <button class="x" (click)="toast.dismiss(t.id)" aria-label="Dismiss">×</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-wrap {
        position: fixed;
        bottom: 22px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 1200;
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--paper-solid);
        border: 1px solid var(--hairline);
        box-shadow: var(--panel-shadow);
        border-radius: 999px;
        padding: 10px 12px 10px 16px;
        color: var(--ink);
        font-size: 14px;
        font-weight: 500;
        animation: rise 0.22s ease;
        max-width: min(92vw, 460px);
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--sage);
        flex: none;
      }
      .toast.info .dot {
        background: var(--slate);
      }
      .toast.error .dot {
        background: var(--danger);
      }
      .toast.error {
        color: var(--danger);
      }
      .msg {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .x {
        border: none;
        background: transparent;
        color: var(--ink-2);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 0 2px;
      }
      .x:hover {
        color: var(--ink);
      }
      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class ToastComponent {
  protected toast = inject(ToastService);
}
