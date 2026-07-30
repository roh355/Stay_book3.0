import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { BookingStore } from '../../core/booking-store';
import { ROOM_STORE } from '../../core/room-store';
import { BuildingComponent } from '../../components/building/building';
import { FloorPlanComponent } from '../../components/floor-plan/floor-plan';
import { TimePickerComponent } from '../../components/time-picker/time-picker';
import { SLOT_COUNT } from '../../core/models';
import { slotToLabel } from '../../core/time-utils';
import { fromYmd, formatDmy, today, toYmd } from '../../core/date-utils';

@Component({
  selector: 'sb-conference-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ROOM_STORE, useExisting: BookingStore }],
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    BuildingComponent,
    FloorPlanComponent,
    TimePickerComponent,
  ],
  template: `
    <section class="view">
      <div class="controls panel">
        <div class="ctrl">
          <label>Date</label>
          <mat-form-field class="date-field" appearance="outline" subscriptSizing="dynamic">
            <input
              matInput
              [matDatepicker]="dp"
              [ngModel]="draftDate()"
              (ngModelChange)="draftDate.set($event)"
            />
            <mat-datepicker-toggle matIconSuffix [for]="dp"></mat-datepicker-toggle>
            <mat-datepicker #dp></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="ctrl">
          <label>From</label>
          <select class="field time" [ngModel]="draftFrom()" (ngModelChange)="onDraftFrom(+$event)">
            @for (s of fromOptions(); track s) {
              <option [value]="s">{{ label(s) }}</option>
            }
          </select>
        </div>

        <div class="ctrl">
          <label>To</label>
          <select class="field time" [ngModel]="draftTo()" (ngModelChange)="onDraftTo(+$event)">
            @for (s of toOptions(); track s) {
              <option [value]="s">{{ label(s) }}</option>
            }
          </select>
        </div>

        <button class="btn btn-primary search" (click)="search()">Search</button>

        <div class="summary">
          <span class="tnum"
            >{{ formatDmy(store.date()) }} · {{ label(store.fromSlot()) }}–{{
              label(store.toSlot())
            }}</span
          >
        </div>

        <div class="hint">Pick a date &amp; window, then choose a floor and room.</div>
      </div>

      <div class="stage">
        <div class="pane building-pane">
          <sb-building />
        </div>
        <div class="pane plan-pane">
          <div class="plan-scroll">
            @if (store.selectedRoom()) {
              <sb-time-picker />
            } @else {
              <sb-floor-plan />
            }
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .view {
        padding: 18px 22px 26px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .controls {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 12px 16px;
        flex-wrap: wrap;
      }
      .ctrl {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ctrl label {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-2);
      }
      .date-field {
        width: 148px;
      }
      .time {
        width: 110px;
        padding: 8px 10px;
      }
      .search {
        padding: 9px 20px;
      }
      .summary {
        font-size: 13px;
        font-weight: 600;
        color: var(--ink);
      }
      .hint {
        margin-left: auto;
        color: var(--ink-2);
        font-size: 13px;
      }
      .stage {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.35fr);
        gap: 16px;
        min-height: 560px;
      }
      .pane {
        border-radius: var(--radius);
      }
      .building-pane {
        min-height: 560px;
        display: flex;
        height: 100%;
      }
      .plan-pane {
        display: flex;
        flex-direction: column;
        min-height: 560px;
      }
      .plan-scroll {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--paper);
        border: 1px solid var(--hairline);
        border-radius: var(--radius);
        box-shadow: var(--panel-shadow);
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
        overflow: hidden;
        min-height: 0;
      }
      .plan-scroll sb-time-picker,
      .plan-scroll sb-floor-plan,
      .plan-scroll sb-date-ribbon {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      @media (max-width: 900px) {
        .stage {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ConferenceViewComponent implements OnInit {
  protected store = inject(BookingStore);
  protected readonly SLOT_COUNT = SLOT_COUNT;
  protected formatDmy = formatDmy;

  protected draftDate = signal<Date>(fromYmd(today()));
  protected draftFrom = signal(18);
  protected draftTo = signal(20);

  ngOnInit(): void {
    this.store.init();
    this.syncDraftFromStore();
  }

  private syncDraftFromStore(): void {
    this.draftDate.set(fromYmd(this.store.date()));
    this.draftFrom.set(this.store.fromSlot());
    this.draftTo.set(this.store.toSlot());
  }

  label(s: number): string {
    return slotToLabel(s);
  }

  fromOptions(): number[] {
    return Array.from({ length: SLOT_COUNT }, (_, i) => i);
  }

  toOptions(): number[] {
    const from = this.draftFrom();
    return Array.from({ length: SLOT_COUNT - from }, (_, i) => from + 1 + i);
  }

  onDraftFrom(s: number): void {
    this.draftFrom.set(s);
    if (this.draftTo() <= s) this.draftTo.set(s + 1);
  }

  onDraftTo(s: number): void {
    this.draftTo.set(Math.max(s, this.draftFrom() + 1));
  }

  async search(): Promise<void> {
    const d = this.draftDate();
    if (!d) return;
    await this.store.applySearch(toYmd(d), this.draftFrom(), this.draftTo());
  }
}
