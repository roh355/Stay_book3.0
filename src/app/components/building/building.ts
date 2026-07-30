import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import * as THREE from 'three';
import { ROOM_STORE } from '../../core/room-store';
import { ThemeService } from '../../core/theme.service';
import { Room } from '../../core/models';

interface RoomMesh {
  mesh: THREE.Mesh;
  room: Room;
  floorNumber: number;
}

@Component({
  selector: 'sb-building',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scene">
      <div class="sky">
        <div class="orb"></div>
        <div class="cloud c1"></div>
        <div class="cloud c2"></div>
        <div class="cloud c3"></div>
        <div class="cloud c4"></div>
      </div>

      <div #canvasHost class="canvas-host"></div>

      <div class="tower-switch">
        <button class="chev" aria-label="Previous tower" disabled>‹</button>
        <span class="tower-name">Tower A</span>
        <button class="chev" aria-label="Next tower" disabled>›</button>
      </div>

      <div class="floor-list panel">
        @for (f of floorsDesc(); track f.number) {
          <button
            class="floor-row"
            [class.sel]="f.number === store.selectedFloorNumber()"
            (click)="store.selectFloor(f.number)"
          >
            <span class="fl-name">Floor {{ f.label }}</span>
            <span class="fl-free tnum">{{ store.freeCountForFloor(f.number) }} free</span>
          </button>
        }
      </div>

      <div class="zoom">
        <button class="zbtn" (click)="zoom(-1)" aria-label="Zoom in">+</button>
        <button class="zbtn" (click)="zoom(1)" aria-label="Zoom out">−</button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        flex: 1;
        min-height: 420px;
      }
      .scene {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 420px;
        border-radius: var(--radius);
        overflow: hidden;
      }
      .sky {
        position: absolute;
        inset: 0;
        background: var(--sky);
        z-index: 0;
      }
      .orb {
        position: absolute;
        top: 12%;
        right: 16%;
        width: 90px;
        height: 90px;
        border-radius: 999px;
        background: var(--orb);
        box-shadow: var(--orb-shadow);
      }
      .cloud {
        position: absolute;
        border-radius: 999px;
        filter: blur(14px);
        background: radial-gradient(
          circle,
          var(--cloud) 0%,
          var(--cloud-soft) 55%,
          transparent 72%
        );
      }
      .c1 {
        top: 18%;
        left: -20%;
        width: 300px;
        height: 90px;
        animation: bdrift 44s linear infinite;
      }
      .c2 {
        top: 40%;
        left: -30%;
        width: 220px;
        height: 70px;
        opacity: 0.75;
        animation: bdrift 66s linear infinite;
      }
      .c3 {
        top: 60%;
        left: -25%;
        width: 260px;
        height: 80px;
        opacity: 0.6;
        animation: bdrift 88s linear infinite;
      }
      .c4 {
        top: 30%;
        left: -40%;
        width: 180px;
        height: 60px;
        opacity: 0.5;
        animation: bdrift 120s linear infinite;
      }
      @keyframes bdrift {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(160vw);
        }
      }
      .canvas-host {
        position: absolute;
        inset: 0;
        z-index: 1;
        cursor: grab;
        overflow: hidden;
      }
      .canvas-host canvas {
        display: block;
        width: 100% !important;
        height: 100% !important;
      }
      .canvas-host:active {
        cursor: grabbing;
      }
      .tower-switch {
        position: absolute;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--paper);
        border: 1px solid var(--hairline);
        border-radius: 999px;
        padding: 4px 6px;
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
      }
      .tower-name {
        font-weight: 700;
        font-size: 13px;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        padding: 0 6px;
      }
      .chev {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: none;
        background: transparent;
        color: var(--ink-2);
        font-size: 16px;
        cursor: pointer;
      }
      .chev:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .floor-list {
        position: absolute;
        top: 56px;
        left: 16px;
        z-index: 2;
        width: 150px;
        max-height: calc(100% - 84px);
        overflow: auto;
        padding: 6px;
        background: var(--paper);
      }
      .floor-row {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        border: none;
        background: transparent;
        color: var(--ink);
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 13px;
        cursor: pointer;
      }
      .floor-row:hover {
        background: var(--input-bg);
      }
      .floor-row.sel {
        background: color-mix(in srgb, var(--slate) 16%, transparent);
        color: var(--card-sel-ink);
        font-weight: 700;
      }
      .fl-free {
        color: var(--sage);
        font-size: 12px;
        font-weight: 700;
      }
      .floor-row.sel .fl-free {
        color: var(--card-sel-ink);
      }
      .zoom {
        position: absolute;
        bottom: 16px;
        right: 16px;
        z-index: 2;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .zbtn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid var(--hairline);
        background: var(--paper);
        color: var(--ink);
        font-size: 18px;
        cursor: pointer;
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
      }
      .zbtn:hover {
        background: var(--panel-hover);
      }
    `,
  ],
})
export class BuildingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;

  protected store = inject(ROOM_STORE);
  private theme = inject(ThemeService);
  private zone = inject(NgZone);

  private renderer?: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private root = new THREE.Group(); // rotatable building
  private raf = 0;
  private ro?: ResizeObserver;

  private slabs: { mesh: THREE.Mesh; floorNumber: number }[] = [];
  private roomMeshes: RoomMesh[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private edgeMat?: THREE.LineBasicMaterial;

  /** Jio logo on the top floor — shared material, map arrives async. */
  private logoMat = new THREE.MeshBasicMaterial({ transparent: true });
  private logoMeshes: THREE.Mesh[] = [];
  private logoReady = false;
  private logoAspect = 6.9; // width / height, corrected once the image loads

  private camDist = 48;
  private camY = 0;
  private lookX = 0;
  private lookY = 0;
  private lookZ = 0;
  private fitDistDefault = 48;
  private fitDistMin = 15;
  private fitDistMax = 180;
  private userZoomRatio = 1;
  private yaw = -0.6;
  private dragging = false;
  private lastX = 0;
  private moved = false;

  /** Left overlay (floor list) — camera frames the remaining area. */
  private readonly VIEW_INSET_LEFT = 172;
  private readonly VIEW_INSET_TOP = 52;
  private readonly VIEW_INSET_BOTTOM = 20;
  /** How much of the visible sky area the tower should occupy on load (0–1). */
  private readonly BUILDING_VIEW_FILL = 0.40;
  /** Raise the whole tower in world-space so lower floors clear the panel bottom. */
  private readonly BUILDING_ROOT_LIFT = 7.25;
  /** Look-at anchor: fraction of height above the base (lower = tower sits higher on screen). */
  private readonly LOOK_ANCHOR_FROM_BASE = 0.1;
  private viewportW = 1;
  private viewportH = 1;

  private readonly FLOOR_H = 2.1;
  private readonly SLAB_W = 12;
  private readonly SLAB_D = 8;

  floorsDesc() {
    return [...this.store.floors()].sort((a, b) => b.number - a.number);
  }

  constructor() {
    // Rebuild geometry when the floor set changes.
    effect(() => {
      const floors = this.store.floors();
      if (this.renderer) {
        this.build(floors);
        const host = this.canvasHost.nativeElement;
        this.viewportW = host.clientWidth || 1;
        this.viewportH = host.clientHeight || 1;
        this.applyViewOffset(this.viewportW, this.viewportH);
        this.measureFit(true);
        this.updateCamera();
      }
    });
    // Recolor when selection, availability or theme changes.
    effect(() => {
      this.store.selectedFloorNumber();
      this.store.selectedRoom();
      this.theme.theme();
      // touch availability so recolor tracks bookings/stays + window
      for (const f of this.store.floors()) f.rooms.forEach((r) => this.store.isRoomFree(r));
      if (this.renderer) {
        this.applyColors();
        this.measureFit(false);
        this.camDist = this.clampDist(this.fitDistDefault * this.userZoomRatio);
        this.updateCamera();
      }
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initThree());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.renderer?.dispose();
  }

  private initThree(): void {
    const host = this.canvasHost.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    this.scene.add(this.root);

    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(10, 20, 14);
    this.scene.add(amb, dir);

    this.loadLogoTexture();

    this.build(this.store.floors());
    this.applyColors();
    this.measureFit(true);
    this.resize();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);

    host.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    host.addEventListener('click', this.onClick);
    host.addEventListener('wheel', this.onWheel, { passive: false });

    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      this.root.rotation.y += (this.yaw - this.root.rotation.y) * 0.12;
      this.renderer!.render(this.scene, this.camera);
    };
    loop();
  }

  private build(floors: { number: number; label: string; rooms: Room[] }[]): void {
    for (const s of this.slabs) this.disposeMesh(s.mesh);
    for (const r of this.roomMeshes) this.disposeMesh(r.mesh);
    this.slabs = [];
    this.roomMeshes = [];
    while (this.root.children.length) this.root.remove(this.root.children[0]);
    this.root.position.set(0, this.BUILDING_ROOT_LIFT, 0);
    this.root.rotation.y = this.yaw;

    for (const m of this.logoMeshes) m.geometry.dispose();
    this.logoMeshes = [];

    const count = 10;
    const totalH = count * this.FLOOR_H;

    const slabGeo = new THREE.BoxGeometry(this.SLAB_W, this.FLOOR_H * 0.62, this.SLAB_D);
    this.edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 });
    const edgeMat = this.edgeMat;

    for (let floorNum = 1; floorNum <= count; floorNum++) {
      const f = floors.find((fl) => fl.number === floorNum) ?? {
        number: floorNum,
        label: String(floorNum).padStart(2, '0'),
        rooms: [] as Room[],
      };
      const y = (floorNum - 1) * this.FLOOR_H - totalH / 2 + this.FLOOR_H / 2;
      const slab = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
      slab.position.y = y;
      (slab as any).userData = { floorNumber: f.number };
      this.root.add(slab);
      this.slabs.push({ mesh: slab, floorNumber: f.number });
      if (floorNum === count) this.addLogoToSlab(slab);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slabGeo), edgeMat);
      edges.position.y = y;
      this.root.add(edges);

      const roomCount = Math.max(f.rooms.length, 1);
      const gap = 0.35;
      const usable = this.SLAB_W - 1.2;
      const rw = Math.min(1.4, usable / roomCount - gap);
      const startX = -((rw + gap) * roomCount) / 2 + (rw + gap) / 2;
      f.rooms.forEach((room, i) => {
        const geo = new THREE.BoxGeometry(rw, this.FLOOR_H * 0.42, this.SLAB_D * 0.5);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6 }));
        mesh.position.set(startX + i * (rw + gap), y + this.FLOOR_H * 0.5, this.SLAB_D * 0.16);
        (mesh as any).userData = { floorNumber: f.number, roomId: room.id };
        this.root.add(mesh);
        this.roomMeshes.push({ mesh, room, floorNumber: f.number });
      });
    }
  }

  /** Load the Jio logo and knock out its white/black background, keeping the writing. */
  private loadLogoTexture(): void {
    const img = new Image();
    img.src = 'images/jio-institute-logo.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const isWhite = r > 230 && g > 230 && b > 230;
        const isBlack = r < 30 && g < 30 && b < 30;
        if (isWhite || isBlack) px[i + 3] = 0;
      }
      ctx.putImageData(data, 0, 0);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      this.logoMat.map = tex;
      this.logoMat.needsUpdate = true;
      this.logoAspect = img.naturalWidth / img.naturalHeight;
      this.logoReady = true;
      this.refreshLogoMeshes();
    };
  }

  /** Near full building width; tall enough to straddle the top two floors. */
  private logoSize(): { w: number; h: number } {
    const w = this.SLAB_W * 0.96;
    return { w, h: w / this.logoAspect };
  }

  /**
   * Mount the logo as children of the top slab: it follows the slab's selection
   * shift and its unlit material ignores the highlight recolor, so selecting the
   * top floor never hides it. Front and back faces so it survives rotation.
   */
  /** Logo bottom flush with the bottom of the top-floor slab. */
  private logoYOffset(h: number): number {
    return -(this.FLOOR_H * 0.62) / 2 + h / 2;
  }

  private addLogoToSlab(slab: THREE.Mesh): void {
    const { w, h } = this.logoSize();
    const geo = new THREE.PlaneGeometry(w, h);
    const offset = this.SLAB_D / 2 + 0.06;
    const yOffset = this.logoYOffset(h);

    const front = new THREE.Mesh(geo, this.logoMat);
    front.position.set(0, yOffset, offset);
    const back = new THREE.Mesh(geo, this.logoMat);
    back.position.set(0, yOffset, -offset);
    back.rotation.y = Math.PI;

    for (const m of [front, back]) {
      m.visible = this.logoReady;
      m.renderOrder = 5;
      slab.add(m);
      this.logoMeshes.push(m);
    }
  }

  /** Apply the real image aspect once the texture has loaded. */
  private refreshLogoMeshes(): void {
    const { w, h } = this.logoSize();
    for (const m of this.logoMeshes) {
      m.geometry.dispose();
      m.geometry = new THREE.PlaneGeometry(w, h);
      m.position.y = this.logoYOffset(h);
      m.visible = true;
    }
  }

  private applyColors(): void {
    const c = this.theme.scene();
    const sel = this.store.selectedFloorNumber();
    const selRoomId = this.store.selectedRoom()?.id;
    const dark = this.theme.theme() === 'dark';

    // Dark sky swallows black outlines — switch to light theme-lines at night.
    if (this.edgeMat) {
      this.edgeMat.color.setHex(dark ? c.stoneLine : 0x000000);
      this.edgeMat.opacity = dark ? 0.45 : 0.18;
    }

    for (const s of this.slabs) {
      const m = s.mesh.material as THREE.MeshStandardMaterial;
      const isSel = s.floorNumber === sel;
      m.color.setHex(isSel ? c.fillMid : c.fillLight);
      // Alternate slab shades slightly so adjacent floors read as separate.
      if (!isSel && s.floorNumber % 2 === 0) {
        m.color.offsetHSL(0, 0, dark ? 0.045 : -0.035);
      }
      m.emissive.setHex(isSel ? c.slate : 0x000000);
      m.emissiveIntensity = isSel ? 0.22 : 0;
    }

    for (const rm of this.roomMeshes) {
      const m = rm.mesh.material as THREE.MeshStandardMaterial;
      const free = this.store.isRoomFree(rm.room);
      let hex = free ? c.sage : c.clay;
      if (rm.room.id === selRoomId) hex = c.slate;
      m.color.setHex(hex);
      m.emissive.setHex(hex);
      m.emissiveIntensity = rm.floorNumber === sel ? 0.28 : 0.08;
      const dim = rm.floorNumber === sel ? 1 : 0.5;
      m.opacity = dim;
      m.transparent = dim < 1;
    }
  }

  private resize(): void {
    if (!this.renderer) return;
    const host = this.canvasHost.nativeElement;
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    this.viewportW = w;
    this.viewportH = h;
    this.renderer.setSize(w, h, false);
    this.applyViewOffset(w, h);
    this.measureFit(false);
    this.camDist = this.clampDist(this.fitDistDefault * this.userZoomRatio);
    this.updateCamera();
  }

  /** Shift the projection so the tower sits in the visible area beside the floor list. */
  private applyViewOffset(w: number, h: number): void {
    const visW = Math.max(120, w - this.VIEW_INSET_LEFT);
    const visH = Math.max(
      120,
      h - this.VIEW_INSET_TOP - this.VIEW_INSET_BOTTOM,
    );
    this.camera.aspect = visW / visH;
    this.camera.setViewOffset(w, h, this.VIEW_INSET_LEFT, this.VIEW_INSET_TOP, visW, visH);
  }

  /** Compute camera distance so the full tower fits in the visible sub-viewport. */
  private measureFit(resetZoom: boolean): void {
    if (!this.camera || this.root.children.length === 0) return;

    this.root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(this.root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const baseY = box.min.y;
    const anchorY = baseY + size.y * this.LOOK_ANCHOR_FROM_BASE;

    const fullW = this.viewportW;
    const fullH = this.viewportH;
    const visW = Math.max(120, fullW - this.VIEW_INSET_LEFT);
    const visH = Math.max(
      120,
      fullH - this.VIEW_INSET_TOP - this.VIEW_INSET_BOTTOM,
    );

    const vFovRad = (this.camera.fov * Math.PI) / 180;
    const tanHalfV = Math.tan(vFovRad / 2);

    // Effective tangents for the sub-viewport carved out via setViewOffset.
    const effTanV = tanHalfV * (visH / fullH);
    const effTanH = tanHalfV * (visW / fullH);

    // Use box half-extents (+ margin) so every floor slab + room cube is included.
    const margin = 1.14;
    const halfH = (size.y / 2) * margin;
    const halfW = (Math.hypot(size.x, size.z) / 2) * margin;

    const distForHeight = halfH / effTanV;
    const distForWidth = halfW / effTanH;

    const fitDistTight = Math.max(distForHeight, distForWidth) * 1.08;
    this.fitDistDefault = fitDistTight / this.BUILDING_VIEW_FILL;
    this.fitDistMin = fitDistTight * 0.55;
    this.fitDistMax = fitDistTight * 3.2;

    this.lookX = center.x;
    this.lookY = anchorY;
    this.lookZ = center.z;
    this.camY = anchorY;

    if (resetZoom) {
      this.userZoomRatio = 1;
      this.camDist = this.fitDistDefault;
    }
  }

  private clampDist(d: number): number {
    return Math.max(this.fitDistMin, Math.min(this.fitDistMax, d));
  }

  private updateCamera(): void {
    this.camera.position.set(this.lookX, this.camY, this.lookZ + this.camDist);
    this.camera.lookAt(this.lookX, this.lookY, this.lookZ);
    this.camera.updateProjectionMatrix();
  }

  zoom(dir: number): void {
    this.userZoomRatio = this.clampDist(this.camDist + dir * 5) / this.fitDistDefault;
    this.camDist = this.clampDist(this.fitDistDefault * this.userZoomRatio);
    this.updateCamera();
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoom(Math.sign(e.deltaY));
  };

  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    this.moved = false;
    this.lastX = e.clientX;
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    if (Math.abs(dx) > 3) this.moved = true;
    this.yaw += dx * 0.006;
    this.lastX = e.clientX;
  };

  private onUp = () => {
    this.dragging = false;
  };

  private onClick = (e: MouseEvent) => {
    if (this.moved) return;
    const host = this.canvasHost.nativeElement;
    const rect = host.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.root.children, false);
    for (const hit of hits) {
      const ud = (hit.object as any).userData;
      if (ud && ud.floorNumber) {
        this.zone.run(() => this.store.selectFloor(ud.floorNumber));
        return;
      }
    }
  };

  private disposeMesh(mesh: THREE.Mesh): void {
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  }
}
