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
import { HostelStore } from '../../core/hostel-store';
import { AuthModalService } from '../../core/auth-modal.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmService } from '../../core/confirm.service';
import { Stay } from '../../core/models';
import {
  addDays,
  dayNum,
  formatDmyShort,
  isFirstOfMonth,
  monthShort,
  nightsInclusive,
  stayRangeLabel,
  stayRangeLabelFromStay,
  toInclusiveCheckOut,
  weekdayShort,
} from '../../core/date-utils';

interface StayBand {
  stay: Stay;
  startIdx: number;
  span: number;
}

/** Day column sizing — capped so short searches don't stretch across the panel. */
const DAY_COL_MIN_PX = 64;
const DAY_COL_MAX_PX = 132;

@Component({
  selector: 'sb-date-ribbon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    @if (store.selectedRoom(); as room) {
      <div class="picker">
        <div class="head">
          <button class="btn btn-ghost back" (click)="store.deselectRoom()">‹ View rooms</button>
          <div class="room-tag">
            <span class="code tnum">{{ room.code }}</span>
            <span class="cap tnum">sleeps {{ room.capacity }}</span>
          </div>
        </div>

        <div class="toolbar">
          <mat-form-field class="topic-field" appearance="outline" subscriptSizing="dynamic">
            <mat-label>Guest (optional)</mat-label>
            <input matInput [(ngModel)]="guest" maxlength="60" />
          </mat-form-field>

          <div class="range-label tnum">
            @if (hasSelection()) {
              {{ rangeText() }}
            } @else {
              <span class="muted">Pick a range of nights</span>
            }
          </div>

          <button class="btn btn-primary" [disabled]="!hasSelection()" (click)="confirm()">
            Confirm stay
          </button>
        </div>

        <div class="grid-area">
          <div class="ribbon">
            <div class="scroll-body" [style.min-width.px]="gridMinWidth()">
              <div class="labels" [style.grid-template-columns]="gridCols()">
                @for (d of gridDays(); track d; let i = $index) {
                  <div
                    class="col-label"
                    [style.grid-column]="i + 1"
                    [class.month-start]="i > 0 && firstOfMonth(d)"
                  >
                    @if (i === 0 || firstOfMonth(d)) {
                      <span class="mon">{{ month(d) }}</span>
                    }
                    <span class="wd">{{ weekday(d) }}</span>
                    <span class="date-label tnum">{{ formatDmyShort(d) }}</span>
                  </div>
                }
              </div>

              <div class="track" [style.grid-template-columns]="gridCols()">
                @for (d of gridDays(); track d; let i = $index) {
                  <div
                    class="day"
                    [style.grid-column]="i + 1"
                    [class.free]="isFreeNight(i)"
                    [class.booked]="!isFreeNight(i)"
                    [class.sel]="isSelected(i)"
                    [class.month-start]="i > 0 && firstOfMonth(d)"
                    (pointerdown)="onDown(i, $event)"
                    (pointerenter)="onEnter(i)"
                  ></div>
                }

                @if (hasSelection()) {
                  <div
                    class="interval sel-band"
                    [style.grid-column]="selStart()! + 1 + ' / span ' + (selEnd()! - selStart()!)"
                  >
                    <span class="mid">Selected</span>
                  </div>
                }

                @for (band of stayBands(); track band.stay.id) {
                  <div
                    class="interval stay-band"
                    [class.active]="selectedStay()?.id === band.stay.id"
                    [style.grid-column]="band.startIdx + 1 + ' / span ' + band.span"
                    (click)="toggleStay(band.stay, $event)"
                  >
                    <span class="mid">{{ band.stay.guest || 'Reserved' }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        @if (selectedStay(); as s) {
          <div class="detail panel">
            <div class="detail-head">
              <div>
                <div class="detail-topic">{{ s.guest || 'Reserved' }}</div>
                <div class="detail-row tnum">{{ stayRangeLabelFromStay(s.checkIn, s.checkOut) }}</div>
                <div class="detail-row">{{ s.userName }}</div>
              </div>
              <button class="btn icon-btn close" (click)="selectedStay.set(null)" aria-label="Close">
                ×
              </button>
            </div>
            @if (canCancel(s)) {
              <button class="btn btn-danger cancel-btn" (click)="cancel(s)">Cancel stay</button>
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
        min-height: 100px;
      }
      .scroll-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-height: 100%;
        width: 100%;
      }
      .labels {
        display: grid;
        flex: none;
        padding-top: 16px;
      }
      .col-label {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 2px;
        text-align: center;
        min-width: 0;
      }
      .col-label.month-start {
        border-left: 2px solid color-mix(in srgb, var(--stone-line) 40%, transparent);
        padding-left: 2px;
      }
      .track {
        position: relative;
        display: grid;
        grid-template-rows: 1fr;
        gap: 0;
        flex: 1;
        min-height: 72px;
        touch-action: none;
        align-content: stretch;
      }
      .day {
        grid-row: 1;
        position: relative;
        min-height: 72px;
        border: 1px solid var(--hairline);
        border-radius: 0;
        background: var(--slot-free-bg);
        cursor: pointer;
        user-select: none;
        z-index: 1;
        box-sizing: border-box;
      }
      .day.free:hover {
        background: var(--slot-hover);
      }
      .day.booked {
        background: transparent;
        cursor: default;
      }
      .day.sel {
        background: transparent;
        z-index: 1;
      }
      .day.month-start {
        border-left: 2px solid color-mix(in srgb, var(--stone-line) 40%, transparent);
      }
      .mon {
        position: absolute;
        top: -16px;
        left: 0;
        font-size: 10px;
        font-weight: 700;
        color: var(--ink-2);
        white-space: nowrap;
      }
      .wd {
        font-size: 10px;
        color: var(--ink-2);
        opacity: 0.85;
      }
      .date-label {
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .interval {
        grid-row: 1;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 8px;
        box-sizing: border-box;
        min-height: 100%;
      }
      .interval .mid {
        font-size: 10px;
        font-weight: 600;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sel-band {
        background: color-mix(in srgb, var(--slate) 88%, transparent);
        color: #fff;
        z-index: 3;
        pointer-events: none;
        border-radius: var(--radius-sm);
      }
      .stay-band {
        background: var(--slot-booked-bg);
        color: var(--pill-busy-ink);
        cursor: pointer;
        border: 1px solid color-mix(in srgb, var(--pill-busy-ink) 40%, transparent);
        border-radius: var(--radius-sm);
        box-shadow: 0 1px 4px color-mix(in srgb, var(--pill-busy-ink) 18%, transparent);
      }
      .stay-band.active {
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
export class DateRibbonComponent {
  protected store = inject(HostelStore);
  private authModal = inject(AuthModalService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private confirmSvc = inject(ConfirmService);

  protected searchDays = this.store.searchDays;

  /** Grid shows exactly the searched range; columns are width-capped instead of padded. */
  protected gridDays = computed<string[]>(() => this.searchDays());

  protected gridCols = computed(
    () =>
      `repeat(${this.gridDays().length}, minmax(${DAY_COL_MIN_PX}px, ${DAY_COL_MAX_PX}px))`,
  );

  protected gridMinWidth = computed(() => this.gridDays().length * DAY_COL_MIN_PX);
  protected weekday = weekdayShort;
  protected dayN = dayNum;
  protected month = monthShort;
  protected firstOfMonth = isFirstOfMonth;
  protected formatDmyShort = formatDmyShort;
  protected stayRangeLabelFromStay = stayRangeLabelFromStay;
  protected toInclusiveCheckOut = toInclusiveCheckOut;

  protected guest = '';
  protected selStart = signal<number | null>(null);
  protected selEnd = signal<number | null>(null);
  protected selectedStay = signal<Stay | null>(null);

  private anchor: number | null = null;
  private dragging = false;

  protected stays = computed(() => {
    const room = this.store.selectedRoom();
    return room ? this.store.roomStays(room.id) : [];
  });

  protected stayBands = computed<StayBand[]>(() => {
    const h = this.gridDays();
    if (!h.length) return [];
    const rangeStart = h[0];
    const rangeEnd = h[h.length - 1];
    const rangeEndEx = addDays(rangeEnd, 1);

    return this.stays()
      .map((stay) => {
        const lastNight = toInclusiveCheckOut(stay.checkOut);
        if (stay.checkIn >= rangeEndEx || lastNight < rangeStart) return null;

        const visibleStart = stay.checkIn < rangeStart ? rangeStart : stay.checkIn;
        const visibleEnd = lastNight > rangeEnd ? rangeEnd : lastNight;

        const startIdx = h.indexOf(visibleStart);
        const endIdx = h.indexOf(visibleEnd);
        if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;

        return { stay, startIdx, span: endIdx - startIdx + 1 };
      })
      .filter((b): b is StayBand => b !== null);
  });

  protected hasSelection = computed(
    () => this.selStart() !== null && this.selEnd() !== null,
  );
  protected rangeText = computed(() => {
    if (!this.hasSelection()) return '';
    const ci = this.gridDays()[this.selStart()!];
    const coInc = this.gridDays()[this.selEnd()! - 1];
    return stayRangeLabel(ci, coInc);
  });

  stayAt(idx: number): Stay | null {
    const d = this.gridDays()[idx];
    return this.stays().find((s) => d >= s.checkIn && d < s.checkOut) ?? null;
  }

  isFreeNight(idx: number): boolean {
    return this.stayAt(idx) === null;
  }

  isSelected(idx: number): boolean {
    const s = this.selStart();
    const e = this.selEnd();
    return s !== null && e !== null && idx >= s && idx < e;
  }

  toggleStay(s: Stay, ev: MouseEvent): void {
    ev.stopPropagation();
    this.selectedStay.set(this.selectedStay()?.id === s.id ? null : s);
    this.clearSelection();
  }

  onDown(idx: number, ev: PointerEvent): void {
    if (!this.isFreeNight(idx)) return;
    ev.preventDefault();
    this.selectedStay.set(null);
    this.dragging = true;
    this.anchor = idx;
    this.selStart.set(idx);
    this.selEnd.set(idx + 1);
  }

  onEnter(idx: number): void {
    if (!this.dragging || this.anchor === null) return;
    const lo = Math.min(this.anchor, idx);
    const hi = Math.max(this.anchor, idx);
    let start = this.anchor;
    let end = this.anchor + 1;
    for (let s = this.anchor; s >= lo; s--) {
      if (this.isFreeNight(s)) start = s;
      else break;
    }
    for (let e = this.anchor; e <= hi; e++) {
      if (this.isFreeNight(e)) end = e + 1;
      else break;
    }
    this.selStart.set(start);
    this.selEnd.set(end);
  }

  @HostListener('document:pointerup')
  onUp(): void {
    this.dragging = false;
  }

  canCancel(s: Stay): boolean {
    const u = this.auth.user();
    return !!u && (u.id === s.userId || u.role === 'admin');
  }

  private clearSelection(): void {
    this.selStart.set(null);
    this.selEnd.set(null);
    this.anchor = null;
  }

  confirm(): void {
    if (!this.hasSelection()) return;
    const ci = this.gridDays()[this.selStart()!];
    const coInc = this.gridDays()[this.selEnd()! - 1];
    this.authModal.requireAuth(async () => {
      try {
        const room = this.store.selectedRoom();
        await this.store.confirm(ci, coInc, this.guest.trim() || undefined);
        this.toast.info(`Approval request sent to admin for room ${room?.code || ''}.`);
        this.guest = '';
        this.clearSelection();
      } catch (err: any) {
        this.toast.error(err?.error?.error ?? 'Could not book those nights.');
        await this.store.reload();
      }
    });
  }

  async cancel(s: Stay): Promise<void> {
    const ok = await this.confirmSvc.ask({
      title: 'Cancel stay?',
      message: `Release ${s.roomCode} · ${stayRangeLabelFromStay(s.checkIn, s.checkOut)}?`,
      confirmLabel: 'Cancel stay',
      cancelLabel: 'Keep it',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.store.cancel(s.id);
      this.selectedStay.set(null);
      this.toast.info('Stay cancelled.');
    } catch (err: any) {
      this.toast.error(err?.error?.error ?? 'Could not cancel.');
    }
  }
}
