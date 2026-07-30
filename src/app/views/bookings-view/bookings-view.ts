import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { BookingApiService } from '../../core/booking-api.service';
import { HostelApiService } from '../../core/hostel-api.service';
import { AuthService } from '../../core/auth.service';
import { AuthModalService } from '../../core/auth-modal.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { ViewService } from '../../core/view.service';
import { Booking, Stay } from '../../core/models';
import { nightsInclusive, stayRangeLabelFromStay, toInclusiveCheckOut, formatDmy } from '../../core/date-utils';
import { rangeLabel, durationLabel } from '../../core/time-utils';

interface Item {
  kind: 'conference' | 'hostel';
  id: string;
  roomCode: string;
  createdAt: string;
  line1: string;
  line2: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
}

@Component({
  selector: 'sb-bookings-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="view">
      <header class="head">
        <h2>Your bookings</h2>
        <p class="hint">
          {{ items().length }} reservation{{ items().length === 1 ? '' : 's' }} across conference
          rooms and hostel stays.
        </p>
      </header>

      @if (!auth.isSignedIn()) {
        <div class="empty panel">
          <p>Sign in to see your bookings.</p>
          <button class="btn btn-primary" (click)="modal.show()">Sign in</button>
        </div>
      } @else if (items().length === 0) {
        <div class="empty panel">
          <p>No reservations yet.</p>
          <button class="btn btn-primary" (click)="view.go('conference')">Book a room</button>
        </div>
      } @else {
        <div class="grid">
          @for (it of items(); track it.kind + it.id) {
            <div class="card panel">
              <div class="card-top">
                <span class="badge" [class.conf]="it.kind === 'conference'" [class.host]="it.kind === 'hostel'">
                  {{ it.kind }}
                </span>
                <span class="status-badge" [class]="it.status">{{ it.status }}</span>
                <span class="code tnum">{{ it.roomCode }}</span>
                <button class="btn icon-btn cancel" (click)="cancel(it)" aria-label="Cancel">🗑</button>
              </div>
              <div class="l1 tnum">{{ it.line1 }}</div>
              <div class="l2 tnum">{{ it.line2 }}</div>
              @if (it.note) {
                <div class="note">"{{ it.note }}"</div>
              }
              <div class="booked tnum">Booked {{ when(it.createdAt) }}</div>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .view {
        padding: 22px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-width: 1200px;
        margin: 0 auto;
      }
      .head h2 {
        font-size: 22px;
      }
      .head .hint {
        margin-top: 4px;
      }
      .empty {
        padding: 48px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        color: var(--ink-2);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 14px;
      }
      .card {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .card-top {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 4px;
      }
      .badge.conf {
        background: var(--pill-busy-bg);
        color: var(--pill-busy-ink);
      }
      .badge.host {
        background: var(--pill-free-bg);
        color: var(--pill-free-ink);
      }
      .status-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 999px;
        text-transform: uppercase;
      }
      .status-badge.pending {
        background: #fdf6b2;
        color: #723b13;
      }
      .status-badge.approved {
        background: #def7ec;
        color: #03543f;
      }
      .status-badge.rejected {
        background: #fde8e8;
        color: #9b1c1c;
      }
      .code {
        font-weight: 800;
        font-size: 17px;
      }
      .cancel {
        margin-left: auto;
        font-size: 13px;
        color: var(--danger);
        background: transparent;
        border-color: transparent;
      }
      .cancel:hover {
        background: var(--danger-soft);
      }
      .l1 {
        font-weight: 700;
        font-size: 15px;
      }
      .l2 {
        color: var(--ink);
        font-size: 14px;
      }
      .note {
        color: var(--ink-2);
        font-style: italic;
        font-size: 13px;
      }
      .booked {
        color: var(--ink-2);
        font-size: 12px;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .booked::before {
        content: '◷';
      }
    `,
  ],
})
export class BookingsViewComponent implements OnInit {
  protected auth = inject(AuthService);
  protected modal = inject(AuthModalService);
  protected view = inject(ViewService);
  private bookingApi = inject(BookingApiService);
  private hostelApi = inject(HostelApiService);
  private confirmSvc = inject(ConfirmService);
  private toast = inject(ToastService);

  private bookings = signal<Booking[]>([]);
  private stays = signal<Stay[]>([]);

  protected items = computed<Item[]>(() => {
    const b: Item[] = this.bookings().map((x) => ({
      kind: 'conference' as const,
      id: x.id,
      roomCode: x.roomCode,
      createdAt: x.createdAt,
      line1: formatDmy(x.date),
      line2: `${rangeLabel(x.startSlot, x.endSlot)} · ${durationLabel(x.startSlot, x.endSlot)}`,
      note: x.topic,
      status: x.status,
    }));
    const s: Item[] = this.stays().map((x) => {
      const coInc = toInclusiveCheckOut(x.checkOut);
      const n = nightsInclusive(x.checkIn, coInc);
      return {
        kind: 'hostel' as const,
        id: x.id,
        roomCode: x.roomCode,
        createdAt: x.createdAt,
        line1: stayRangeLabelFromStay(x.checkIn, x.checkOut).split(' · ')[0],
        line2: `${n} night${n === 1 ? '' : 's'}`,
        note: x.guest,
        status: x.status,
      };
    });
    return [...b, ...s].sort((a, z) => z.createdAt.localeCompare(a.createdAt));
  });

  constructor() {
    effect(() => {
      if (this.auth.isSignedIn()) this.load();
      else {
        this.bookings.set([]);
        this.stays.set([]);
      }
    });
  }

  ngOnInit(): void {
    if (this.auth.isSignedIn()) this.load();
  }

  private async load(): Promise<void> {
    try {
      const [b, s] = await Promise.all([this.bookingApi.mine(), this.hostelApi.mine()]);
      this.bookings.set(b);
      this.stays.set(s);
    } catch {
      /* signed-out or API down */
    }
  }

  when(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  async cancel(it: Item): Promise<void> {
    const ok = await this.confirmSvc.ask({
      title: it.kind === 'conference' ? 'Cancel booking?' : 'Cancel stay?',
      message: `Release ${it.roomCode} · ${it.line1}?`,
      confirmLabel: 'Cancel it',
      cancelLabel: 'Keep it',
      danger: true,
    });
    if (!ok) return;
    try {
      if (it.kind === 'conference') await this.bookingApi.remove(it.id);
      else await this.hostelApi.remove(it.id);
      this.toast.info('Reservation cancelled.');
      await this.load();
    } catch (err: any) {
      this.toast.error(err?.error?.error ?? 'Could not cancel.');
    }
  }
}
