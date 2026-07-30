import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { HostelStore } from '../../core/hostel-store';
import { ROOM_STORE } from '../../core/room-store';
import { BuildingComponent } from '../../components/building/building';
import { FloorPlanComponent } from '../../components/floor-plan/floor-plan';
import { DateRibbonComponent } from '../../components/date-ribbon/date-ribbon';
import { addDays, fromYmd, stayRangeLabel, toYmd } from '../../core/date-utils';

@Component({
  selector: 'sb-hostel-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: ROOM_STORE, useExisting: HostelStore }],
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    BuildingComponent,
    FloorPlanComponent,
    DateRibbonComponent,
  ],
  template: `
    <section class="view">
      <div class="controls panel">
        <div class="ctrl">
          <label>Check-in</label>
          <mat-form-field class="date-field" appearance="outline" subscriptSizing="dynamic">
            <input
              matInput
              [matDatepicker]="dpIn"
              [ngModel]="draftCheckIn()"
              (ngModelChange)="onDraftCheckIn($event)"
            />
            <mat-datepicker-toggle matIconSuffix [for]="dpIn"></mat-datepicker-toggle>
            <mat-datepicker #dpIn></mat-datepicker>
          </mat-form-field>
        </div>

        <div class="ctrl">
          <label>Check-out</label>
          <mat-form-field class="date-field" appearance="outline" subscriptSizing="dynamic">
            <input
              matInput
              [matDatepicker]="dpOut"
              [ngModel]="draftCheckOut()"
              (ngModelChange)="onDraftCheckOut($event)"
            />
            <mat-datepicker-toggle matIconSuffix [for]="dpOut"></mat-datepicker-toggle>
            <mat-datepicker #dpOut></mat-datepicker>
          </mat-form-field>
        </div>

        <button class="btn btn-primary search" (click)="search()">Search</button>

        <div class="summary tnum">{{ rangeSummary() }}</div>

        <div class="hint">Pick your dates, then choose a floor and room.</div>
      </div>

      <div class="stage">
        <div class="pane building-pane">
          <sb-building />
        </div>
        <div class="pane plan-pane">
          <div class="plan-scroll">
            @if (store.selectedRoom()) {
              <sb-date-ribbon />
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
      .search {
        padding: 9px 20px;
      }
      .summary {
        font-size: 13px;
        font-weight: 600;
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
export class HostelViewComponent implements OnInit {
  protected store = inject(HostelStore);

  protected draftCheckIn = signal<Date>(fromYmd(this.store.checkIn()));
  protected draftCheckOut = signal<Date>(fromYmd(this.store.checkOut()));

  protected rangeSummary = computed(() =>
    stayRangeLabel(this.store.checkIn(), this.store.checkOut()),
  );

  ngOnInit(): void {
    this.store.init();
    this.syncDraftFromStore();
  }

  private syncDraftFromStore(): void {
    this.draftCheckIn.set(fromYmd(this.store.checkIn()));
    this.draftCheckOut.set(fromYmd(this.store.checkOut()));
  }

  onDraftCheckIn(d: Date | null): void {
    if (!d) return;
    this.draftCheckIn.set(d);
    if (this.draftCheckOut() <= d) {
      this.draftCheckOut.set(fromYmd(addDays(toYmd(d), 1)));
    }
  }

  onDraftCheckOut(d: Date | null): void {
    if (!d) return;
    if (d <= this.draftCheckIn()) return;
    this.draftCheckOut.set(d);
  }

  search(): void {
    const ci = toYmd(this.draftCheckIn());
    const co = toYmd(this.draftCheckOut());
    if (co <= ci) return;
    this.store.setSearch(ci, co);
  }
}
