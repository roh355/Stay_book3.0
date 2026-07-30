import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { ViewService } from '../../core/view.service';
import { ThemeService } from '../../core/theme.service';
import { AuthService } from '../../core/auth.service';
import { AuthModalService } from '../../core/auth-modal.service';

@Component({
  selector: 'sb-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <div class="brand" (click)="view.go('conference')">
        <svg class="mark" viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M12 30 L32 13 L52 30 V51 a2 2 0 0 1 -2 2 H14 a2 2 0 0 1 -2 -2 Z"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <path
            d="M26 53 V39 a2 2 0 0 1 2 -2 h8 a2 2 0 0 1 2 2 V53"
            fill="none"
            stroke="currentColor"
            stroke-width="3.4"
            stroke-linejoin="round"
          />
        </svg>
        <span class="word">StayBook</span>
      </div>

      <nav class="tabs">
        <button
          class="tab"
          [class.active]="view.tab() === 'conference'"
          (click)="view.go('conference')"
        >
          Conferences
        </button>
        <button
          class="tab"
          [class.active]="view.tab() === 'hostel'"
          (click)="view.go('hostel')"
        >
          Hostels
        </button>
        @if (auth.isAdmin()) {
          <button
            class="tab"
            [class.active]="view.tab() === 'admin'"
            (click)="view.go('admin')"
          >
            Admin
          </button>
        }
      </nav>

      <div class="right">
        <button class="btn btn-ghost theme" (click)="theme.toggle()" [title]="theme.theme() === 'dark' ? 'Switch to light' : 'Switch to dark'">
          @if (theme.theme() === 'dark') {
            <svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.2" y1="5.2" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.8" y2="18.8"/><line x1="5.2" y1="18.8" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="18.8" y2="5.2"/></g></svg>
            <span>Light</span>
          } @else {
            <svg viewBox="0 0 24 24" class="ic"><path d="M20 14.5 A8 8 0 1 1 9.5 4 A6.2 6.2 0 0 0 20 14.5 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
            <span>Dark</span>
          }
        </button>

        @if (auth.isSignedIn()) {
          <div class="user">
            <button class="btn btn-ghost bookings-link" (click)="view.go('bookings')" [class.active]="view.tab() === 'bookings'">
              <svg viewBox="0 0 24 24" class="ic"><rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><line x1="4" y1="9.5" x2="20" y2="9.5" stroke="currentColor" stroke-width="2"/><line x1="8" y1="3" x2="8" y2="6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="3" x2="16" y2="6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              Bookings
            </button>
            <button class="avatar" (click)="menuOpen.set(!menuOpen())" [title]="auth.user()?.name || ''">
              {{ initials() }}
            </button>
            @if (menuOpen()) {
              <div class="menu panel" (click)="menuOpen.set(false)">
                <div class="who">
                  <div class="who-name">{{ auth.user()?.name }}</div>
                  <div class="who-role">{{ auth.user()?.role }}</div>
                </div>
                <button class="menu-item" (click)="view.go('bookings')">My bookings</button>
                <button class="menu-item danger" (click)="signOut()">Sign out</button>
              </div>
            }
          </div>
        } @else {
          <button class="btn signin" (click)="modal.show()">Sign in</button>
        }
      </div>
    </header>
  `,
  styles: [
    `
      .bar {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 14px 26px;
        border-bottom: 1px solid var(--hairline);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 9px;
        cursor: pointer;
        user-select: none;
      }
      .mark {
        width: 24px;
        height: 24px;
        color: var(--slate);
      }
      .word {
        font-weight: 800;
        font-size: 18px;
        letter-spacing: -0.03em;
      }
      .tabs {
        display: flex;
        gap: 4px;
        margin-left: 8px;
      }
      .tab {
        position: relative;
        background: transparent;
        border: none;
        color: var(--ink-2);
        font-size: 15px;
        font-weight: 600;
        padding: 8px 6px;
        margin: 0 8px;
        cursor: pointer;
      }
      .tab:hover {
        color: var(--ink);
      }
      .tab.active {
        color: var(--ink);
      }
      .tab.active::after {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        bottom: -15px;
        height: 2px;
        background: var(--slate);
        border-radius: 2px;
      }
      .right {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ic {
        width: 17px;
        height: 17px;
      }
      .theme {
        font-size: 13px;
      }
      .user {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .bookings-link {
        font-size: 13px;
      }
      .bookings-link.active {
        color: var(--slate);
      }
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 999px;
        border: none;
        background: var(--slate);
        color: #fff;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
      }
      .signin {
        background: var(--slate);
        color: #fff;
        border-color: transparent;
      }
      .signin:hover {
        background: var(--slate-hover);
      }
      .menu {
        position: absolute;
        top: 46px;
        right: 0;
        width: 190px;
        padding: 8px;
        background: var(--paper-solid);
        z-index: 1100;
        display: flex;
        flex-direction: column;
      }
      .who {
        padding: 8px 10px 10px;
        border-bottom: 1px solid var(--hairline);
        margin-bottom: 6px;
      }
      .who-name {
        font-weight: 700;
        font-size: 14px;
      }
      .who-role {
        color: var(--ink-2);
        font-size: 12px;
        text-transform: capitalize;
      }
      .menu-item {
        text-align: left;
        background: transparent;
        border: none;
        color: var(--ink);
        padding: 9px 10px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
      }
      .menu-item:hover {
        background: var(--input-bg);
      }
      .menu-item.danger {
        color: var(--danger);
      }
    `,
  ],
})
export class HeaderComponent {
  protected view = inject(ViewService);
  protected theme = inject(ThemeService);
  protected auth = inject(AuthService);
  protected modal = inject(AuthModalService);
  protected menuOpen = signal(false);

  initials(): string {
    const n = this.auth.user()?.name ?? '';
    return n
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  signOut(): void {
    this.auth.logout();
    this.view.go('conference');
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.user')) this.menuOpen.set(false);
  }
}
