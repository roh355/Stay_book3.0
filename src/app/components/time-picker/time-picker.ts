import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BookingStore } from '../../core/booking-store';
import { AuthModalService } from '../../core/auth-modal.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../core/confirm.service';
import { Booking, SLOT_COUNT } from '../../core/models';
import { slotToLabel, rangeLabel, durationLabel, hourTicks } from '../../core/time-utils';

const SLOT_MIN_PX = 18;

@Component({
  selector: 'sb-time-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    @if (store.selectedRoom(); as room) {
      <div class="picker">
        <div class="head">
          <button class="btn btn-ghost back" (click)="store.deselectRoom()">‹ View rooms</button>
          <div class="room-tag">
            <span class="code tnum">{{ room.code }}</span>
            <span class="cap tnum">cap {{ room.capacity }}</span>
          </div>
        </div>

        <div class="toolbar">
          <mat-form-field class="topic-field" appearance="outline" subscriptSizing="dynamic">
            <mat-label>Topic (optional)</mat-label>
            <input matInput [(ngModel)]="topic" maxlength="80" />
          </mat-form-field>

          <div class="range-label tnum">
            @if (hasSelection()) {
              {{ rangeText() }} <span class="dur">· {{ durText() }}</span>
            } @else {
              <span class="muted">Pick a free range</span>
            }
          </div>

          <button class="btn btn-primary" [disabled]="!hasSelection()" (click)="confirm()">
            Confirm booking
          </button>
        </div>

        <div class="grid-area">
          <div class="ribbon" (pointerleave)="endDrag()">
            <div class="scroll-body" [style.min-width.px]="scrollMinW">
              <div class="ticks tnum" [style.grid-template-columns]="gridCols">
                @for (t of ticks; track t) {
                  <span
                    class="tick"
                    [style.grid-column]="tickCol(t)"
                    [class.end-tick]="t === SLOT_COUNT"
                    >{{ label(t) }}</span
                  >
                }
              </div>

              <div class="track" [style.grid-template-columns]="gridCols">
                @for (i of slots; track i) {
                  <div
                    class="cell"
                    [style.grid-column]="i + 1"
                    [class.free]="isFree(i)"
                    [class.booked]="!isFree(i)"
                    [class.sel]="isSelected(i)"
                    [class.hour]="i % 2 === 0"
                    (pointerdown)="onDown(i, $event)"
                    (pointerenter)="onEnter(i)"
                  ></div>
                }

                @if (hasSelection()) {
                  <div
                    class="interval sel-band"
                    [style.grid-column]="selStart()! + 1 + ' / span ' + (selEnd()! - selStart()!)"
                  >
                    <div class="band-info">
                      <span class="title">Selected</span>
                      <span class="range tnum">{{ rangeText() }}</span>
                      <span class="meta tnum">{{ durText() }}</span>
                    </div>
                  </div>
                }

                @for (b of bookings(); track b.id) {
                  <div
                    class="interval booked-band"
                    [class.active]="selectedBooking()?.id === b.id"
                    [style.grid-column]="b.startSlot + 1 + ' / span ' + (b.endSlot - b.startSlot)"
                    (click)="toggleBooking(b, $event)"
                  >
                    <div class="band-info">
                      <span class="title">{{ b.topic || 'Booked' }}</span>
                      <span class="range tnum">{{ rangeLabel(b.startSlot, b.endSlot) }}</span>
                      <span class="meta">{{ b.userName }}</span>
                      <span class="meta tnum">{{ durationLabel(b.startSlot, b.endSlot) }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        @if (selectedBooking(); as b) {
          <div class="detail panel">
            <div class="detail-head">
              <div>
                <div class="detail-topic">{{ b.topic || 'Booked' }}</div>
                <div class="detail-row tnum">{{ rangeLabel(b.startSlot, b.endSlot) }}</div>
                <div class="detail-row">{{ b.userName }}</div>
              </div>
              <button class="btn icon-btn close" (click)="selectedBooking.set(null)" aria-label="Close">
                ×
              </button>
            </div>
            @if (canCancel(b)) {
              <button class="btn btn-danger cancel-btn" (click)="cancel(b)">Cancel booking</button>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 0;
      }
      .picker {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 16px 18px 18px;
        min-height: 0;
        position: relative;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .back {
        font-size: 13px;
        font-weight: 600;
        color: var(--slate);
        padding: 6px 10px;
      }
      .room-tag {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin-left: auto;
      }
      .code {
        font-weight: 800;
        font-size: 20px;
      }
      .cap {
        color: var(--ink-2);
        font-size: 13px;
      }
      .close {
        font-size: 20px;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .topic-field {
        flex: 1;
        min-width: 160px;
      }
      .range-label {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
      }
      .range-label .dur {
        color: var(--ink-2);
        font-weight: 500;
      }
      .range-label .muted {
        color: var(--ink-2);
        font-weight: 500;
      }
      .grid-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .ribbon {
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        min-height: 132px;
      }
      .scroll-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-height: 100%;
        width: 100%;
      }
      .ticks {
        display: grid;
        flex: none;
        height: 16px;
        color: var(--ink-2);
        font-size: 9px;
      }
      .tick {
        grid-row: 1;
        justify-self: start;
        white-space: nowrap;
      }
      .tick.end-tick {
        justify-self: end;
      }
      .track {
        position: relative;
        display: grid;
        grid-template-rows: 1fr;
        flex: 1;
        min-height: 108px;
        border-radius: var(--radius-sm);
        overflow: hidden;
        border: 1px solid var(--hairline);
        background: var(--slot-free-bg);
        touch-action: none;
      }
      .cell {
        grid-row: 1;
        background: var(--slot-free-bg);
        border-right: 1px solid color-mix(in srgb, var(--hairline) 70%, transparent);
        box-sizing: border-box;
      }
      .cell.hour {
        border-right-color: color-mix(in srgb, var(--stone-line) 25%, transparent);
      }
      .cell.booked {
        background: transparent;
        border-right-color: color-mix(in srgb, var(--hairline) 70%, transparent);
        pointer-events: none;
      }
      .cell.free {
        cursor: pointer;
        z-index: 1;
      }
      .cell.free:hover {
        background: var(--slot-hover);
      }
      .cell.sel {
        background: transparent;
        border-right-color: color-mix(in srgb, var(--hairline) 70%, transparent);
      }
      .interval {
        grid-row: 1;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px 4px;
        box-sizing: border-box;
        margin: 3px 1px;
        min-height: calc(100% - 6px);
        align-self: stretch;
        border-radius: 10px;
        overflow: hidden;
      }
      .band-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        width: 100%;
        min-width: 0;
        text-align: center;
        line-height: 1.15;
      }
      .band-info .title {
        font-size: 10px;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
      .band-info .range {
        font-size: 9px;
        font-weight: 700;
        white-space: nowrap;
      }
      .band-info .meta {
        font-size: 8px;
        font-weight: 600;
        opacity: 0.88;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
      .sel-band {
        background: color-mix(in srgb, var(--slate) 88%, transparent);
        color: #fff;
        z-index: 3;
        pointer-events: none;
      }
      .booked-band {
        background: var(--slot-booked-bg);
        color: var(--pill-busy-ink);
        cursor: pointer;
        border: 1px solid color-mix(in srgb, var(--pill-busy-ink) 40%, transparent);
        box-shadow: 0 1px 3px color-mix(in srgb, var(--pill-busy-ink) 15%, transparent);
      }
      .booked-band.active {
        outline: 2px solid var(--slate);
        outline-offset: -2px;
        z-index: 4;
      }
      .detail {
        position: absolute;
        top: 72px;
        right: 18px;
        padding: 12px 14px;
        background: var(--paper-solid);
        z-index: 6;
        min-width: 200px;
      }
      .detail-head {
        display: flex;
        gap: 10px;
        justify-content: space-between;
        align-items: flex-start;
      }
      .detail-topic {
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 2px;
      }
      .detail-row {
        color: var(--ink-2);
        font-size: 12px;
      }
      .cancel-btn {
        margin-top: 10px;
        width: 100%;
        justify-content: center;
      }
    `,
  ],
})
export class TimePickerComponent {
  protected store = inject(BookingStore);
  private authModal = inject(AuthModalService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirmSvc = inject(ConfirmService);

  protected readonly SLOT_COUNT = SLOT_COUNT;
  protected slots = Array.from({ length: SLOT_COUNT }, (_, i) => i);
  protected ticks = hourTicks();
  protected rangeLabel = rangeLabel;
  protected durationLabel = durationLabel;
  protected gridCols = `repeat(${SLOT_COUNT}, minmax(${SLOT_MIN_PX}px, 1fr))`;
  protected scrollMinW = SLOT_COUNT * SLOT_MIN_PX;

  protected topic = '';
  protected selStart = signal<number | null>(null);
  protected selEnd = signal<number | null>(null);
  protected selectedBooking = signal<Booking | null>(null);

  private anchor: number | null = null;
  private dragging = false;

  protected bookings = computed(() => {
    const room = this.store.selectedRoom();
    return room ? this.store.roomBookings(room.id) : [];
  });

  protected hasSelection = computed(() => this.selStart() !== null && this.selEnd() !== null);
  protected rangeText = computed(() =>
    this.hasSelection() ? rangeLabel(this.selStart()!, this.selEnd()!) : '',
  );
  protected durText = computed(() =>
    this.hasSelection() ? durationLabel(this.selStart()!, this.selEnd()!) : '',
  );

  tickCol(t: number): number {
    return t >= SLOT_COUNT ? SLOT_COUNT : t + 1;
  }

  label(t: number): string {
    return slotToLabel(t);
  }

  isFree(i: number): boolean {
    return !this.bookings().some((b) => i >= b.startSlot && i < b.endSlot);
  }

  isSelected(i: number): boolean {
    const s = this.selStart();
    const e = this.selEnd();
    return s !== null && e !== null && i >= s && i < e;
  }

  toggleBooking(b: Booking, ev: MouseEvent): void {
    ev.stopPropagation();
    this.selectedBooking.set(this.selectedBooking()?.id === b.id ? null : b);
    this.clearSelection();
  }

  onDown(i: number, ev: PointerEvent): void {
    if (!this.isFree(i)) return;
    ev.preventDefault();
    this.selectedBooking.set(null);
    this.dragging = true;
    this.anchor = i;
    this.selStart.set(i);
    this.selEnd.set(i + 1);
  }

  onEnter(i: number): void {
    if (!this.dragging || this.anchor === null) return;
    const lo = Math.min(this.anchor, i);
    const hi = Math.max(this.anchor, i);
    let start = this.anchor;
    let end = this.anchor + 1;
    for (let s = this.anchor; s >= lo; s--) {
      if (this.isFree(s)) start = s;
      else break;
    }
    for (let e = this.anchor; e <= hi; e++) {
      if (this.isFree(e)) end = e + 1;
      else break;
    }
    this.selStart.set(start);
    this.selEnd.set(end);
  }

  endDrag(): void {
    this.dragging = false;
  }

  @HostListener('document:pointerup')
  onUp(): void {
    this.dragging = false;
  }

  canCancel(b: Booking): boolean {
    const u = this.auth.user();
    return !!u && (u.id === b.userId || u.role === 'admin');
  }

  private clearSelection(): void {
    this.selStart.set(null);
    this.selEnd.set(null);
    this.anchor = null;
  }

  confirm(): void {
    const s = this.selStart();
    const e = this.selEnd();
    if (s === null || e === null) return;
    this.authModal.requireAuth(async () => {
      try {
        const room = this.store.selectedRoom();
        await this.store.confirm(s, e, this.topic.trim() || undefined);
        this.toast.info(`Approval request sent to admin for room ${room?.code || ''}.`);
        this.topic = '';
        this.clearSelection();
      } catch (err: any) {
        this.toast.error(err?.error?.error ?? 'Could not book that range.');
        await this.store.reload();
      }
    });
  }

  async cancel(b: Booking): Promise<void> {
    const ok = await this.confirmSvc.ask({
      title: 'Cancel booking?',
      message: `Release ${b.roomCode} · ${rangeLabel(b.startSlot, b.endSlot)}?`,
      confirmLabel: 'Cancel booking',
      cancelLabel: 'Keep it',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.store.cancel(b.id);
      this.selectedBooking.set(null);
      this.toast.info('Booking cancelled.');
    } catch (err: any) {
      this.toast.error(err?.error?.error ?? 'Could not cancel.');
    }
  }
}
