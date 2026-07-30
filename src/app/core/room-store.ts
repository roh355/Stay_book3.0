import { InjectionToken, Signal } from '@angular/core';
import { Floor, Room } from './models';

/**
 * Shared surface consumed by the reusable 3D building + floor-plan components.
 * Both the conference and hostel stores implement this, so one set of visual
 * components can render either time-slot or nightly availability.
 */
export interface RoomStore {
  readonly kind: 'conference' | 'hostel';
  readonly buildingName: Signal<string>;
  readonly loading: Signal<boolean>;
  readonly apiUp: Signal<boolean>;
  readonly floors: Signal<Floor[]>;
  readonly selectedFloorNumber: Signal<number>;
  readonly selectedFloor: Signal<Floor | null>;
  readonly selectedRoom: Signal<Room | null>;

  /** True when the room is free during the current date/window search. */
  isRoomFree(room: Room): boolean;
  /** Count of free rooms on a floor for the current search. */
  freeCountForFloor(floorNumber: number): number;

  selectFloor(n: number): void;
  stepFloor(delta: number): void;
  selectRoom(room: Room | null): void;
  deselectRoom(): void;

  init(): Promise<void>;
  reload(): Promise<void>;
}

export const ROOM_STORE = new InjectionToken<RoomStore>('ROOM_STORE');
