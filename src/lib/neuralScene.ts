// "One inference pass" scene. A single particle field morphs through seven
// shapes as the visitor scrolls: starfield → embedding clusters → neural
// network → brain with flowing synapses → loss landscape → robot with an
// energy core and hologram → output orb.

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type NeuralScene = {
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number) => void;
  dispose: () => void;
};

export type NeuralSceneOptions = {
  quality?: "high" | "low";
  hologramLabels?: string[];
};

const STAGES = 7;
const S = { stars: 0, embed: 1, network: 2, brain: 3, land: 4, robot: 5, orb: 6 } as const;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createNeuralScene(canvas: HTMLCanvasElement, opts: NeuralSceneOptions = {}): NeuralScene {
  const quality = opts.quality ?? "high";
  const N = quality === "high" ? 11000 : 6000;
  const rand = rng(42);
  const gauss = () => {
    const u = Math.max(1e-6, rand()), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "high" ? 1.75 : 1.25));
  renderer.setClearColor(0x04050a, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04050a, 0.012);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);

  // ------------------------------------------------------------ shapes
  const shapes: Float32Array[] = Array.from({ length: STAGES }, () => new Float32Array(N * 3));
  const seed = new Float32Array(N);
  const cluster = new Float32Array(N);
  for (let i = 0; i < N; i++) seed[i] = rand();
  const set = (s: number, i: number, x: number, y: number, z: number) => {
    shapes[s][i * 3] = x; shapes[s][i * 3 + 1] = y; shapes[s][i * 3 + 2] = z;
  };

  // 0 · starfield
  for (let i = 0; i < N; i++) {
    const d = new THREE.Vector3(gauss(), gauss(), gauss()).normalize().multiplyScalar(22 + rand() * 40);
    set(S.stars, i, d.x, d.y, d.z);
  }

  // 1 · embedding clusters
  const centers = Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * 5.5 + gauss() * 0.8, (rand() - 0.5) * 6, Math.sin(a) * 5.5 + gauss() * 0.8);
  });
  for (let i = 0; i < N; i++) {
    if (rand() < 0.86) {
      const k = i % 6;
      const c = centers[k];
      const sig = 0.9 + (k % 3) * 0.25;
      set(S.embed, i, c.x + gauss() * sig, c.y + gauss() * sig, c.z + gauss() * sig);
      cluster[i] = k;
    } else {
      set(S.embed, i, (rand() - 0.5) * 18, (rand() - 0.5) * 12, (rand() - 0.5) * 18);
      cluster[i] = 6;
    }
  }

  // 2 · layered neural network
  const layerSizes = [6, 10, 14, 14, 10, 4];
  const nodes: THREE.Vector3[][] = layerSizes.map((n, li) => {
    const x = -10 + (li / (layerSizes.length - 1)) * 20;
    const out: THREE.Vector3[] = [];
    for (let k = 0; k < n; k++) {
      const y = ((k + 0.5) / n - 0.5) * Math.min(13, n * 1.15);
      out.push(new THREE.Vector3(x, y, Math.sin(k * 1.7 + li) * 0.8));
    }
    return out;
  });
  const flatNodes = nodes.flat();
  const edges: [THREE.Vector3, THREE.Vector3][] = [];
  for (let li = 0; li < nodes.length - 1; li++)
    for (const a of nodes[li]) for (const b of nodes[li + 1]) if (rand() < 0.55) edges.push([a, b]);
  for (let i = 0; i < N; i++) {
    if (rand() < 0.5) {
      const n = flatNodes[i % flatNodes.length];
      set(S.network, i, n.x + gauss() * 0.16, n.y + gauss() * 0.16, n.z + gauss() * 0.16);
    } else {
      const [a, b] = edges[Math.floor(rand() * edges.length)];
      const t = rand();
      set(S.network, i, a.x + (b.x - a.x) * t + gauss() * 0.03, a.y + (b.y - a.y) * t + gauss() * 0.03, a.z + (b.z - a.z) * t);
    }
  }

  // 3 · brain (two hemispheres, folds, cerebellum, stem) — long axis on z
  const brainSurface: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const r0 = rand();
    let p: THREE.Vector3;
    if (r0 < 0.07) {
      const t = rand();
      const a = rand() * Math.PI * 2, rr = 0.8 * Math.sqrt(rand());
      p = new THREE.Vector3(Math.cos(a) * rr, -2.6 - t * 3.6, -1.6 - t * 1.4 + Math.sin(a) * rr);
    } else if (r0 < 0.16) {
      const d = new THREE.Vector3(gauss(), gauss(), gauss()).normalize();
      p = new THREE.Vector3(d.x * 3.3, -2.4 + d.y * 1.5, -4.6 + d.z * 2.1);
      p.y += Math.sin(d.z * 18) * 0.12;
    } else {
      const d = new THREE.Vector3(gauss(), gauss(), gauss()).normalize();
      const fold = 1 + 0.07 * Math.sin(d.y * 15 + d.z * 7) * Math.sin(d.z * 13 - d.x * 5);
      const depth = 0.82 + 0.18 * Math.sqrt(rand());
      const s = d.x >= 0 ? 1 : -1;
      p = new THREE.Vector3(d.x * 5.8 * fold * depth + s * 0.4, d.y * 4.7 * fold * depth, d.z * 7.4 * fold * depth);
      if (p.y < -1.9) p.y = -1.9 + (p.y + 1.9) * 0.35;
      if (depth > 0.97 && brainSurface.length < 4000) brainSurface.push(p.clone());
    }
    set(S.brain, i, p.x, p.y + 0.6, p.z);
  }

  // 4 · loss landscape
  const height = (x: number, z: number) =>
    3.4 - 3.6 * Math.exp(-((x - 2.5) ** 2 + (z - 1.5) ** 2) / 14) - 1.5 * Math.exp(-((x + 5) ** 2 + (z + 4) ** 2) / 5)
    + 0.7 * Math.sin(x * 0.55) * Math.cos(z * 0.6) + 0.04 * (x * x + z * z) * 0.25;
  const G = Math.floor(Math.sqrt(N * 0.9));
  for (let i = 0; i < N; i++) {
    const gi = i % (G * G);
    const gx = gi % G, gz = Math.floor(gi / G);
    let x = -12 + (gx / (G - 1)) * 24, z = -12 + (gz / (G - 1)) * 24;
    if (i >= G * G) { x += gauss() * 0.3; z += gauss() * 0.3; }
    set(S.land, i, x, height(x, z), z);
  }
  // gradient-descent path (momentum) from a high corner to the basin
  const path: THREE.Vector3[] = [];
  {
    let x = -9.5, z = 8.5, vx = 0, vz = 0;
    for (let k = 0; k < 260; k++) {
      const e = 0.01;
      const gx = (height(x + e, z) - height(x - e, z)) / (2 * e);
      const gz = (height(x, z + e) - height(x, z - e)) / (2 * e);
      vx = vx * 0.86 - gx * 0.06; vz = vz * 0.86 - gz * 0.06;
      x += vx; z += vz;
      path.push(new THREE.Vector3(x, height(x, z) + 0.35, z));
    }
  }

  // 5 · robot bust (surface-sampled), leaving room for the energy core
  const CORE = new THREE.Vector3(0, 2.4, 1.55);
  {
    const parts: THREE.BufferGeometry[] = [];
    const add = (g: THREE.BufferGeometry, m: THREE.Matrix4) => { g.applyMatrix4(m); parts.push(g.toNonIndexed()); };
    const M = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rz = 0, rx = 0) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(sx, sy, sz));
    add(new THREE.SphereGeometry(1, 32, 24), M(0, 7.1, 0.1, 1.45, 1.75, 1.55));                  // head
    add(new THREE.BoxGeometry(2.0, 0.35, 0.2), M(0, 7.25, 1.55));                                  // visor band
    add(new THREE.CylinderGeometry(0.55, 0.7, 1.2, 16), M(0, 5.3, 0));                              // neck
    add(new THREE.CylinderGeometry(3.5, 2.4, 4.8, 10, 1), M(0, 2.4, 0, 1, 1, 0.48));                // chest
    add(new THREE.CylinderGeometry(2.3, 2.0, 2.2, 10, 1), M(0, -1.1, 0, 1, 1, 0.5));                // abdomen
    add(new THREE.SphereGeometry(1.35, 20, 16), M(-4.15, 4.0, 0));                                  // shoulders
    add(new THREE.SphereGeometry(1.35, 20, 16), M(4.15, 4.0, 0));
    add(new THREE.CylinderGeometry(0.8, 0.7, 3.8, 14), M(-4.7, 1.6, 0, 1, 1, 1, -0.12));            // arms
    add(new THREE.CylinderGeometry(0.8, 0.7, 3.8, 14), M(4.7, 1.6, 0, 1, 1, 1, 0.12));
    add(new THREE.TorusGeometry(1.5, 0.12, 8, 40), M(CORE.x, CORE.y, CORE.z - 0.05));               // core housing
    const merged = mergeGeometries(parts)!;
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(merged)).build();
    const p = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      let tries = 0;
      do { sampler.sample(p); tries++; } while (tries < 5 && p.distanceTo(CORE) < 1.25);
      set(S.robot, i, p.x, p.y - 1.4, p.z);
    }
    merged.dispose();
    parts.forEach((g) => g.dispose());
  }

  // 6 · output orb with three tilted rings
  {
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      if (i % 10 < 7) {
        const k = i * (10 / 7);
        const y = 1 - (k / N) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        set(S.orb, i, Math.cos(th) * r * 4.6, y * 4.6, Math.sin(th) * r * 4.6);
      } else {
        const ring = i % 3, a = rand() * Math.PI * 2, R = 6.4 + ring * 1.1;
        const v = new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R);
        v.applyEuler(new THREE.Euler(0.35 + ring * 0.5, ring * 0.9, 0.2));
        set(S.orb, i, v.x, v.y, v.z);
      }
    }
  }

  // ------------------------------------------------------------ particle field
  const geo = new THREE.BufferGeometry();
  shapes.forEach((arr, k) => geo.setAttribute(k === 0 ? "position" : `p${k}`, new THREE.BufferAttribute(arr, 3)));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.setAttribute("aCluster", new THREE.BufferAttribute(cluster, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);

  const uniforms = {
    uW: { value: new Array(STAGES).fill(0) as number[] },
    uOff: { value: Array.from({ length: STAGES }, () => new THREE.Vector3()) },
    uTime: { value: 0 },
    uSize: { value: 1 },
    uPixel: { value: renderer.getPixelRatio() },
  };
  uniforms.uW.value[0] = 1;

  const fieldMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uW[${STAGES}];
      uniform vec3 uOff[${STAGES}];
      uniform float uTime, uSize, uPixel;
      attribute vec3 p1; attribute vec3 p2; attribute vec3 p3; attribute vec3 p4; attribute vec3 p5; attribute vec3 p6;
      attribute float aSeed; attribute float aCluster;
      varying vec3 vColor; varying float vAlpha;
      vec3 pal(float k){
        if (k < 0.5) return vec3(0.33,0.93,1.0);
        if (k < 1.5) return vec3(0.62,0.42,1.0);
        if (k < 2.5) return vec3(1.0,0.38,0.78);
        if (k < 3.5) return vec3(1.0,0.72,0.32);
        if (k < 4.5) return vec3(0.38,1.0,0.66);
        if (k < 5.5) return vec3(0.38,0.58,1.0);
        return vec3(0.55,0.6,0.75);
      }
      void main(){
        float t = uTime;
        float wob = sin(t*0.7 + aSeed*31.0);
        vec3 s0 = position + uOff[0];
        vec3 s1 = p1 + uOff[1] + vec3(sin(t*0.3+aSeed*20.0), cos(t*0.25+aSeed*17.0), sin(t*0.2+aSeed*9.0))*0.25;
        vec3 s2 = p2 + uOff[2];
        vec3 s3 = p3 * (1.0 + 0.012*sin(t*1.4 + p3.z*0.6)) + uOff[3];
        vec3 s4 = p4 + uOff[4] + vec3(0.0, 0.08*sin(t*1.2 + p4.x*0.8 + p4.z*0.6), 0.0);
        vec3 s5 = p5 + uOff[5] + vec3(0.0, 0.06*wob, 0.0);
        float br = 1.0 + 0.04*sin(t*2.0);
        vec3 s6 = p6 * br + uOff[6];
        vec3 pos = s0*uW[0] + s1*uW[1] + s2*uW[2] + s3*uW[3] + s4*uW[4] + s5*uW[5] + s6*uW[6];

        vec3 cyan = vec3(0.33,0.93,1.0), violet = vec3(0.6,0.4,1.0), pink = vec3(1.0,0.42,0.85);
        vec3 c0 = mix(vec3(0.6,0.7,1.0), cyan, aSeed) * 0.55;
        vec3 c1 = pal(aCluster);
        vec3 c2 = mix(cyan, violet, smoothstep(-10.0, 10.0, p2.x));
        vec3 c3 = mix(violet, pink, aSeed) * 0.9;
        vec3 c4 = mix(cyan*1.3, violet*0.7, smoothstep(-0.5, 4.5, p4.y));
        vec3 c5 = mix(cyan, vec3(0.8,0.95,1.0), aSeed*0.6);
        vec3 c6 = mix(cyan, vec3(1.0), 0.25 + 0.25*sin(t*1.5 + aSeed*6.0));
        vColor = c0*uW[0] + c1*uW[1] + c2*uW[2] + c3*uW[3] + c4*uW[4] + c5*uW[5] + c6*uW[6];

        float twinkle = 0.75 + 0.25*sin(t*2.0 + aSeed*50.0);
        vAlpha = twinkle * (0.55 + 0.45*aSeed);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float sz = (0.6 + aSeed*0.9) * uSize;
        gl_PointSize = sz * uPixel * (130.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vAlpha;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a = a*a;
        gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
      }`,
  });
  const field = new THREE.Points(geo, fieldMat);
  field.frustumCulled = false;
  scene.add(field);

  // ------------------------------------------------------------ travelling pulses (network + brain synapses)
  const makePulses = (pairs: [THREE.Vector3, THREE.Vector3][], color: THREE.Color, trail: number, speedMin: number, speedMax: number, size: number) => {
    const count = pairs.length * trail;
    const a = new Float32Array(count * 3), b = new Float32Array(count * 3), off = new Float32Array(count), spd = new Float32Array(count), tr = new Float32Array(count);
    pairs.forEach(([p, q], k) => {
      const o = rand(), s = speedMin + rand() * (speedMax - speedMin);
      for (let j = 0; j < trail; j++) {
        const i = k * trail + j;
        a.set([p.x, p.y, p.z], i * 3); b.set([q.x, q.y, q.z], i * 3);
        off[i] = o - j * 0.012; spd[i] = s; tr[i] = j / trail;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    g.setAttribute("aEnd", new THREE.BufferAttribute(b, 3));
    g.setAttribute("aOff", new THREE.BufferAttribute(off, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(spd, 1));
    g.setAttribute("aTrail", new THREE.BufferAttribute(tr, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: uniforms.uTime, uOpacity: { value: 0 }, uColor: { value: color }, uSize: { value: size }, uPixel: uniforms.uPixel },
      vertexShader: /* glsl */ `
        uniform float uTime, uSize, uPixel; attribute vec3 aEnd; attribute float aOff, aSpeed, aTrail;
        varying float vFade;
        void main(){
          float f = fract(aOff + uTime*aSpeed);
          vec3 p = mix(position, aEnd, f);
          vFade = (1.0 - aTrail) * smoothstep(0.0, 0.08, f) * smoothstep(1.0, 0.9, f);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (1.0 - aTrail*0.6) * uPixel * (110.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity; varying float vFade;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d); a *= a;
          gl_FragColor = vec4(uColor * a * vFade * uOpacity * 2.2, a * vFade * uOpacity);
        }`,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return { pts, mat: m };
  };

  const netGroup = new THREE.Group();
  scene.add(netGroup);
  const netPulses = makePulses(edges.filter(() => rand() < 0.7), new THREE.Color(0.5, 0.95, 1.0), 5, 0.18, 0.4, 1.6);
  netGroup.add(netPulses.pts);
  const lineGeo = new THREE.BufferGeometry().setFromPoints(edges.flatMap(([a, b]) => [a, b]));
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.35, 0.6, 1.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  netGroup.add(new THREE.LineSegments(lineGeo, lineMat));

  const brainGroup = new THREE.Group();
  scene.add(brainGroup);
  const synapses: [THREE.Vector3, THREE.Vector3][] = [];
  for (let k = 0; k < (quality === "high" ? 520 : 260) && brainSurface.length > 10; k++) {
    const a = brainSurface[Math.floor(rand() * brainSurface.length)];
    let b = brainSurface[Math.floor(rand() * brainSurface.length)];
    for (let t = 0; t < 30 && (b.distanceTo(a) > 4.5 || b.distanceTo(a) < 1.2); t++) b = brainSurface[Math.floor(rand() * brainSurface.length)];
    synapses.push([a.clone().setY(a.y + 0.6), b.clone().setY(b.y + 0.6)]);
  }
  const brainPulses = makePulses(synapses, new THREE.Color(0.45, 0.95, 1.0), 7, 0.25, 0.55, 1.5);
  brainGroup.add(brainPulses.pts);

  // ------------------------------------------------------------ loss landscape: descending ball + trail
  const landGroup = new THREE.Group();
  scene.add(landGroup);
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(150,240,255,0.8)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 0.8), toneMapped: false, transparent: true }));
  const ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1, 0.75, 0.35), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  ballGlow.scale.setScalar(3);
  ball.add(ballGlow);
  landGroup.add(ball);
  const trailGeo = new THREE.BufferGeometry().setFromPoints(path);
  const trailMat = new THREE.LineBasicMaterial({ color: new THREE.Color(1, 0.72, 0.3), transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const trail = new THREE.Line(trailGeo, trailMat);
  landGroup.add(trail);

  // ------------------------------------------------------------ robot: energy core + hologram
  const robotGroup = new THREE.Group();
  scene.add(robotGroup);
  const coreGroup = new THREE.Group();
  coreGroup.position.set(CORE.x, CORE.y - 1.4, CORE.z + 0.1);
  robotGroup.add(coreGroup);
  const hot = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false, transparent: true });
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 6), hot(1.6, 3.2, 4));
  hex.rotation.x = Math.PI / 2;
  const hexFrame = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 6, 6), hot(0.4, 1.2, 2));
  const coreHeart = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), hot(5, 5, 5));
  coreHeart.position.z = 0.2;
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.4, 0.95, 1), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  coreGlow.scale.setScalar(5);
  const rings = [1.05, 1.32].map((r, k) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 64, Math.PI * 1.6), hot(0.5, 1.6 + k * 0.4, 2.6));
    coreGroup.add(m);
    return m;
  });
  coreGroup.add(hex, hexFrame, coreHeart, coreGlow);

  // hologram cone rising from the core
  const holoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: uniforms.uTime, uOpacity: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime, uOpacity;
      void main(){
        float fade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));
        float scan = 0.65 + 0.35*sin(vUv.y*120.0 - uTime*6.0);
        vec3 c = vec3(0.35, 0.9, 1.0);
        gl_FragColor = vec4(c * fade * scan * 0.35 * uOpacity, fade * 0.35 * uOpacity);
      }`,
  });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 0.45, 7.5, 48, 1, true), holoMat);
  cone.position.set(0, CORE.y - 1.4 + 3.6, CORE.z + 2.6);
  cone.rotation.x = 0.3;
  robotGroup.add(cone);

  // hologram panels with project titles
  const panelMats: THREE.MeshBasicMaterial[] = [];
  (opts.hologramLabels ?? []).forEach((label, k, all) => {
    const tex = (() => {
      const c = document.createElement("canvas"); c.width = 512; c.height = 160;
      const g = c.getContext("2d")!;
      g.fillStyle = "rgba(40,180,255,0.10)"; g.fillRect(0, 0, 512, 160);
      g.strokeStyle = "rgba(110,235,255,0.9)"; g.lineWidth = 3; g.strokeRect(4, 4, 504, 152);
      g.fillStyle = "rgba(120,240,255,0.95)"; g.font = `500 22px "JetBrains Mono", monospace`;
      g.fillText(`PROJECT_${String(k + 1).padStart(2, "0")}`, 24, 46);
      g.fillStyle = "#eafcff"; g.font = `600 40px "Chakra Petch", "Arial", sans-serif`;
      g.fillText(label, 24, 110, 470);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    panelMats.push(m);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.44), m);
    const a = ((k + 0.5) / all.length - 0.5) * 2.4;
    const row = k % 2;
    plane.position.set(Math.sin(a) * 8.2, CORE.y + 4.2 + row * 1.9, CORE.z + 3 + Math.cos(a) * 1.5 - 1.5);
    plane.lookAt(plane.position.x * 0.2, plane.position.y, 30);
    plane.userData.base = plane.position.y;
    plane.userData.k = k;
    robotGroup.add(plane);
  });

  // ------------------------------------------------------------ post
  let composer: EffectComposer | null = null, bloom: UnrealBloomPass | null = null;
  if (quality === "high") {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.2);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  // ------------------------------------------------------------ layout & camera per stage
  const offsets = (wide: boolean) => [
    [0, 0, 0], [wide ? 6 : 0, wide ? 0 : 3, 0], [0, wide ? 1 : 4, 0], [wide ? -6.5 : 0, wide ? 0 : 3, 0],
    [wide ? 7 : 0, wide ? -2 : 1, 0], [0, 0, 0], [0, wide ? 1 : 3, 0],
  ];
  // camera position relative to the stage centre, and fov
  const cams = [
    { pos: [0, 0, 34], fov: 55 },
    { pos: [3, 3, 23], fov: 50 },
    { pos: [5, 2, 24], fov: 50 },
    { pos: [21, 4, 6], fov: 46 },
    { pos: [-3, 15, 25], fov: 50 },
    { pos: [0, 3, 20], fov: 50 },
    { pos: [0, 2, 21], fov: 50 },
  ];
  let wide = true;
  const applyOffsets = () => {
    offsets(wide).forEach((o, k) => uniforms.uOff.value[k].set(o[0], o[1], o[2]));
    netGroup.position.copy(uniforms.uOff.value[S.network]);
    brainGroup.position.copy(uniforms.uOff.value[S.brain]);
    landGroup.position.copy(uniforms.uOff.value[S.land]);
    robotGroup.position.copy(uniforms.uOff.value[S.robot]);
  };

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h); bloom?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    wide = w / h > 1.05;
    uniforms.uSize.value = wide ? 1 : 0.85;
    applyOffsets();
  };
  resize();
  window.addEventListener("resize", resize);

  // ------------------------------------------------------------ loop
  let target = 0, current = 0, pointerX = 0, pointerY = 0, px = 0, py = 0;
  let raf = 0, last = performance.now(), time = 0;
  const camPos = new THREE.Vector3(0, 0, 34), camLook = new THREE.Vector3();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; time += dt;
    uniforms.uTime.value = time;

    current += (target - current) * (1 - Math.exp(-dt * 4));
    const f = current * (STAGES - 1);
    const i0 = Math.min(STAGES - 2, Math.floor(f));
    const k = smooth(0.12, 0.88, f - i0);
    const w = uniforms.uW.value;
    for (let s = 0; s < STAGES; s++) w[s] = 0;
    w[i0] = 1 - k; w[i0 + 1] = k;

    // extras fade with their stage weight
    lineMat.opacity = w[S.network] * 0.16;
    netPulses.mat.uniforms.uOpacity.value = w[S.network];
    brainPulses.mat.uniforms.uOpacity.value = w[S.brain];
    const wl = w[S.land], wr = w[S.robot];
    landGroup.visible = wl > 0.01;
    (ball.material as THREE.MeshBasicMaterial).opacity = wl;
    ballGlow.material.opacity = wl;
    trailMat.opacity = wl * 0.85;
    robotGroup.visible = wr > 0.01;
    coreGroup.scale.setScalar(Math.max(0.001, wr));
    holoMat.uniforms.uOpacity.value = smooth(0.5, 1, wr);
    panelMats.forEach((m) => (m.opacity = smooth(0.6, 1, wr) * 0.95));
    robotGroup.children.forEach((c) => {
      if (c.userData.base !== undefined) c.position.y = c.userData.base + Math.sin(time * 1.2 + c.userData.k) * 0.12;
    });

    // gradient descent follows scroll through the fine-tuning stage
    const landLocal = Math.min(1, Math.max(0, (current - (S.land - 0.55) / (STAGES - 1)) / (1.0 / (STAGES - 1))));
    const pi = Math.min(path.length - 1, Math.floor(landLocal * (path.length - 1)));
    ball.position.copy(path[pi]);
    trailGeo.setDrawRange(0, pi + 1);

    // core animation
    hex.rotation.y += dt * 0.6;
    rings[0].rotation.set(time * 0.9, time * 0.4, 0);
    rings[1].rotation.set(-time * 0.5, time * 0.8, time * 0.3);
    coreGlow.material.opacity = 0.7 + 0.3 * Math.sin(time * 3);

    netGroup.rotation.y = Math.sin(time * 0.15) * 0.12;
    brainGroup.rotation.y = 0;

    // camera: blend the two neighbouring shots, plus gentle orbit + pointer parallax
    const c0 = cams[i0], c1 = cams[i0 + 1];
    tmpA.fromArray(c0.pos).lerp(tmpB.fromArray(c1.pos), k);
    const look = uniforms.uOff.value[i0].clone().lerp(uniforms.uOff.value[i0 + 1], k);
    if (!wide) tmpA.multiplyScalar(1.45);
    px += (pointerX - px) * dt * 2; py += (pointerY - py) * dt * 2;
    const orbit = Math.sin(time * 0.12) * 0.12 + px * 0.12;
    tmpA.applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit);
    tmpA.y += py * 1.2;
    const desired = look.clone().add(tmpA);
    const lk = 1 - Math.exp(-dt * 4);
    camPos.lerp(desired, lk); camLook.lerp(look, lk);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    const fov = c0.fov + (c1.fov - c0.fov) * k;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    if (composer) composer.render(); else renderer.render(scene, camera);
  };
  tick();

  return {
    setProgress: (p) => { target = Math.min(1, Math.max(0, p)); },
    setPointer: (x, y) => { pointerX = x; pointerY = y; },
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((mm) => {
          Object.values(mm).forEach((v) => (v as THREE.Texture)?.isTexture && (v as THREE.Texture).dispose());
          mm.dispose();
        });
      });
      glowTex.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
