import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ModuleId, SolHazardType } from '../data/campaignArc';
import { MissionResources } from '../game/simulation';
import { createMarsAtmosphere, MarsAtmosphereUniforms } from './marsAtmosphere';
import {
  createContactShadowTexture,
  createDustOverlayTexture,
  createMarsRegolithTextures,
  createSolarCellTexture,
} from './marsTextures';

export type EmergencyMode = 'none' | 'dust' | 'flare';

export interface ProjectedModuleAnchor {
  id: ModuleId;
  x: number;
  y: number;
  visible: boolean;
}

export type EvaObjective = 'solar' | 'sample';

export interface EvaTelemetry {
  heading: number;
  relativeBearing: number;
  distance: number;
}

export interface MarsSceneCallbacks {
  onModuleClick: (moduleId: ModuleId) => void;
  onHoverModule: (moduleId: ModuleId | null) => void;
  onAnchorsUpdate: (anchors: ProjectedModuleAnchor[]) => void;
  onEvaObjective?: (objective: EvaObjective) => void;
  onEvaTelemetry?: (telemetry: EvaTelemetry) => void;
  onEvaExit?: () => void;
  onWebglError?: (reason: string) => void;
}

interface EvaCameraTransition {
  elapsed: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  returning: boolean;
}

interface ModulePulse {
  moduleId: ModuleId;
  startTimeMs: number;
  duration: number;
}

interface NightCycleAnim {
  active: boolean;
  startTimeMs: number;
  duration: number;
  hazardType: SolHazardType;
  shieldBlockedFlare: boolean;
  completed: boolean;
  onComplete: () => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(renderer);
  } catch {
    return false;
  }
}

export function groundHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const dunes = Math.sin(x * 0.22) * Math.cos(z * 0.18) * 0.22 + Math.sin((x + z) * 0.11) * 0.14;
  // Flat central plateau for base foundations, rising softly to Jezero Crater rim
  const plateauWeight = THREE.MathUtils.smoothstep(r, 11, 24);
  const craterRim = plateauWeight * (1.2 + Math.pow(Math.max(0, r - 12) * 0.08, 1.6));
  const detail = plateauWeight * dunes + (1 - plateauWeight) * (dunes * 0.18);
  return craterRim + detail;
}

export class MarsOutpostScene {
  private container: HTMLElement;
  private callbacks: MarsSceneCallbacks;
  private isSoftwareGl: boolean;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private shelterInteriorLight!: THREE.PointLight;
  private moxieLight!: THREE.PointLight;
  private biodomeLight!: THREE.PointLight;

  private skyColor = new THREE.Color('#C9643F');
  private daySkyColor = new THREE.Color('#C9643F');
  private dustAlertSkyColor = new THREE.Color('#8E351B');
  private flareAlertSkyColor = new THREE.Color('#5E162B');
  private sunsetSkyColor = new THREE.Color('#7C2D12');
  private nightSkyColor = new THREE.Color('#090F22');
  private flareSkyColor = new THREE.Color('#4C1D3D');

  private calmSunColor = new THREE.Color('#FFF1D6');
  private alertSunColor = new THREE.Color('#FF8C61');
  private calmWindowColor = new THREE.Color('#FEF08A');
  private calmWindowEmissive = new THREE.Color('#F59E0B');
  private calmHullColor = new THREE.Color('#CBD5E1');
  private alertHullTint = new THREE.Color('#FCA5A5');
  private alertRedColor = new THREE.Color('#FF2A2A');
  private alertAmberColor = new THREE.Color('#FF7A00');
  private calmMoxieColor = new THREE.Color('#22D3EE');
  private calmMoxieEmissive = new THREE.Color('#06B6D4');
  private calmBioColor = new THREE.Color('#A7F3D0');
  private calmBioEmissive = new THREE.Color('#10B981');
  private calmLedColor = new THREE.Color('#E879F9');
  private calmLedEmissive = new THREE.Color('#D946EF');
  private calmBeaconColor = new THREE.Color('#38BDF8');
  private calmBeaconEmissive = new THREE.Color('#0EA5E9');
  private blackColor = new THREE.Color('#000000');
  private scratchAlertColor = new THREE.Color();

  private fog!: THREE.FogExp2;
  private starsPoints!: THREE.Points;
  private starsMat!: THREE.PointsMaterial;
  private atmosphere!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private atmosphereUniforms!: MarsAtmosphereUniforms;
  private nightBlend = 0;

  // Dynamic module references
  private solarTiltGroups: THREE.Group[] = [];
  private solarDustMat!: THREE.MeshStandardMaterial;
  private habitatDustMat!: THREE.MeshStandardMaterial;
  private solarWipers: Array<{ mesh: THREE.Mesh; baseX: number }> = [];

  private moxieFan!: THREE.Group;
  private moxieTankMat!: THREE.MeshStandardMaterial;
  private moxieBubbles: THREE.Mesh[] = [];

  private waterShieldMesh!: THREE.Mesh;
  private waterShieldMat!: THREE.MeshPhysicalMaterial;
  private shelterHullMat!: THREE.MeshStandardMaterial;
  private shelterWindowMat!: THREE.MeshStandardMaterial;
  private shelterBeaconMat!: THREE.MeshStandardMaterial;

  private biodomeCrops: THREE.Group[] = [];
  private biodomeGlassMat!: THREE.MeshPhysicalMaterial;
  private bioLedRingMat!: THREE.MeshStandardMaterial;

  private targetRing!: THREE.Mesh;
  private hoverRing!: THREE.Mesh;

  // Particle effects
  private dustStormPoints!: THREE.Points;
  private dustStormMat!: THREE.PointsMaterial;
  private dustPositions!: Float32Array;

  private flareBoltsGroup!: THREE.Group;
  private flareBolts: Array<{
    mesh: THREE.Mesh;
    speed: number;
    angle: number;
    radius: number;
    deflected: boolean;
  }> = [];

  private anchorWorldMap: Record<ModuleId, THREE.Vector3> = {
    solar: new THREE.Vector3(-7.4, 3.1, 1.8),
    moxie: new THREE.Vector3(-1.8, 3.7, -6.2),
    shelter: new THREE.Vector3(0, 4.4, 0),
    biodome: new THREE.Vector3(7.4, 3.5, 1.6),
  };

  private moduleWorldCenters: Record<ModuleId, THREE.Vector3> = {
    solar: new THREE.Vector3(-7.4, 0.2, 1.8),
    moxie: new THREE.Vector3(-1.8, 0.2, -6.2),
    shelter: new THREE.Vector3(0, 0.2, 0),
    biodome: new THREE.Vector3(7.4, 0.2, 1.6),
  };

  private hitColliders: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private projScratch = new THREE.Vector3();
  private lastAnchors: ProjectedModuleAnchor[] = [];

  private pointerDownPos = { x: 0, y: 0 };
  private hoveredModule: ModuleId | null = null;
  private highlightedTarget: ModuleId | 'any' = 'moxie';
  private evaActive = false;
  private evaTransition: EvaCameraTransition | null = null;
  private evaReturnPosition = new THREE.Vector3();
  private evaReturnTarget = new THREE.Vector3();
  private evaPosition = new THREE.Vector3();
  private evaKeys = new Set<string>();
  private evaYaw = 0;
  private evaPitch = 0;
  private evaTelemetryElapsed = 0;
  private evaToolHeld = false;
  private evaToolProgress = 0;
  private evaToolTarget: EvaObjective | null = null;
  private evaCompleted = new Set<EvaObjective>();
  private evaEffect: { mesh: THREE.Object3D; startedAt: number; duration: number } | null = null;

  private resources: MissionResources = {
    powerKwh: 88,
    lifeSupportPct: 80,
    crewHealthPct: 88,
    panelDustPct: 16,
    waterWallCm: 16,
    cropGrowth: 2,
    sciencePoints: 0,
  };
  private currentTau = 0.38;
  private emergencyMode: EmergencyMode = 'none';
  private emergencyBlend = 0;

  private activePulse: ModulePulse | null = null;
  private nightAnim: NightCycleAnim = {
    active: false,
    startTimeMs: 0,
    duration: 3.0,
    hazardType: 'none',
    shieldBlockedFlare: false,
    completed: false,
    onComplete: () => {},
  };

  private disposables: Array<{ dispose: () => void }> = [];
  private rafId: number | null = null;
  private swTimerId: number | null = null;
  private destroyed = false;
  private lastFrameTime = performance.now();
  private totalTime = 0;

  constructor(container: HTMLElement, callbacks: MarsSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.raycaster.layers.set(1);

    this.initScene();
    if (!this.renderer) return;
    this.bindEvents();
    window.addEventListener('keydown', this.handleEvaKeyDown);
    window.addEventListener('keyup', this.handleEvaKeyUp);
    window.addEventListener('blur', this.handleEvaBlur);
    this.startLoop();
  }

  private track<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private initScene(): void {
    const width = Math.max(this.container.clientWidth || window.innerWidth, 320);
    const height = Math.max(this.container.clientHeight || window.innerHeight, 320);

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch (err) {
      this.callbacks.onWebglError?.(
        err instanceof Error ? err.message : 'Unable to initialize 3D WebGL viewport.'
      );
      return;
    }

    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    if (!this.isSoftwareGl) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      this.renderer.shadowMap.enabled = false;
    }

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = this.skyColor.clone();
    const atmosphere = createMarsAtmosphere();
    this.track(atmosphere.geometry);
    this.track(atmosphere.material);
    this.atmosphereUniforms = atmosphere.uniforms;
    this.atmosphere = new THREE.Mesh(atmosphere.geometry, atmosphere.material);
    this.atmosphere.frustumCulled = false;
    this.scene.add(this.atmosphere);
    this.fog = new THREE.FogExp2(this.skyColor.getHex(), 0.0155);
    this.scene.fog = this.fog;

    // RoomEnvironment reflections (kept identical on GPU & software WebGL)
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = this.pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.85;
    roomEnv.dispose();

    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.25, 160);
    this.applyResponsiveCamera(width, height, true);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 2.35, -2.5);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 34;
    this.controls.minPolarAngle = Math.PI * 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.update();

    this.buildLights();
    this.buildSkyStars();
    this.buildMarsTerrain();
    this.buildMarsRocks();
    this.buildOutpostModules();
    this.buildHazardsAndRings();
    this.syncVisualState();
  }

  private buildLights(): void {
    this.hemiLight = new THREE.HemisphereLight('#FDBA74', '#5A2416', 0.92);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#FFF1D6', 2.45);
    this.sunLight.position.set(18, 22, 14);
    if (!this.isSoftwareGl) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.camera.near = 4;
      this.sunLight.shadow.camera.far = 64;
      const d = 16;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0008;
    }
    this.scene.add(this.sunLight);

    this.shelterInteriorLight = new THREE.PointLight('#FBBF24', 1.1, 16, 1.4);
    this.shelterInteriorLight.position.set(0.9, 2.2, 1.4);
    this.scene.add(this.shelterInteriorLight);

    this.moxieLight = new THREE.PointLight('#22D3EE', 1.1, 14, 1.4);
    this.moxieLight.position.set(-3.7, 2.2, -3.6);
    this.scene.add(this.moxieLight);

    this.biodomeLight = new THREE.PointLight('#34D399', 1.35, 14, 1.4);
    this.biodomeLight.position.set(6.8, 2.1, 2.0);
    this.scene.add(this.biodomeLight);
  }

  private buildSkyStars(): void {
    const count = 240;
    const positions = new Float32Array(count * 3);
    let seed = 109;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = rand() * Math.PI * 0.42;
      const r = 68;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.max(8, r * Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = this.track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starsMat = this.track(
      new THREE.PointsMaterial({
        color: '#E2E8F0',
        size: 0.42,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      })
    );
    this.starsPoints = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.starsPoints);
  }

  private buildMarsTerrain(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const { map, bumpMap, normalMap } = createMarsRegolithTextures(maxAniso);
    this.track(map);
    this.track(bumpMap);
    this.track(normalMap);

    const terrainGeo = this.track(new THREE.PlaneGeometry(110, 110, 72, 72));
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, groundHeightAt(x, z));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = this.track(
      new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.12,
        normalMap,
        normalScale: new THREE.Vector2(0.18, 0.18),
        roughness: 0.92,
        metalness: 0.04,
      })
    );
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = !this.isSoftwareGl;
    this.scene.add(terrain);
  }

  private buildMarsRocks(): void {
    const rockGeo = this.track(new THREE.DodecahedronGeometry(0.6, 0));
    const rockMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#6E3022',
        roughness: 0.9,
        metalness: 0.06,
      })
    );
    const count = 48;
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, count);
    rocks.receiveShadow = !this.isSoftwareGl;
    rocks.castShadow = !this.isSoftwareGl;

    const dummy = new THREE.Object3D();
    let seed = 77;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.25;
      const dist = 11.5 + rand() * 19;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scale = 0.45 + rand() * 1.35;
      const y = groundHeightAt(x, z) + scale * 0.25;

      dummy.position.set(x, y, z);
      dummy.rotation.set(rand() * 2, rand() * 3, rand() * 2);
      dummy.scale.set(scale * (0.8 + rand() * 0.6), scale * 0.72, scale * (0.8 + rand() * 0.5));
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    this.scene.add(rocks);
  }

  private addHitCollider(moduleId: ModuleId, pos: THREE.Vector3, radius: number, height: number): void {
    const hitGeo = this.track(new THREE.CylinderGeometry(radius, radius * 1.08, height, 14));
    const hitMat = this.track(new THREE.MeshBasicMaterial({ visible: false }));
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.set(pos.x, pos.y + height * 0.5, pos.z);
    hit.layers.set(1);
    hit.userData.moduleId = moduleId;
    this.hitColliders.push(hit);
    this.scene.add(hit);
  }

  private addContactShadow(x: number, z: number, radius: number, tex: THREE.CanvasTexture): void {
    const geo = this.track(new THREE.PlaneGeometry(radius * 2, radius * 2));
    geo.rotateX(-Math.PI / 2);
    const mat = this.track(
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      })
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, groundHeightAt(x, z) + 0.03, z);
    this.scene.add(mesh);
  }

  private buildOutpostModules(): void {
    const shadowTex = this.track(createContactShadowTexture());
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const solarTex = this.track(createSolarCellTexture(maxAniso));
    const dustOverlayTex = this.track(createDustOverlayTexture(maxAniso));

    this.habitatDustMat = this.track(
      new THREE.MeshStandardMaterial({
        map: dustOverlayTex,
        color: '#B84B2B',
        roughness: 0.98,
        metalness: 0.0,
        envMapIntensity: 0.12,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      })
    );

    // Shared engineering materials
    const hullWhite = this.track(
      new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.38, metalness: 0.35 })
    );
    const hullSlate = this.track(
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.6 })
    );
    const darkMetal = this.track(
      new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.42, metalness: 0.72 })
    );
    const accentAmber = this.track(
      new THREE.MeshStandardMaterial({
        color: '#F59E0B',
        emissive: '#B45309',
        emissiveIntensity: 0.45,
        roughness: 0.35,
        metalness: 0.3,
      })
    );

    // ------------------------------------------------------------------
    // 1. WATER-WALL STORM SHELTER (Center-Right: 0.9, y, 1.0)
    // ------------------------------------------------------------------
    const shelterPos = new THREE.Vector3(0.9, groundHeightAt(0.9, 1.0), 1.0);
    const shelterGroup = new THREE.Group();
    shelterGroup.position.copy(shelterPos);
    this.addContactShadow(shelterPos.x, shelterPos.z, 4.4, shadowTex);

    const baseDeckGeo = this.track(new THREE.CylinderGeometry(3.1, 3.5, 0.45, 16));
    const baseDeck = new THREE.Mesh(baseDeckGeo, hullSlate);
    baseDeck.position.y = 0.22;
    baseDeck.castShadow = !this.isSoftwareGl;
    baseDeck.receiveShadow = !this.isSoftwareGl;
    shelterGroup.add(baseDeck);

    this.shelterHullMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#CBD5E1',
        emissive: '#000000',
        emissiveIntensity: 0.0,
        roughness: 0.42,
        metalness: 0.3,
      })
    );
    const coreHullGeo = this.track(
      new THREE.SphereGeometry(2.45, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52)
    );
    const coreHull = new THREE.Mesh(coreHullGeo, this.shelterHullMat);
    coreHull.position.y = 0.42;
    coreHull.castShadow = !this.isSoftwareGl;
    shelterGroup.add(coreHull);

    // Martian dust accumulation overlay shell on Storm Shelter dome
    const shelterDustGeo = this.track(
      new THREE.SphereGeometry(2.465, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48)
    );
    const shelterDustDome = new THREE.Mesh(shelterDustGeo, this.habitatDustMat);
    shelterDustDome.position.y = 0.42;
    shelterDustDome.renderOrder = 1;
    shelterGroup.add(shelterDustDome);

    // Glowing interior crew habitat windows protruding cleanly outside dome shell
    this.shelterWindowMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#FEF08A',
        emissive: '#F59E0B',
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.1,
      })
    );
    const windowBeltGeo = this.track(new THREE.CylinderGeometry(2.48, 2.52, 0.34, 18));
    const windowBelt = new THREE.Mesh(windowBeltGeo, this.shelterWindowMat);
    windowBelt.position.y = 1.02;
    shelterGroup.add(windowBelt);

    // Roof comms spire & beacon
    const mastGeo = this.track(new THREE.CylinderGeometry(0.08, 0.14, 1.35, 8));
    const mast = new THREE.Mesh(mastGeo, darkMetal);
    mast.position.y = 3.25;
    shelterGroup.add(mast);

    this.shelterBeaconMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#38BDF8',
        emissive: '#0EA5E9',
        emissiveIntensity: 1.3,
        roughness: 0.2,
      })
    );
    const beaconGeo = this.track(new THREE.SphereGeometry(0.18, 12, 12));
    const beacon = new THREE.Mesh(beaconGeo, this.shelterBeaconMat);
    beacon.position.y = 3.98;
    shelterGroup.add(beacon);

    // Water-pump toroidal collar
    const collarGeo = this.track(new THREE.TorusGeometry(2.85, 0.18, 10, 28));
    const collar = new THREE.Mesh(collarGeo, darkMetal);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.48;
    shelterGroup.add(collar);

    // Outer Translucent Blue Water-Wall Forcefield Dome
    const shieldGeo = this.track(
      new THREE.SphereGeometry(2.88, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56)
    );
    this.waterShieldMat = this.track(
      new THREE.MeshPhysicalMaterial({
        color: '#38BDF8',
        emissive: '#0284C7',
        emissiveIntensity: 0.52,
        transparent: true,
        opacity: 0.34,
        roughness: 0.14,
        metalness: 0.05,
        clearcoat: 0.75,
        depthWrite: false,
      })
    );
    this.waterShieldMesh = new THREE.Mesh(shieldGeo, this.waterShieldMat);
    this.waterShieldMesh.position.y = 0.36;
    this.waterShieldMesh.renderOrder = 2;
    shelterGroup.add(this.waterShieldMesh);

    this.scene.add(shelterGroup);
    this.addHitCollider('shelter', shelterPos, 3.4, 4.1);
    this.moduleWorldCenters.shelter.copy(shelterPos);
    this.anchorWorldMap.shelter.set(shelterPos.x + 0.55, shelterPos.y + 4.35, shelterPos.z);

    // ------------------------------------------------------------------
    // 2. SOLAR ARRAY FIELD (Left: -6.8, y, 2.2) — 6-Panel Dual-Row Farm
    // ------------------------------------------------------------------
    const solarPos = new THREE.Vector3(-6.8, groundHeightAt(-6.8, 2.2), 2.2);
    const solarGroup = new THREE.Group();
    solarGroup.position.copy(solarPos);
    this.addContactShadow(solarPos.x, solarPos.z - 0.1, 4.9, shadowTex);

    const junctionGeo = this.track(new THREE.BoxGeometry(1.5, 0.7, 1.1));
    const junction = new THREE.Mesh(junctionGeo, hullSlate);
    junction.position.set(2.2, 0.35, 0.05);
    junction.castShadow = !this.isSoftwareGl;
    solarGroup.add(junction);

    const batteryCellGeo = this.track(new THREE.BoxGeometry(0.46, 0.55, 0.46));
    const batteryCell = new THREE.Mesh(batteryCellGeo, accentAmber);
    batteryCell.position.set(2.2, 0.88, 0.05);
    solarGroup.add(batteryCell);

    // Pedestal geometry shared across all 6 solar mounts
    const frontPostGeo = this.track(new THREE.CylinderGeometry(0.12, 0.17, 1.15, 10));
    const rearPostGeo = this.track(new THREE.CylinderGeometry(0.12, 0.17, 1.65, 10));
    const crossbarGeo = this.track(new THREE.BoxGeometry(5.6, 0.12, 0.14));

    const panelFrameMat = hullWhite;
    const solarCellMat = this.track(
      new THREE.MeshStandardMaterial({
        map: solarTex,
        roughness: 0.22,
        metalness: 0.65,
        emissive: '#0C4A6E',
        emissiveIntensity: 0.35,
      })
    );
    this.solarDustMat = this.track(
      new THREE.MeshStandardMaterial({
        map: dustOverlayTex,
        color: '#B84B2B',
        roughness: 0.98,
        metalness: 0.0,
        envMapIntensity: 0.12,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })
    );

    const panelFrameGeo = this.track(new THREE.BoxGeometry(2.08, 0.09, 1.48));
    const panelCellGeo = this.track(new THREE.BoxGeometry(1.9, 0.11, 1.3));
    const dustOverlayGeo = this.track(new THREE.PlaneGeometry(1.88, 1.28));
    const wiperGeo = this.track(new THREE.BoxGeometry(0.1, 0.08, 1.36));

    const panelCols = [-2.35, 0, 2.35];
    const rowConfigs = [
      { z: 1.05, y: 1.15, postGeo: frontPostGeo, postY: 0.58 },
      { z: -1.15, y: 1.65, postGeo: rearPostGeo, postY: 0.82 },
    ];

    rowConfigs.forEach((row) => {
      const tiltGroup = new THREE.Group();
      tiltGroup.position.set(0, row.y, row.z);
      tiltGroup.rotation.x = 0.38;

      const crossbar = new THREE.Mesh(crossbarGeo, darkMetal);
      crossbar.position.set(0, -0.08, 0);
      tiltGroup.add(crossbar);

      panelCols.forEach((xOffset) => {
        const post = new THREE.Mesh(row.postGeo, darkMetal);
        post.position.set(xOffset, row.postY, row.z);
        post.castShadow = !this.isSoftwareGl;
        solarGroup.add(post);

        const frame = new THREE.Mesh(panelFrameGeo, panelFrameMat);
        frame.position.set(xOffset, 0, 0);
        frame.castShadow = !this.isSoftwareGl;
        tiltGroup.add(frame);

        const cell = new THREE.Mesh(panelCellGeo, solarCellMat);
        cell.position.set(xOffset, 0.02, 0);
        tiltGroup.add(cell);

        const dustOverlay = new THREE.Mesh(dustOverlayGeo, this.solarDustMat);
        dustOverlay.rotation.x = -Math.PI / 2;
        dustOverlay.position.set(xOffset, 0.09, 0);
        dustOverlay.renderOrder = 1;
        tiltGroup.add(dustOverlay);

        const wiper = new THREE.Mesh(wiperGeo, accentAmber);
        wiper.position.set(xOffset - 0.88, 0.125, 0);
        tiltGroup.add(wiper);
        this.solarWipers.push({ mesh: wiper, baseX: xOffset });
      });

      this.solarTiltGroups.push(tiltGroup);
      solarGroup.add(tiltGroup);
    });

    this.scene.add(solarGroup);
    this.addHitCollider('solar', solarPos, 4.1, 3.0);
    this.moduleWorldCenters.solar.copy(solarPos);
    this.anchorWorldMap.solar.set(solarPos.x, solarPos.y + 3.25, solarPos.z);

    // ------------------------------------------------------------------
    // 3. MOXIE & LIFE SUPPORT CORE (Back-Left: -3.7, y, -4.4)
    // ------------------------------------------------------------------
    const moxiePos = new THREE.Vector3(-3.7, groundHeightAt(-3.7, -4.4), -4.4);
    const moxieGroup = new THREE.Group();
    moxieGroup.position.copy(moxiePos);
    this.addContactShadow(moxiePos.x, moxiePos.z, 3.4, shadowTex);

    const moxiePad = new THREE.Mesh(this.track(new THREE.BoxGeometry(3.8, 0.4, 2.8)), hullSlate);
    moxiePad.position.y = 0.2;
    moxiePad.receiveShadow = !this.isSoftwareGl;
    moxieGroup.add(moxiePad);

    const moxieBody = new THREE.Mesh(this.track(new THREE.BoxGeometry(2.3, 1.65, 1.8)), hullWhite);
    moxieBody.position.set(-0.35, 1.18, 0);
    moxieBody.castShadow = !this.isSoftwareGl;
    moxieGroup.add(moxieBody);

    // 3 glowing cyan O2 tanks
    this.moxieTankMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#22D3EE',
        emissive: '#06B6D4',
        emissiveIntensity: 0.72,
        roughness: 0.25,
        metalness: 0.35,
      })
    );
    const tankGeo = this.track(new THREE.CylinderGeometry(0.32, 0.32, 1.85, 14));
    for (let i = 0; i < 3; i++) {
      const tank = new THREE.Mesh(tankGeo, this.moxieTankMat);
      tank.position.set(1.22, 1.32, -0.58 + i * 0.58);
      tank.castShadow = !this.isSoftwareGl;
      moxieGroup.add(tank);
    }

    // Intake CO2 turbine fan on roof
    const intakeHood = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.62, 0.72, 0.45, 16)),
      darkMetal
    );
    intakeHood.position.set(-0.35, 2.22, 0);
    moxieGroup.add(intakeHood);

    this.moxieFan = new THREE.Group();
    this.moxieFan.position.set(-0.35, 2.48, 0);
    const bladeGeo = this.track(new THREE.BoxGeometry(0.98, 0.05, 0.16));
    const blade1 = new THREE.Mesh(bladeGeo, accentAmber);
    const blade2 = new THREE.Mesh(bladeGeo, accentAmber);
    blade2.rotation.y = Math.PI / 2;
    this.moxieFan.add(blade1, blade2);
    moxieGroup.add(this.moxieFan);

    // Pooled rising O2 bubbles
    const bubbleGeo = this.track(new THREE.SphereGeometry(0.11, 8, 8));
    const bubbleMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#A5F3FC',
        emissive: '#22D3EE',
        emissiveIntensity: 1.1,
        transparent: true,
        opacity: 0.85,
      })
    );
    for (let i = 0; i < 12; i++) {
      const b = new THREE.Mesh(bubbleGeo, bubbleMat);
      b.position.set(1.05 + (i % 3) * 0.2, 2.1 + (i / 12) * 2.1, -0.35 + ((i * 7) % 5) * 0.16);
      b.userData.phase = i * 0.55;
      this.moxieBubbles.push(b);
      moxieGroup.add(b);
    }

    this.scene.add(moxieGroup);
    this.addHitCollider('moxie', moxiePos, 2.6, 3.2);
    this.moduleWorldCenters.moxie.copy(moxiePos);
    this.anchorWorldMap.moxie.set(moxiePos.x - 0.55, moxiePos.y + 3.85, moxiePos.z);

    // ------------------------------------------------------------------
    // 4. HYDROPONIC BIO-DOME (Right: 6.8, y, 2.0)
    // ------------------------------------------------------------------
    const bioPos = new THREE.Vector3(6.8, groundHeightAt(6.8, 2.0), 2.0);
    const bioGroup = new THREE.Group();
    bioGroup.position.copy(bioPos);
    this.addContactShadow(bioPos.x, bioPos.z, 3.4, shadowTex);

    const bioBase = new THREE.Mesh(this.track(new THREE.CylinderGeometry(2.55, 2.85, 0.45, 20)), hullSlate);
    bioBase.position.y = 0.22;
    bioBase.receiveShadow = !this.isSoftwareGl;
    bioGroup.add(bioBase);

    const soilTray = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(2.1, 2.1, 0.16, 18)),
      this.track(new THREE.MeshStandardMaterial({ color: '#3F271B', roughness: 0.95 }))
    );
    soilTray.position.y = 0.48;
    bioGroup.add(soilTray);

    // 3D Green Hydroponic Plants (scale dynamically with cropGrowth)
    const stemMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#10B981',
        emissive: '#059669',
        emissiveIntensity: 0.35,
        roughness: 0.45,
      })
    );
    const leafMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#4ADE80',
        emissive: '#16A34A',
        emissiveIntensity: 0.45,
        roughness: 0.4,
      })
    );
    const stemGeo = this.track(new THREE.CylinderGeometry(0.06, 0.08, 0.65, 8));
    const leafGeo = this.track(new THREE.SphereGeometry(0.24, 10, 8));

    for (let i = 0; i < 8; i++) {
      const plant = new THREE.Group();
      const angle = (i / 8) * Math.PI * 2;
      const dist = i % 2 === 0 ? 1.22 : 0.72;
      plant.position.set(Math.cos(angle) * dist, 0.56, Math.sin(angle) * dist);

      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.32;
      plant.add(stem);

      const crown = new THREE.Mesh(leafGeo, leafMat);
      crown.scale.set(1.25, 0.85, 1.25);
      crown.position.y = 0.72;
      plant.add(crown);

      this.biodomeCrops.push(plant);
      bioGroup.add(plant);
    }

    // LED Grow Light Ring inside dome
    this.bioLedRingMat = this.track(
      new THREE.MeshStandardMaterial({
        color: '#E879F9',
        emissive: '#D946EF',
        emissiveIntensity: 0.9,
        roughness: 0.25,
      })
    );
    const ledRing = new THREE.Mesh(this.track(new THREE.TorusGeometry(1.45, 0.06, 8, 24)), this.bioLedRingMat);
    ledRing.rotation.x = Math.PI / 2;
    ledRing.position.y = 1.9;
    bioGroup.add(ledRing);

    // Outer Glass Dome
    this.biodomeGlassMat = this.track(
      new THREE.MeshPhysicalMaterial({
        color: '#A7F3D0',
        emissive: '#10B981',
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.28,
        roughness: 0.1,
        metalness: 0.05,
        depthWrite: false,
      })
    );
    const glassDome = new THREE.Mesh(
      this.track(new THREE.SphereGeometry(2.42, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.54)),
      this.biodomeGlassMat
    );
    glassDome.position.y = 0.42;
    glassDome.renderOrder = 3;
    bioGroup.add(glassDome);

    // Martian dust accumulation layer on Bio-Dome glass
    const bioDustDome = new THREE.Mesh(
      this.track(new THREE.SphereGeometry(2.435, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      this.habitatDustMat
    );
    bioDustDome.position.y = 0.42;
    bioDustDome.renderOrder = 4;
    bioGroup.add(bioDustDome);

    this.scene.add(bioGroup);
    this.addHitCollider('biodome', bioPos, 2.7, 3.0);
    this.moduleWorldCenters.biodome.copy(bioPos);
    this.anchorWorldMap.biodome.set(bioPos.x, bioPos.y + 3.4, bioPos.z);

    // ------------------------------------------------------------------
    // 5. CONNECTING PRESSURIZED AIRLOCK TUNNELS & POWER CONDUIT
    // ------------------------------------------------------------------
    const connectTunnel = (
      a: THREE.Vector3,
      b: THREE.Vector3,
      radius: number,
      mat: THREE.Material,
      addDustSleeve = false
    ) => {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );
      const tunnelGeo = this.track(new THREE.CylinderGeometry(radius, radius, len, 12));
      const tunnel = new THREE.Mesh(tunnelGeo, mat);
      tunnel.position.set(mid.x, Math.max(a.y, b.y) + radius + 0.1, mid.z);
      tunnel.quaternion.copy(q);
      tunnel.castShadow = !this.isSoftwareGl;
      this.scene.add(tunnel);

      if (addDustSleeve) {
        const dustSleeveGeo = this.track(
          new THREE.CylinderGeometry(radius + 0.015, radius + 0.015, len * 0.92, 12, 1, true)
        );
        const sleeve = new THREE.Mesh(dustSleeveGeo, this.habitatDustMat);
        sleeve.position.copy(tunnel.position);
        sleeve.quaternion.copy(q);
        sleeve.renderOrder = 2;
        this.scene.add(sleeve);
      }
    };

    connectTunnel(shelterPos, moxiePos, 0.48, hullWhite, true);
    connectTunnel(shelterPos, bioPos, 0.48, hullWhite, true);
    connectTunnel(shelterPos, solarPos, 0.16, accentAmber, false);
  }

  private buildHazardsAndRings(): void {
    // Highlight Ring for Target Module
    const ringGeo = this.track(new THREE.RingGeometry(2.85, 3.25, 36));
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = this.track(
      new THREE.MeshBasicMaterial({
        color: '#22D3EE',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      })
    );
    this.targetRing = new THREE.Mesh(ringGeo, ringMat);
    this.scene.add(this.targetRing);

    const hoverGeo = this.track(new THREE.RingGeometry(2.6, 2.82, 36));
    hoverGeo.rotateX(-Math.PI / 2);
    const hoverMat = this.track(
      new THREE.MeshBasicMaterial({
        color: '#FBBF24',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    this.hoverRing = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverRing.visible = false;
    this.scene.add(this.hoverRing);

    // Pre-allocated Dust Storm Particle Pool
    const dustCount = 150;
    this.dustPositions = new Float32Array(dustCount * 3);
    let seed = 211;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < dustCount; i++) {
      this.dustPositions[i * 3] = (rand() - 0.5) * 32;
      this.dustPositions[i * 3 + 1] = 0.5 + rand() * 5.2;
      this.dustPositions[i * 3 + 2] = (rand() - 0.5) * 24;
    }
    const dustGeo = this.track(new THREE.BufferGeometry());
    dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    this.dustStormMat = this.track(
      new THREE.PointsMaterial({
        color: '#FDBA74',
        size: 0.34,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      })
    );
    this.dustStormPoints = new THREE.Points(dustGeo, this.dustStormMat);
    this.scene.add(this.dustStormPoints);

    // Solar Flare Proton Bolts
    this.flareBoltsGroup = new THREE.Group();
    this.flareBoltsGroup.visible = false;
    const boltGeo = this.track(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6));
    const boltMat = this.track(
      new THREE.MeshBasicMaterial({ color: '#FB7185', transparent: true, opacity: 0.92 })
    );
    for (let i = 0; i < 12; i++) {
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      const angle = (i / 12) * Math.PI * 2;
      const radius = 1.2 + (i % 3) * 0.7;
      bolt.position.set(Math.cos(angle) * radius, 8 + (i % 4) * 1.6, Math.sin(angle) * radius);
      this.flareBoltsGroup.add(bolt);
      this.flareBolts.push({
        mesh: bolt,
        speed: 8 + (i % 4) * 1.4,
        angle,
        radius,
        deflected: false,
      });
    }
    this.scene.add(this.flareBoltsGroup);
  }

  public updateMissionVisuals(
    resources: MissionResources,
    tau: number,
    targetModule: ModuleId | 'any',
    emergencyMode: EmergencyMode = 'none'
  ): void {
    this.resources = resources;
    this.currentTau = tau;
    this.highlightedTarget = targetModule;
    this.emergencyMode = emergencyMode;
    this.syncVisualState();
  }

  private syncVisualState(): void {
    if (!this.waterShieldMesh) return;

    // 1. Water-Wall Shield scale & opacity based on waterWallCm (8..36 cm)
    const wallRatio = THREE.MathUtils.clamp((this.resources.waterWallCm - 8) / 28, 0, 1);
    const shieldScale = 0.96 + wallRatio * 0.16;
    this.waterShieldMesh.scale.set(shieldScale, shieldScale, shieldScale);
    this.waterShieldMat.opacity = 0.2 + wallRatio * 0.44;
    this.waterShieldMat.emissiveIntensity = 0.3 + wallRatio * 0.85;

    // 2. Solar Panel & Habitat Dome/Tunnel Dust layer opacity
    const dustRatio = THREE.MathUtils.clamp(this.resources.panelDustPct / 85, 0, 1);
    this.solarDustMat.opacity = THREE.MathUtils.clamp(dustRatio * 0.86, 0.03, 0.88);
    if (this.habitatDustMat) {
      const stormBoost = this.currentTau >= 0.85 ? 0.28 : 0;
      const baseDust = Math.max(0, dustRatio - 0.12) * 0.65;
      this.habitatDustMat.opacity = THREE.MathUtils.clamp(
        baseDust + stormBoost,
        0.04,
        0.78
      );
    }

    // 3. Bio-Dome Crop Height (cropGrowth 1..5)
    const cropScale = 0.55 + (this.resources.cropGrowth - 1) * 0.24;
    for (let i = 0; i < this.biodomeCrops.length; i++) {
      const s = cropScale * (i % 2 === 0 ? 1.0 : 0.86);
      this.biodomeCrops[i].scale.set(s, s * 1.12, s);
    }

    // 4. MOXIE tank brightness based on lifeSupportPct
    const o2Ratio = THREE.MathUtils.clamp(this.resources.lifeSupportPct / 100, 0.15, 1);
    this.moxieTankMat.emissiveIntensity = 0.35 + o2Ratio * 0.95;

    // 5. Target module ground ring
    if (this.highlightedTarget === 'any') {
      this.targetRing.visible = false;
    } else {
      this.targetRing.visible = true;
      const center = this.moduleWorldCenters[this.highlightedTarget];
      this.targetRing.position.set(center.x, center.y + 0.07, center.z);
    }
  }

  public enterEva(): boolean {
    if (!this.renderer || !this.controls || this.destroyed) return false;
    if (this.evaActive) return true;
    this.evaActive = true;
    this.evaKeys.clear();
    this.evaCompleted.clear();
    this.evaReturnPosition.copy(this.camera.position);
    this.evaReturnTarget.copy(this.controls.target);
    this.controls.enabled = false;
    this.evaPosition.set(0, groundHeightAt(0, 3.2) + 1.72, 3.2);
    this.evaYaw = 0;
    this.evaPitch = -0.08;
    this.beginEvaTransition(
      this.evaPosition.clone(),
      this.evaPosition.clone().add(new THREE.Vector3(0, -0.1, -5)),
      false
    );
    return true;
  }

  public exitEva(notify = true): void {
    if (!this.evaActive) return;
    this.evaActive = false;
    this.evaKeys.clear();
    this.evaToolHeld = false;
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock();
    this.beginEvaTransition(this.evaReturnPosition, this.evaReturnTarget, true);
    if (notify) this.callbacks.onEvaExit?.();
  }

  private beginEvaTransition(toPosition: THREE.Vector3, toTarget: THREE.Vector3, returning: boolean): void {
    const fromTarget = new THREE.Vector3();
    this.camera.getWorldDirection(fromTarget).add(this.camera.position);
    this.evaTransition = {
      elapsed: 0,
      duration: 1.25,
      fromPosition: this.camera.position.clone(),
      toPosition: toPosition.clone(),
      fromTarget,
      toTarget: toTarget.clone(),
      returning,
    };
  }

  private handleEvaKeyDown = (event: KeyboardEvent): void => {
    if (!this.evaActive) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      event.preventDefault();
      this.exitEva();
      return;
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e'].includes(key)) {
      event.preventDefault();
      this.evaKeys.add(key);
      if (key === 'e') this.evaToolHeld = true;
    }
  };

  private handleEvaKeyUp = (event: KeyboardEvent): void => {
    this.evaKeys.delete(event.key.toLowerCase());
    if (event.key.toLowerCase() === 'e') this.evaToolHeld = false;
  };

  private handleEvaBlur = (): void => {
    this.evaKeys.clear();
    this.evaToolHeld = false;
  };

  private updateEva(dt: number): void {
    if (this.evaTransition) {
      const transition = this.evaTransition;
      transition.elapsed = Math.min(transition.elapsed + dt, transition.duration);
      const progress = transition.elapsed / transition.duration;
      const eased = progress * progress * (3 - 2 * progress);
      this.camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
      const target = new THREE.Vector3().lerpVectors(transition.fromTarget, transition.toTarget, eased);
      this.camera.lookAt(target);
      if (progress >= 1) {
        this.evaTransition = null;
        if (transition.returning) {
          this.controls.target.copy(this.evaReturnTarget);
          this.controls.enabled = true;
          this.controls.update();
        }
      }
      return;
    }
    if (!this.evaActive) return;

    const forward = (this.evaKeys.has('w') || this.evaKeys.has('arrowup') ? 1 : 0) -
      (this.evaKeys.has('s') || this.evaKeys.has('arrowdown') ? 1 : 0);
    const strafe = (this.evaKeys.has('d') || this.evaKeys.has('arrowright') ? 1 : 0) -
      (this.evaKeys.has('a') || this.evaKeys.has('arrowleft') ? 1 : 0);
    const moveLength = Math.hypot(forward, strafe);
    if (moveLength > 0) {
      const speed = 3.2 * dt / moveLength;
      const nextX = THREE.MathUtils.clamp(this.evaPosition.x + (Math.sin(this.evaYaw) * forward + Math.cos(this.evaYaw) * strafe) * speed, -22, 22);
      const nextZ = THREE.MathUtils.clamp(this.evaPosition.z + (-Math.cos(this.evaYaw) * forward + Math.sin(this.evaYaw) * strafe) * speed, -22, 22);
      this.evaPosition.set(nextX, groundHeightAt(nextX, nextZ) + 1.72, nextZ);
    }
    const walking = moveLength > 0 ? Math.sin(this.totalTime * 8) * 0.035 : 0;
    this.camera.position.set(this.evaPosition.x, this.evaPosition.y + walking, this.evaPosition.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.evaPitch, this.evaYaw, 0);
    this.evaTelemetryElapsed += dt;
    if (this.evaTelemetryElapsed >= 0.12) {
      this.evaTelemetryElapsed = 0;
      const targetX = 12 - this.evaPosition.x;
      const targetZ = -10 - this.evaPosition.z;
      const heading = (THREE.MathUtils.radToDeg(this.evaYaw) + 360) % 360;
      const bearing = (THREE.MathUtils.radToDeg(Math.atan2(targetX, -targetZ)) + 360) % 360;
      this.callbacks.onEvaTelemetry?.({
        heading: Math.round(heading),
        relativeBearing: Math.round((bearing - heading + 360) % 360),
        distance: Math.round(Math.hypot(targetX, targetZ)),
      });
    }

    if (this.evaToolHeld) {
      const solar = this.getEvaTarget('solar', new THREE.Vector3(-6.8, groundHeightAt(-6.8, 2.2) + 1.2, 2.2), 5.8);
      const sample = this.getEvaTarget('sample', new THREE.Vector3(12, groundHeightAt(12, -10) + 1, -10), 4.5);
      const target = solar ?? sample;
      if (target && target !== this.evaToolTarget) {
        this.evaToolTarget = target;
        this.evaToolProgress = 0;
      }
      if (target) {
        this.evaToolProgress += dt;
        if (this.evaToolProgress >= 1.15) this.completeEvaObjective(target);
      } else {
        this.evaToolTarget = null;
        this.evaToolProgress = 0;
      }
    } else {
      this.evaToolTarget = null;
      this.evaToolProgress = 0;
    }
  }

  private getEvaTarget(objective: EvaObjective, point: THREE.Vector3, range: number): EvaObjective | null {
    if (this.evaCompleted.has(objective) || this.evaPosition.distanceTo(point) > range) return null;
    const direction = point.clone().sub(this.camera.position).normalize();
    const lookDirection = new THREE.Vector3();
    this.camera.getWorldDirection(lookDirection);
    return lookDirection.dot(direction) > 0.35 ? objective : null;
  }

  private completeEvaObjective(objective: EvaObjective): void {
    if (this.evaCompleted.has(objective)) return;
    this.evaCompleted.add(objective);
    this.evaToolHeld = false;
    this.evaToolProgress = 0;
    this.evaToolTarget = null;
    if (objective === 'solar') this.triggerModuleFeedback('solar');
    this.createEvaEffect(objective);
    this.callbacks.onEvaObjective?.(objective);
  }

  private createEvaEffect(objective: EvaObjective): void {
    if (this.evaEffect) {
      this.scene.remove(this.evaEffect.mesh);
      if (this.evaEffect.mesh instanceof THREE.Points) {
        this.evaEffect.mesh.geometry.dispose();
        (this.evaEffect.mesh.material as THREE.Material).dispose();
      }
    }
    let mesh: THREE.Object3D;
    if (objective === 'solar') {
      const count = 54;
      const positions = new Float32Array(count * 3);
      for (let index = 0; index < count; index++) {
        positions[index * 3] = (Math.random() - 0.5) * 3.4;
        positions[index * 3 + 1] = Math.random() * 0.35;
        positions[index * 3 + 2] = (Math.random() - 0.5) * 1.8;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({ color: '#D89A73', size: 0.16, transparent: true, opacity: 0.8, depthWrite: false });
      const particles = new THREE.Points(geometry, material);
      particles.position.set(-6.8, groundHeightAt(-6.8, 2.2) + 1.6, 2.2);
      mesh = particles;
    } else {
      const direction = new THREE.Vector3(0, 1, 0);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.11, 2.6, 8),
        new THREE.MeshBasicMaterial({ color: '#67E8F9', transparent: true, opacity: 0.72, depthWrite: false })
      );
      beam.position.set(12, groundHeightAt(12, -10) + 1.3, -10);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      mesh = beam;
    }
    this.scene.add(mesh);
    this.evaEffect = { mesh, startedAt: performance.now(), duration: 1.8 };
  }

  public triggerModuleFeedback(moduleId: ModuleId): void {
    this.activePulse = {
      moduleId,
      startTimeMs: performance.now(),
      duration: 1.05,
    };
  }

  public triggerNightCycle(
    hazardType: SolHazardType,
    shieldBlockedFlare: boolean,
    onComplete: () => void
  ): void {
    if (!this.renderer || !this.scene) {
      onComplete();
      return;
    }
    if (this.nightAnim.active) return;
    this.nightAnim = {
      active: true,
      startTimeMs: performance.now(),
      duration: 3.0,
      hazardType,
      shieldBlockedFlare,
      completed: false,
      onComplete,
    };
    if (hazardType === 'flare') {
      this.flareBoltsGroup.visible = true;
      for (let i = 0; i < this.flareBolts.length; i++) {
        const b = this.flareBolts[i];
        b.mesh.position.set(
          Math.cos(b.angle) * b.radius,
          7 + (i % 4) * 1.6,
          Math.sin(b.angle) * b.radius
        );
        b.mesh.rotation.set(0, 0, 0);
        b.deflected = false;
      }
    }
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('pointermove', this.handlePointerMove);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
    window.addEventListener('resize', this.handleResize);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onWebglError?.('3D WebGL context was interrupted.');
  };

  private applyResponsiveCamera(width: number, height: number, resetPos = false): void {
    const aspect = width / height;
    const isPortrait = aspect < 1.0;
    this.camera.fov = isPortrait ? 65 : 44;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    if (resetPos) {
      if (isPortrait) {
        this.camera.position.set(0, 9.2, 31.0);
        this.controls?.target.set(0, 1.8, -1.5);
      } else {
        this.camera.position.set(0, 5.8, 21.8);
        this.controls?.target.set(0, 2.35, -2.5);
      }
    }
  }

  private handleResize = (): void => {
    if (this.destroyed || !this.renderer) return;
    const width = Math.max(this.container.clientWidth || window.innerWidth, 320);
    const height = Math.max(this.container.clientHeight || window.innerHeight, 320);
    this.applyResponsiveCamera(width, height, !this.evaActive);
    if (!this.evaActive) this.controls.update();
    this.renderer.setSize(width, height);
  };

  private updatePointerNdc(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickModule(e: PointerEvent): ModuleId | null {
    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitColliders, false);
    if (hits.length === 0) return null;
    return (hits[0].object.userData.moduleId as ModuleId) ?? null;
  }

  private handlePointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    if (this.evaActive) {
      if (document.pointerLockElement !== this.renderer.domElement) {
        void this.renderer.domElement.requestPointerLock();
      }
      this.evaToolHeld = true;
      return;
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.evaActive) {
      if (document.pointerLockElement === this.renderer.domElement) {
        this.evaYaw -= e.movementX * 0.0022;
        this.evaPitch = THREE.MathUtils.clamp(this.evaPitch - e.movementY * 0.0018, -1.05, 0.75);
      }
      return;
    }
    if (this.nightAnim.active) return;
    const hit = this.pickModule(e);
    if (hit !== this.hoveredModule) {
      this.hoveredModule = hit;
      this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
      if (hit) {
        const center = this.moduleWorldCenters[hit];
        this.hoverRing.position.set(center.x, center.y + 0.08, center.z);
        this.hoverRing.visible = true;
      } else {
        this.hoverRing.visible = false;
      }
      this.callbacks.onHoverModule(hit);
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.evaActive) {
      this.evaToolHeld = false;
      const solar = this.getEvaTarget('solar', new THREE.Vector3(-6.8, groundHeightAt(-6.8, 2.2) + 1.2, 2.2), 5.8);
      const sample = this.getEvaTarget('sample', new THREE.Vector3(12, groundHeightAt(12, -10) + 1, -10), 4.5);
      const target = solar ?? sample;
      if (target) this.completeEvaObjective(target);
      return;
    }
    const travel = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (travel > 6 || this.nightAnim.active) return;
    const hit = this.pickModule(e);
    if (hit) {
      this.callbacks.onModuleClick(hit);
    }
  };

  private startLoop(): void {
    const scheduleNext = () => {
      if (this.destroyed) return;
      if (this.isSoftwareGl) {
        this.afterDraw(() => {
          if (!this.destroyed) this.tick();
        });
      } else {
        this.rafId = requestAnimationFrame(() => this.tick());
      }
    };
    scheduleNext();
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.destroyed) return;
        const status = sync ? gl.clientWaitSync(sync, 0, 0) : gl.ALREADY_SIGNALED;
        if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
          if (sync) gl.deleteSync(sync);
          this.swTimerId = window.setTimeout(cb, 80);
        } else {
          this.swTimerId = window.setTimeout(poll, 16);
        }
      };
      this.swTimerId = window.setTimeout(poll, 16);
    } else {
      this.swTimerId = window.setTimeout(cb, 90);
    }
  }

  private tick(): void {
    if (this.destroyed || !this.renderer) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;
    this.totalTime += dt;

    this.atmosphere.position.copy(this.camera.position);
    this.atmosphereUniforms.uTime.value = this.totalTime;
    const stormIntensity = Math.max(
      this.emergencyBlend,
      THREE.MathUtils.clamp((this.currentTau - 0.35) / 1.1, 0, 0.75)
    );
    this.atmosphereUniforms.uStorm.value = THREE.MathUtils.lerp(
      this.atmosphereUniforms.uStorm.value,
      stormIntensity,
      Math.min(1, dt * 1.5)
    );

    this.updateEva(dt);
    if (!this.evaActive && !this.evaTransition) this.controls.update();
    this.updateAnimations(dt);
    this.renderer.render(this.scene, this.camera);
    this.emitProjectedAnchors();

    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.destroyed) this.tick();
      });
    } else {
      this.rafId = requestAnimationFrame(() => this.tick());
    }
  }

  private updateAnimations(dt: number): void {
    if (this.evaEffect) {
      const progress = (performance.now() - this.evaEffect.startedAt) / 1000 / this.evaEffect.duration;
      if (this.evaEffect.mesh instanceof THREE.Points) {
        const position = this.evaEffect.mesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let index = 0; index < position.count; index++) {
          position.setY(index, position.getY(index) + dt * (0.45 + (index % 4) * 0.12));
          position.setX(index, position.getX(index) + Math.sin(this.totalTime * 5 + index) * dt * 0.12);
        }
        position.needsUpdate = true;
        (this.evaEffect.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, 0.8 * (1 - progress));
      } else if (this.evaEffect.mesh instanceof THREE.Mesh) {
        (this.evaEffect.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.72 * (1 - progress));
      }
      if (progress >= 1) {
        this.scene.remove(this.evaEffect.mesh);
        if (this.evaEffect.mesh instanceof THREE.Points) {
          this.evaEffect.mesh.geometry.dispose();
          (this.evaEffect.mesh.material as THREE.Material).dispose();
        } else if (this.evaEffect.mesh instanceof THREE.Mesh) {
          this.evaEffect.mesh.geometry.dispose();
          (this.evaEffect.mesh.material as THREE.Material).dispose();
        }
        this.evaEffect = null;
      }
    }

    // Ambient MOXIE turbine rotation & rising O2 bubbles
    this.moxieFan.rotation.y += dt * 4.5;
    const bubbleSpeed = this.activePulse?.moduleId === 'moxie' ? 3.1 : 1.05;
    for (let i = 0; i < this.moxieBubbles.length; i++) {
      const b = this.moxieBubbles[i];
      b.position.y += dt * bubbleSpeed;
      if (b.position.y > 4.4) b.position.y = 2.05;
      b.position.x = 1.05 + (i % 3) * 0.2 + Math.sin(this.totalTime * 3 + b.userData.phase) * 0.08;
    }

    // Gentle solar tilt & target ring pulse
    const tiltAngle = 0.36 + Math.sin(this.totalTime * 0.6) * 0.05;
    for (let i = 0; i < this.solarTiltGroups.length; i++) {
      this.solarTiltGroups[i].rotation.x = tiltAngle;
    }
    for (let i = 0; i < this.biodomeCrops.length; i++) {
      this.biodomeCrops[i].rotation.z = Math.sin(this.totalTime * 0.65 + i * 1.7) * 0.025;
    }
    if (this.targetRing.visible) {
      const pulse = 1 + Math.sin(this.totalTime * 3.8) * 0.045;
      this.targetRing.scale.set(pulse, 1, pulse);
    }

    // Active module click feedback animation (wall-clock paced)
    if (this.activePulse) {
      const elapsedSec = (performance.now() - this.activePulse.startTimeMs) / 1000;
      const p = Math.min(elapsedSec / this.activePulse.duration, 1);

      if (this.activePulse.moduleId === 'solar') {
        const sweep = Math.sin(p * Math.PI * 2) * 0.88;
        for (let i = 0; i < this.solarWipers.length; i++) {
          const w = this.solarWipers[i];
          w.mesh.position.x = w.baseX + sweep;
        }
      } else if (this.activePulse.moduleId === 'shelter') {
        const ripple = Math.sin(p * Math.PI) * 0.12;
        const baseScale = 0.96 + ((this.resources.waterWallCm - 8) / 28) * 0.16;
        const s = baseScale + ripple;
        this.waterShieldMesh.scale.set(s, s, s);
        this.waterShieldMat.emissiveIntensity = 0.9 + Math.sin(p * Math.PI) * 1.2;
      } else if (this.activePulse.moduleId === 'biodome') {
        this.biodomeGlassMat.emissiveIntensity = 0.2 + Math.sin(p * Math.PI) * 0.75;
        this.biodomeLight.intensity = 1.2 + Math.sin(p * Math.PI) * 1.8;
      } else if (this.activePulse.moduleId === 'moxie') {
        this.moxieTankMat.emissiveIntensity = 1.1 + Math.sin(p * Math.PI) * 1.1;
      }

      if (p >= 1) {
        for (let i = 0; i < this.solarWipers.length; i++) {
          const w = this.solarWipers[i];
          w.mesh.position.x = w.baseX - 0.88;
        }
        this.activePulse = null;
        this.syncVisualState();
      }
    }

    // Dust particle drift (stronger during high Tau or Dust Storm night cycle)
    const isDustStorm =
      (this.nightAnim.active && this.nightAnim.hazardType === 'dust') || this.currentTau >= 1.0;
    const windSpeed = isDustStorm ? 14.5 : 2.2;
    this.dustStormMat.opacity = isDustStorm ? 0.68 : THREE.MathUtils.clamp(this.currentTau * 0.22, 0.08, 0.35);
    for (let i = 0; i < this.dustPositions.length; i += 3) {
      this.dustPositions[i] += dt * windSpeed;
      if (this.dustPositions[i] > 16) this.dustPositions[i] = -16;
    }
    this.dustStormPoints.geometry.attributes.position.needsUpdate = true;

    // Emergency Red-Alert Lighting Mode smooth blend & pulsing
    const targetEmergency = this.emergencyMode !== 'none' ? 1 : 0;
    this.emergencyBlend = THREE.MathUtils.lerp(
      this.emergencyBlend,
      targetEmergency,
      Math.min(1, dt * 8.5)
    );
    const alertPulse = 0.5 + 0.5 * Math.sin(this.totalTime * 5.2);
    this.scratchAlertColor.lerpColors(this.alertRedColor, this.alertAmberColor, alertPulse);

    // Fog density increases during high-Tau dust storms or active emergencies
    const targetFogDensity =
      this.emergencyMode === 'dust' || this.currentTau >= 1.0
        ? 0.0245
        : this.emergencyMode === 'flare'
        ? 0.0205
        : 0.0155;
    this.fog.density = THREE.MathUtils.lerp(this.fog.density, targetFogDensity, Math.min(1, dt * 6.0));

    // Apply Emergency Red/Amber interior lighting to Storm Shelter, MOXIE, and Bio-Dome
    if (!this.nightAnim.active) {
      const baseDaySky =
        this.emergencyMode === 'flare'
          ? this.flareAlertSkyColor
          : this.emergencyMode === 'dust'
          ? this.dustAlertSkyColor
          : this.daySkyColor;
      this.nightBlend = THREE.MathUtils.lerp(this.nightBlend, 0, Math.min(1, dt * 2.8));
      this.atmosphereUniforms.uNight.value = this.nightBlend;
      this.atmosphereUniforms.uSunGlow.value = 0.9 - this.emergencyBlend * 0.38;
      this.skyColor.lerp(baseDaySky, Math.min(1, dt * 7.5));
      (this.scene.background as THREE.Color).copy(this.skyColor);
      this.fog.color.copy(this.skyColor);

      this.scene.environmentIntensity = THREE.MathUtils.lerp(0.85, 0.24, this.emergencyBlend);
      this.sunLight.color.lerpColors(this.calmSunColor, this.alertSunColor, this.emergencyBlend * 0.9);
      this.sunLight.intensity = THREE.MathUtils.lerp(2.45, 0.95, this.emergencyBlend);
      this.hemiLight.intensity = THREE.MathUtils.lerp(0.92, 0.36, this.emergencyBlend);

      this.shelterInteriorLight.color.lerpColors(
        this.calmWindowEmissive,
        this.scratchAlertColor,
        this.emergencyBlend
      );
      this.shelterInteriorLight.intensity =
        1.1 + this.emergencyBlend * (3.6 + alertPulse * 2.4);

      this.moxieLight.color.lerpColors(
        this.calmMoxieEmissive,
        this.scratchAlertColor,
        this.emergencyBlend
      );
      this.moxieLight.intensity = 1.1 + this.emergencyBlend * (3.2 + alertPulse * 2.2);

      this.biodomeLight.color.lerpColors(
        this.calmBioEmissive,
        this.scratchAlertColor,
        this.emergencyBlend
      );
      if (!this.activePulse || this.activePulse.moduleId !== 'biodome') {
        this.biodomeLight.intensity = 1.35 + this.emergencyBlend * (3.2 + alertPulse * 2.2);
      }

      // Shift both albedo & emissive so ACESFilmic preserves saturated emergency red/amber
      this.shelterHullMat.color.lerpColors(
        this.calmHullColor,
        this.alertHullTint,
        this.emergencyBlend * 0.65
      );
      this.shelterHullMat.emissive.lerpColors(
        this.blackColor,
        this.scratchAlertColor,
        this.emergencyBlend * 0.78
      );
      this.shelterHullMat.emissiveIntensity = this.emergencyBlend * (0.38 + alertPulse * 0.38);

      this.shelterWindowMat.color.lerpColors(
        this.calmWindowColor,
        this.scratchAlertColor,
        this.emergencyBlend
      );
      this.shelterWindowMat.emissive.lerpColors(
        this.calmWindowEmissive,
        this.alertRedColor,
        this.emergencyBlend
      );
      this.shelterWindowMat.emissiveIntensity =
        0.85 + this.emergencyBlend * (0.35 + alertPulse * 0.55);

      this.shelterBeaconMat.color.lerpColors(
        this.calmBeaconColor,
        this.alertRedColor,
        this.emergencyBlend
      );
      this.shelterBeaconMat.emissive.lerpColors(
        this.calmBeaconEmissive,
        this.alertRedColor,
        this.emergencyBlend
      );
      this.shelterBeaconMat.emissiveIntensity =
        1.2 + this.emergencyBlend * (0.4 + alertPulse * 0.8);

      if (!this.activePulse || this.activePulse.moduleId !== 'biodome') {
        this.biodomeGlassMat.color.lerpColors(
          this.calmBioColor,
          this.scratchAlertColor,
          this.emergencyBlend * 0.85
        );
        this.biodomeGlassMat.emissive.lerpColors(
          this.calmBioEmissive,
          this.scratchAlertColor,
          this.emergencyBlend * 0.95
        );
        this.biodomeGlassMat.emissiveIntensity =
          0.2 + this.emergencyBlend * (0.42 + alertPulse * 0.38);
      }

      this.bioLedRingMat.color.lerpColors(
        this.calmLedColor,
        this.alertRedColor,
        this.emergencyBlend
      );
      this.bioLedRingMat.emissive.lerpColors(
        this.calmLedEmissive,
        this.alertRedColor,
        this.emergencyBlend
      );
      this.bioLedRingMat.emissiveIntensity = 0.9 + this.emergencyBlend * (0.3 + alertPulse * 0.55);

      if (!this.activePulse || this.activePulse.moduleId !== 'moxie') {
        this.moxieTankMat.color.lerpColors(
          this.calmMoxieColor,
          this.scratchAlertColor,
          this.emergencyBlend * 0.9
        );
        this.moxieTankMat.emissive.lerpColors(
          this.calmMoxieEmissive,
          this.scratchAlertColor,
          this.emergencyBlend * 0.95
        );
      }
    }

    // 3D Night Cycle & Hazard Showcase (wall-clock paced so SwiftShader runs at exact 3.0s)
    if (this.nightAnim.active) {
      const elapsedSec = (performance.now() - this.nightAnim.startTimeMs) / 1000;
      const t = Math.min(elapsedSec / this.nightAnim.duration, 1);
      // nightFactor peaks at 1.0 around t = 0.5
      const nightFactor = Math.sin(t * Math.PI);
      this.nightBlend = THREE.MathUtils.lerp(this.nightBlend, nightFactor, Math.min(1, dt * 3.5));
      this.atmosphereUniforms.uNight.value = this.nightBlend;
      this.atmosphereUniforms.uSunGlow.value = 0.9 * (1 - this.nightBlend);

      // Sun arc across Jezero sky
      const sunAngle = t * Math.PI;
      this.sunLight.position.set(18 * Math.cos(sunAngle), Math.max(1.5, 22 * (1 - nightFactor * 0.92)), 14);
      this.sunLight.intensity = THREE.MathUtils.lerp(2.45, 0.35, nightFactor);
      this.hemiLight.intensity = THREE.MathUtils.lerp(0.92, 0.28, nightFactor);

      // Sky color transition (day -> sunset -> starry night -> flare aurora -> dawn)
      if (nightFactor < 0.45) {
        this.skyColor.lerpColors(this.daySkyColor, this.sunsetSkyColor, nightFactor / 0.45);
      } else {
        this.skyColor.lerpColors(this.sunsetSkyColor, this.nightSkyColor, (nightFactor - 0.45) / 0.55);
      }
      if (this.nightAnim.hazardType === 'flare' && nightFactor > 0.4) {
        const auroraPulse = 0.35 + 0.25 * Math.sin(this.totalTime * 12);
        this.skyColor.lerp(this.flareSkyColor, auroraPulse);
      }
      (this.scene.background as THREE.Color).copy(this.skyColor);
      this.fog.color.copy(this.skyColor);

      // Stars & warm/red interior habitat lights turn on at night
      this.starsMat.opacity = Math.max(0, (nightFactor - 0.35) * 1.45);
      this.shelterInteriorLight.intensity = 0.85 + nightFactor * 2.8;
      this.shelterWindowMat.emissiveIntensity = 0.85 + nightFactor * 1.9;
      this.shelterBeaconMat.emissiveIntensity = 1.2 + Math.sin(this.totalTime * 10) * 0.9;

      // Solar flare bolts bouncing off Water-Wall shield (or piercing if unshielded!)
      if (this.nightAnim.hazardType === 'flare') {
        for (const bolt of this.flareBolts) {
          if (!bolt.deflected) {
            bolt.mesh.position.y -= dt * bolt.speed;
            const impactY = this.nightAnim.shieldBlockedFlare ? 3.2 : 1.6;
            if (bolt.mesh.position.y <= impactY) {
              if (this.nightAnim.shieldBlockedFlare) {
                bolt.deflected = true;
                bolt.mesh.rotation.z = 0.9;
              } else {
                bolt.mesh.position.y = 8.8;
                this.waterShieldMat.emissive.set('#EF4444');
              }
            }
          } else {
            bolt.mesh.position.y += dt * 7.5;
            bolt.mesh.position.x += Math.cos(bolt.angle) * dt * 6;
            bolt.mesh.position.z += Math.sin(bolt.angle) * dt * 6;
            if (bolt.mesh.position.y > 9.5) {
              bolt.deflected = false;
              bolt.mesh.rotation.set(0, 0, 0);
              bolt.mesh.position.set(
                Math.cos(bolt.angle) * bolt.radius,
                8.5,
                Math.sin(bolt.angle) * bolt.radius
              );
            }
          }
        }
      }

      if (t >= 1 && !this.nightAnim.completed) {
        this.nightAnim.completed = true;
        this.nightAnim.active = false;
        this.flareBoltsGroup.visible = false;
        this.waterShieldMat.emissive.set('#0284C7');
        this.sunLight.position.set(18, 22, 14);
        this.sunLight.intensity = 2.45;
        this.hemiLight.intensity = 0.92;
        this.starsMat.opacity = 0;
        this.shelterInteriorLight.intensity = 0.85;
        this.shelterWindowMat.emissiveIntensity = 0.85;
        (this.scene.background as THREE.Color).copy(this.daySkyColor);
        this.fog.color.copy(this.daySkyColor);
        this.syncVisualState();
        this.nightAnim.onComplete();
      }
    }
  }

  private emitProjectedAnchors(): void {
    const width = this.renderer.domElement.clientWidth || window.innerWidth;
    const height = this.renderer.domElement.clientHeight || window.innerHeight;
    const moduleIds: ModuleId[] = ['solar', 'moxie', 'shelter', 'biodome'];

    const next: ProjectedModuleAnchor[] = moduleIds.map((id) => {
      this.projScratch.copy(this.anchorWorldMap[id]).project(this.camera);
      const visible =
        this.projScratch.z >= -1 &&
        this.projScratch.z <= 1 &&
        this.projScratch.x >= -0.92 &&
        this.projScratch.x <= 0.92 &&
        this.projScratch.y >= -0.88 &&
        this.projScratch.y <= 0.92;

      return {
        id,
        x: Math.round(((this.projScratch.x + 1) * 0.5) * width),
        y: Math.round(((-this.projScratch.y + 1) * 0.5) * height),
        visible,
      };
    });

    const changed =
      this.lastAnchors.length !== next.length ||
      next.some((item, idx) => {
        const prev = this.lastAnchors[idx];
        return (
          prev.visible !== item.visible ||
          Math.abs(prev.x - item.x) >= 1.5 ||
          Math.abs(prev.y - item.y) >= 1.5
        );
      });

    if (changed) {
      this.lastAnchors = next;
      this.callbacks.onAnchorsUpdate(next);
    }
  }

  public dispose(): void {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.swTimerId !== null) clearTimeout(this.swTimerId);

    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('pointerdown', this.handlePointerDown);
      dom.removeEventListener('pointerup', this.handlePointerUp);
      dom.removeEventListener('pointermove', this.handlePointerMove);
      dom.removeEventListener('webglcontextlost', this.handleContextLost);
      dom.remove();
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleEvaKeyDown);
    window.removeEventListener('keyup', this.handleEvaKeyUp);
    window.removeEventListener('blur', this.handleEvaBlur);

    if (this.evaEffect) {
      this.scene?.remove(this.evaEffect.mesh);
      if (this.evaEffect.mesh instanceof THREE.Points || this.evaEffect.mesh instanceof THREE.Mesh) {
        this.evaEffect.mesh.geometry.dispose();
        (this.evaEffect.mesh.material as THREE.Material).dispose();
      }
      this.evaEffect = null;
    }
    this.controls?.dispose();
    this.envRenderTarget?.dispose();
    this.pmremGenerator?.dispose();
    for (const item of this.disposables) {
      item.dispose();
    }
    this.disposables = [];
    this.renderer?.dispose();
  }
}
