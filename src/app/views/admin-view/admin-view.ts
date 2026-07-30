import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AdminApiService, AdminRequests } from '../../core/admin-api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { formatDmy, stayRangeLabelFromStay, toInclusiveCheckOut, nightsInclusive } from '../../core/date-utils';
import { rangeLabel, durationLabel } from '../../core/time-utils';
import { BookingStore } from '../../core/booking-store';
import { HostelStore } from '../../core/hostel-store';

interface AdminItem {
  type: 'bookings' | 'stays';
  id: string;
  roomCode: string;
  userName: string;
  createdAt: string;
  line1: string;
  line2: string;
  note?: string;
}

@Component({
  selector: 'sb-admin-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="view">
      <header class="head">
        <h2>Admin Requests</h2>
        <p class="hint">
          {{ items().length }} pending request{{ items().length === 1 ? '' : 's' }} awaiting approval.
        </p>
      </header>

      @if (!auth.isAdmin()) {
        <div class="empty panel">
          <p>You do not have permission to view this page.</p>
        </div>
      } @else if (items().length === 0) {
        <div class="empty panel">
          <p>No pending requests.</p>
        </div>
      } @else {
        <div class="grid">
          @for (it of items(); track it.type + it.id) {
            <div class="card panel">
              <div class="card-top">
                <span class="badge" [class.conf]="it.type === 'bookings'" [class.host]="it.type === 'stays'">
                  {{ it.type === 'bookings' ? 'conference' : 'hostel' }}
                </span>
                <span class="code tnum">{{ it.roomCode }}</span>
              </div>
              <div class="l1 tnum">{{ it.line1 }}</div>
              <div class="l2 tnum">{{ it.line2 }}</div>
              <div class="user">User: {{ it.userName }}</div>
              @if (it.note) {
                <div class="note">"{{ it.note }}"</div>
              }
              <div class="booked tnum">Requested {{ when(it.createdAt) }}</div>
              
              <div class="actions">
                <button class="btn btn-primary" (click)="approve(it)">Approve</button>
                <button class="btn btn-secondary" (click)="reject(it)">Reject</button>
              </div>
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
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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
      .code {
        font-weight: 800;
        font-size: 17px;
        margin-left: auto;
      }
      .l1 {
        font-weight: 700;
        font-size: 15px;
      }
      .l2 {
        color: var(--ink);
        font-size: 14px;
      }
      .user {
        color: var(--ink-2);
        font-size: 13px;
        font-weight: 600;
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
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      .actions button {
        flex: 1;
        padding: 8px;
        font-size: 13px;
      }
      .btn-secondary {
        background: transparent;
        border: 1px solid var(--hairline);
        color: var(--ink);
      }
      .btn-secondary:hover {
        background: var(--paper-hover);
      }
    `,
  ],
})
export class AdminViewComponent implements OnInit, OnDestroy {
  protected auth = inject(AuthService);
  private api = inject(AdminApiService);
  private toast = inject(ToastService);
  private conference = inject(BookingStore);
  private hostel = inject(HostelStore);

  private requests = signal<AdminRequests>({ bookings: [], stays: [] });
  private timer: any;

  protected items = computed<AdminItem[]>(() => {
    const data = this.requests();
    const b: AdminItem[] = data.bookings.map((x) => ({
      type: 'bookings' as const,
      id: x.id,
      roomCode: x.roomCode,
      userName: x.userName,
      createdAt: x.createdAt,
      line1: formatDmy(x.date),
      line2: `${rangeLabel(x.startSlot, x.endSlot)} · ${durationLabel(x.startSlot, x.endSlot)}`,
      note: x.topic,
    }));
    const s: AdminItem[] = data.stays.map((x) => {
      const coInc = toInclusiveCheckOut(x.checkOut);
      const n = nightsInclusive(x.checkIn, coInc);
      return {
        type: 'stays' as const,
        id: x.id,
        roomCode: x.roomCode,
        userName: x.userName,
        createdAt: x.createdAt,
        line1: stayRangeLabelFromStay(x.checkIn, x.checkOut).split(' · ')[0],
        line2: `${n} night${n === 1 ? '' : 's'}`,
        note: x.guest,
      };
    });
    return [...b, ...s].sort((a, z) => a.createdAt.localeCompare(z.createdAt));
  });

  constructor() {
    effect(() => {
      if (this.auth.isAdmin()) this.load();
    });
  }

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      this.load();
      this.timer = setInterval(() => this.load(), 2000);
    }
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async load(): Promise<void> {
    try {
      this.requests.set(await this.api.getRequests());
    } catch {
      // API down or not admin
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

  async approve(it: AdminItem): Promise<void> {
    try {
      await this.api.approve(it.type, it.id);
      this.toast.info('Request approved.');
      await this.load();
      await this.conference.reload();
      await this.hostel.reload();
    } catch (err: any) {
      this.toast.error(err?.error?.error ?? 'Could not approve.');
    }
  }

  async reject(it: AdminItem): Promise<void> {
    try {
      await this.api.reject(it.type, it.id);
      this.toast.info('Request rejected.');
      await this.load();
      await this.conference.reload();
      await this.hostel.reload();
    } catch (err: any) {
      this.toast.error(err?.error?.error ?? 'Could not reject.');
    }
  }
}
