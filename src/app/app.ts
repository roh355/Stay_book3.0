import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { ViewService } from './core/view.service';
import { AuthService } from './core/auth.service';
import { BookingStore } from './core/booking-store';
import { HostelStore } from './core/hostel-store';
import { HeaderComponent } from './components/header/header';
import { ConferenceViewComponent } from './views/conference-view/conference-view';
import { HostelViewComponent } from './views/hostel-view/hostel-view';
import { BookingsViewComponent } from './views/bookings-view/bookings-view';
import { AdminViewComponent } from './views/admin-view/admin-view';
import { AuthModalComponent } from './components/auth-modal/auth-modal';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog';
import { ToastComponent } from './components/toast/toast';
import { BookingApiService } from './core/booking-api.service';
import { ToastService } from './core/toast.service';
import { ConfirmService } from './core/confirm.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeaderComponent,
    ConferenceViewComponent,
    HostelViewComponent,
    BookingsViewComponent,
    AdminViewComponent,
    AuthModalComponent,
    ConfirmDialogComponent,
    ToastComponent,
  ],
  template: `
    <sb-header />

    <main>
      @switch (view.tab()) {
        @case ('conference') {
          <sb-conference-view />
        }
        @case ('hostel') {
          <sb-hostel-view />
        }
        @case ('bookings') {
          <sb-bookings-view />
        }
        @case ('admin') {
          <sb-admin-view />
        }
      }
    </main>

    <sb-auth-modal />
    <sb-confirm-dialog />
    <sb-toast />
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
      main {
        display: block;
      }
    `,
  ],
})
export class App implements OnInit {
  protected view = inject(ViewService);
  private auth = inject(AuthService);
  private conference = inject(BookingStore);
  private hostel = inject(HostelStore);
  private bookingApi = inject(BookingApiService);
  private toast = inject(ToastService);
  private confirmSvc = inject(ConfirmService);

  async ngOnInit(): Promise<void> {
    await this.auth.init();
    // Prime both stores so the first tab render is instant.
    this.conference.init();
    this.hostel.init();

    // Poll for rejected requests and update state continuously
    setInterval(async () => {
      if (this.auth.isSignedIn()) {
        try {
          const res = await this.bookingApi.pollRejected();
          if (res.bookings.length > 0 || res.stays.length > 0) {
            await this.confirmSvc.alert('Booking Failed', 'booking failed');
          }
          await this.conference.reload();
          await this.hostel.reload();
        } catch {}
      }
    }, 2000); // Check every 2 seconds for real-time status updates
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const typing =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);
    if (typing) return;

    const tab = this.view.tab();
    if (tab !== 'conference' && tab !== 'hostel') return;
    const store = tab === 'conference' ? this.conference : this.hostel;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      store.stepFloor(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      store.stepFloor(-1);
    } else if (e.key === 'Escape') {
      store.deselectRoom();
    }
  }
}
