import { Injectable, computed, inject, signal } from '@angular/core';
import { Booking, Floor, Room, SLOT_COUNT } from './models';
import { BookingApiService } from './booking-api.service';
import { RoomStore } from './room-store';
import { today } from './date-utils';
import { overlaps } from './time-utils';

@Injectable({ providedIn: 'root' })
export class BookingStore implements RoomStore {
  readonly kind = 'conference' as const;
  private api = inject(BookingApiService);

  readonly buildingName = signal('Skyline Conference Center');
  readonly loading = signal(false);
  readonly apiUp = signal(true);
  readonly floors = signal<Floor[]>([]);

  readonly date = signal<string>(today());
  readonly fromSlot = signal(18); // 09:00
  readonly toSlot = signal(20); // 10:00

  readonly bookingsForDate = signal<Booking[]>([]);

  readonly selectedFloorNumber = signal(1);
  readonly selectedFloor = computed(
    () => this.floors().find((f) => f.number === this.selectedFloorNumber()) ?? null,
  );
  readonly selectedRoomId = signal<string | null>(null);
  readonly selectedRoom = computed<Room | null>(() => {
    const id = this.selectedRoomId();
    if (!id) return null;
    for (const f of this.floors()) {
      const r = f.rooms.find((rm) => rm.id === id);
      if (r) return r;
    }
    return null;
  });

  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      const floors = await this.api.floors();
      this.floors.set(floors);
      this.apiUp.set(true);
    } catch {
      this.floors.set([]);
      this.apiUp.set(false);
    }
    await this.loadBookings();
    this.loading.set(false);
  }

  private async loadBookings(): Promise<void> {
    try {
      this.bookingsForDate.set(await this.api.onDate(this.date()));
    } catch {
      this.bookingsForDate.set([]);
    }
  }

  async applySearch(date: string, fromSlot: number, toSlot: number): Promise<void> {
    this.date.set(date);
    this.fromSlot.set(Math.max(0, Math.min(fromSlot, SLOT_COUNT - 1)));
    this.toSlot.set(
      Math.max(this.fromSlot() + 1, Math.min(toSlot, SLOT_COUNT)),
    );
    this.deselectRoom();
    await this.loadBookings();
  }

  /** Bookings for a specific room on the active date (approved only). */
  roomBookings(roomId: string): Booking[] {
    return this.bookingsForDate()
      .filter((b) => b.roomId === roomId && b.status === 'approved')
      .sort((a, b) => a.startSlot - b.startSlot);
  }

  isRoomFree(room: Room): boolean {
    const from = this.fromSlot();
    const to = this.toSlot();
    return !this.roomBookings(room.id).some((b) =>
      overlaps(from, to, b.startSlot, b.endSlot),
    );
  }

  freeCountForFloor(floorNumber: number): number {
    const floor = this.floors().find((f) => f.number === floorNumber);
    if (!floor) return 0;
    return floor.rooms.filter((r) => this.isRoomFree(r)).length;
  }

  selectFloor(n: number): void {
    this.selectedFloorNumber.set(n);
    this.deselectRoom();
  }

  stepFloor(delta: number): void {
    const floors = this.floors();
    if (!floors.length) return;
    const next = this.selectedFloorNumber() + delta;
    if (next >= 1 && next <= floors.length) this.selectFloor(next);
  }

  selectRoom(room: Room | null): void {
    this.selectedRoomId.set(room?.id ?? null);
  }

  deselectRoom(): void {
    this.selectedRoomId.set(null);
  }

  async confirm(startSlot: number, endSlot: number, topic?: string): Promise<Booking> {
    const room = this.selectedRoom();
    if (!room) throw new Error('No room selected');
    const booking = await this.api.create({
      roomId: room.id,
      date: this.date(),
      startSlot,
      endSlot,
      topic,
    });
    await this.loadBookings();
    return booking;
  }

  async cancel(id: string): Promise<void> {
    await this.api.remove(id);
    await this.loadBookings();
  }
}
