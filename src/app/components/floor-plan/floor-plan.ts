import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ROOM_STORE } from '../../core/room-store';
import { Room } from '../../core/models';

@Component({
  selector: 'sb-floor-plan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plan">
      <div class="plan-head">
        <span class="ttl tnum">FLOOR {{ store.selectedFloor()?.label ?? '—' }}</span>
        <span class="sub">· TOP-DOWN PLAN</span>
        <span class="kbd-hint">← → move · Enter open</span>
      </div>

      @if (rooms().length === 0) {
        <div class="empty">
          <div class="empty-ic">◲</div>
          <p>No rooms on this floor</p>
          @if (!store.apiUp()) {
            <p class="hint">Start the API (npm run dev) to load rooms.</p>
          }
        </div>
      } @else {
        <div class="grid">
          <div class="row">
            @for (r of topRow(); track r.id) {
              <button
                type="button"
                class="room"
                [id]="roomDomId(r)"
                [class.free]="store.isRoomFree(r)"
                [class.busy]="!store.isRoomFree(r)"
                [class.sel]="r.id === store.selectedRoom()?.id"
                [attr.tabindex]="roomIndex(r) === focusedIndex() ? 0 : -1"
                (click)="pick(r)"
                (keydown)="onRoomKey($event, roomIndex(r))"
                title="{{ r.code }} · cap {{ r.capacity }}"
              >
                <svg class="swing" viewBox="0 0 24 24">
                  <path d="M4 20 V6" stroke="currentColor" stroke-width="1.4" />
                  <path d="M4 20 H18" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M4 6 A14 14 0 0 1 18 20"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    stroke-dasharray="2 2"
                    opacity="0.7"
                  />
                </svg>
                <span class="code tnum">{{ r.code }}</span>
                <span class="pill" [class.pill-free]="store.isRoomFree(r)" [class.pill-busy]="!store.isRoomFree(r)">
                  {{ store.isRoomFree(r) ? 'Available' : 'In use' }}
                </span>
              </button>
            }
          </div>

          <div class="corridor"><span>C O R R I D O R</span></div>

          <div class="row">
            @for (r of bottomRow(); track r.id) {
              <button
                type="button"
                class="room"
                [id]="roomDomId(r)"
                [class.free]="store.isRoomFree(r)"
                [class.busy]="!store.isRoomFree(r)"
                [class.sel]="r.id === store.selectedRoom()?.id"
                [attr.tabindex]="roomIndex(r) === focusedIndex() ? 0 : -1"
                (click)="pick(r)"
                (keydown)="onRoomKey($event, roomIndex(r))"
                title="{{ r.code }} · cap {{ r.capacity }}"
              >
                <svg class="swing bottom" viewBox="0 0 24 24">
                  <path d="M4 4 V18" stroke="currentColor" stroke-width="1.4" />
                  <path d="M4 4 H18" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M4 18 A14 14 0 0 0 18 4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1"
                    stroke-dasharray="2 2"
                    opacity="0.7"
                  />
                </svg>
                <span class="code tnum">{{ r.code }}</span>
                <span class="pill" [class.pill-free]="store.isRoomFree(r)" [class.pill-busy]="!store.isRoomFree(r)">
                  {{ store.isRoomFree(r) ? 'Available' : 'In use' }}
                </span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 0;
      }
      .plan {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 12px;
        padding: 16px;
        flex: 1;
      }
      .plan-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ttl {
        font-weight: 800;
        font-size: 13px;
        letter-spacing: 0.06em;
      }
      .sub {
        color: var(--ink-2);
        font-size: 11px;
        letter-spacing: 0.1em;
      }
      .kbd-hint {
        margin-left: auto;
        color: var(--ink-2);
        font-size: 11px;
        letter-spacing: 0.02em;
      }
      .grid {
        display: flex;
        flex-direction: column;
        gap: 14px;
        flex: 1;
      }
      .row {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 12px;
        align-items: stretch;
      }
      .corridor {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ink-2);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
        border-top: 1px dashed var(--hairline);
        border-bottom: 1px dashed var(--hairline);
        padding: 5px 0;
      }
      .room {
        position: relative;
        min-height: 96px;
        border: 1px solid var(--hairline);
        border-radius: var(--radius-sm);
        background: var(--paper);
        color: var(--ink);
        padding: 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: flex-start;
        cursor: pointer;
        transition:
          border-color 0.15s ease,
          background 0.15s ease,
          transform 0.05s ease;
      }
      .room:hover {
        border-color: var(--slate);
        background: var(--panel-hover);
      }
      .room.busy:hover {
        border-color: color-mix(in srgb, var(--pill-busy-ink) 55%, var(--slate));
      }
      .room:focus-visible {
        border-color: var(--slate);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--slate) 40%, transparent);
        outline: 2px solid var(--slate);
        outline-offset: 2px;
      }
      .room.sel {
        border-color: var(--slate);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--slate) 45%, transparent);
        color: var(--card-sel-ink);
      }
      .swing {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 22px;
        height: 22px;
        color: var(--ink-2);
        opacity: 0.6;
      }
      .code {
        font-weight: 800;
        font-size: 16px;
        letter-spacing: -0.01em;
      }
      .empty {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--ink-2);
        gap: 6px;
      }
      .empty-ic {
        font-size: 34px;
        opacity: 0.5;
      }
    `,
  ],
})
export class FloorPlanComponent {
  protected store = inject(ROOM_STORE);
  private host = inject(ElementRef<HTMLElement>);

  protected focusedIndex = signal(0);

  protected rooms = computed(() => this.store.selectedFloor()?.rooms ?? []);
  protected orderedRooms = computed(() => {
    const r = this.rooms();
    const split = Math.ceil(r.length / 2);
    return [...r.slice(0, split), ...r.slice(split)];
  });
  protected topRow = computed(() => {
    const r = this.rooms();
    return r.slice(0, Math.ceil(r.length / 2));
  });
  protected bottomRow = computed(() => {
    const r = this.rooms();
    return r.slice(Math.ceil(r.length / 2));
  });

  constructor() {
    effect(() => {
      this.store.selectedFloorNumber();
      const count = this.rooms().length;
      this.focusedIndex.set(count ? 0 : -1);
      queueMicrotask(() => this.focusRoomAt(0));
    });
  }

  roomDomId(r: Room): string {
    return `sb-room-${r.id}`;
  }

  roomIndex(r: Room): number {
    return this.orderedRooms().findIndex((x) => x.id === r.id);
  }

  onRoomKey(ev: KeyboardEvent, idx: number): void {
    const rooms = this.orderedRooms();
    if (!rooms.length) return;

    if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      this.moveFocus(Math.min(idx + 1, rooms.length - 1));
    } else if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      this.moveFocus(Math.max(idx - 1, 0));
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      this.pick(rooms[idx]);
    }
  }

  pick(room: Room): void {
    this.focusedIndex.set(this.roomIndex(room));
    this.store.selectRoom(room);
  }

  private moveFocus(idx: number): void {
    this.focusedIndex.set(idx);
    this.focusRoomAt(idx);
  }

  private focusRoomAt(idx: number): void {
    const rooms = this.orderedRooms();
    if (idx < 0 || idx >= rooms.length) return;
    const btn = this.host.nativeElement.querySelector(
      `#${this.roomDomId(rooms[idx])}`,
    ) as HTMLButtonElement | null;
    btn?.focus();
  }
}
