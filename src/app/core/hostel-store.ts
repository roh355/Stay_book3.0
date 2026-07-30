import { Injectable, computed, inject, signal } from '@angular/core';
import { Floor, HOSTEL_HORIZON_DAYS, Room, Stay } from './models';
import { HostelApiService } from './hostel-api.service';
import { RoomStore } from './room-store';
import { addDays, fromYmd, today } from './date-utils';

@Injectable({ providedIn: 'root' })
export class HostelStore implements RoomStore {
  readonly kind = 'hostel' as const;
  private api = inject(HostelApiService);

  readonly buildingName = signal('Skyline Residences');
  readonly loading = signal(false);
  readonly apiUp = signal(true);
  readonly floors = signal<Floor[]>([]);

  readonly checkIn = signal<string>(today());
  /** Last night of the stay (inclusive — UI format). */
  readonly checkOut = signal<string>(addDays(today(), 1));

  readonly stays = signal<Stay[]>([]);

  /** Rolling horizon of day cells from today (used elsewhere). */
  readonly horizon = computed<string[]>(() => {
    const start = today();
    return Array.from({ length: HOSTEL_HORIZON_DAYS }, (_, i) => addDays(start, i));
  });

  /** Days shown in the room grid — matches the searched check-in…check-out range. */
  readonly searchDays = computed<string[]>(() => {
    const ci = this.checkIn();
    const co = this.checkOut();
    if (co < ci) return [ci];
    const days: string[] = [];
    for (let d = ci; d <= co; d = addDays(d, 1)) {
      days.push(d);
      if (days.length >= HOSTEL_HORIZON_DAYS) break;
    }
    return days;
  });

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
    await this.loadStays();
    this.loading.set(false);
  }

  private async loadStays(): Promise<void> {
    try {
      this.stays.set(await this.api.all());
    } catch {
      this.stays.set([]);
    }
  }

  async setSearch(checkIn: string, checkOut: string): Promise<void> {
    this.checkIn.set(checkIn);
    this.checkOut.set(checkOut);
    this.deselectRoom();
  }

  roomStays(roomId: string): Stay[] {
    return this.stays()
      .filter((s) => s.roomId === roomId && s.status === 'approved')
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }

  private nightsOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
    return aIn < bOut && aOut > bIn;
  }

  isRoomFree(room: Room): boolean {
    const ci = this.checkIn();
    const coEx = addDays(this.checkOut(), 1); // inclusive UI → exclusive for overlap
    return !this.roomStays(room.id).some((s) =>
      this.nightsOverlap(ci, coEx, s.checkIn, s.checkOut),
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

  async confirm(checkIn: string, checkOutInclusive: string, guest?: string): Promise<Stay> {
    const room = this.selectedRoom();
    if (!room) throw new Error('No room selected');
    const stay = await this.api.create({
      roomId: room.id,
      checkIn,
      checkOut: addDays(checkOutInclusive, 1),
      guest,
    });
    await this.loadStays();
    return stay;
  }

  async cancel(id: string): Promise<void> {
    await this.api.remove(id);
    await this.loadStays();
  }
}
