import { Injectable, signal } from '@angular/core';

export type Tab = 'conference' | 'hostel' | 'bookings' | 'admin';

@Injectable({ providedIn: 'root' })
export class ViewService {
  readonly tab = signal<Tab>('conference');

  go(tab: Tab): void {
    this.tab.set(tab);
  }
}
