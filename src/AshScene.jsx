import React, { useEffect, useRef } from "react";

// A curtain of light rises from the floor. Bills ride the heat up through it,
// catch, and burn into ash before they reach the text. Pulled cards drift behind.

const N_BILLS = 24;
const N_CARDS = 12;
const N_ASH = 700;

const CURTAIN_VERT = `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const CURTAIN_FRAG = `varying vec2 vUv;
uniform float uTime; uniform float uRise; uniform float uAspect; uniform float uShift;
float hash(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float n1(float x){ float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
void main(){
  float x = (vUv.x - 0.5 + uShift) * uAspect;
  float y = vUv.y;
  float t = uTime;
  float s = n1(x * 13.0 + t * 0.10) * 0.45 + n1(x * 35.0 - t * 0.17 + 3.1) * 0.33 + n1(x * 88.0 + t * 0.29 + 7.7) * 0.22;
  s = pow(s, 2.3) * 2.3;
  float shimmer = 0.72 + 0.28 * n1(x * 21.0 + y * 1.4 - t * 0.4);
  float horiz = exp(-x * x * 0.75) * 0.88 + 0.12;
  float top = 0.9 * uRise;
  float vert = pow(clamp(1.0 - y / max(top, 0.001), 0.0, 1.0), 1.7);
  float base = horiz * vert;
  float flick = 0.92 + 0.08 * sin(t * 7.0 + x * 3.0) * sin(t * 3.3);
  float c = (base * (0.14 + s * shimmer) + pow(base, 3.0) * 0.4) * flick;
  // Firelight ramp: soot, deep red, ember, white-hot core
  vec3 col = mix(vec3(0.0), vec3(0.42, 0.07, 0.02), smoothstep(0.0, 0.22, c));
  col = mix(col, vec3(1.0, 0.42, 0.12), smoothstep(0.18, 0.62, c));
  col = mix(col, vec3(1.0, 0.86, 0.64), smoothstep(0.62, 1.15, c));
  gl_FragColor = vec4(col, 1.0);
}`;

const BILL_VERT = `attribute float aBurn;
varying vec2 vUv; varying float vBurn; varying vec3 vW; varying float vSeed;
void main(){
  vUv = uv; vBurn = aBurn; vSeed = fract(float(gl_InstanceID) * 0.6180339);
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const BILL_FRAG = `uniform sampler2D uMap;
varying vec2 vUv; varying float vBurn; varying vec3 vW; varying float vSeed;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){ return 0.6 * noise(p) + 0.3 * noise(p * 2.1 + 3.7) + 0.1 * noise(p * 4.3 + 1.3); }
void main(){
  vec2 q = vUv + vSeed * 7.0;
  float n = fbm(q * 4.0);
  float d = n - (vBurn * 1.25 - 0.12);
  if (d < 0.0) discard;
  float rim = smoothstep(0.12, 0.0, d) * step(0.001, vBurn);
  float soot = smoothstep(0.35, 0.0, d) * step(0.001, vBurn);
  vec3 paper = texture2D(uMap, vUv).rgb;
  float light = 0.3 + 0.9 * exp(-vW.x * vW.x / 40.0) * smoothstep(5.5, -4.0, vW.y);
  vec3 col = paper * light * vec3(1.0, 0.8, 0.62);
  col = mix(col, vec3(0.03), soot * 0.85);
  col += vec3(1.0, 0.55, 0.16) * rim * 1.9;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const ASH_VERT = `attribute float aAge; attribute float aSize; uniform float uPx; varying float vAge;
void main(){
  vAge = aAge;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPx / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const ASH_FRAG = `varying float vAge;
void main(){
  if (vAge >= 1.0) discard;
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float g = exp(-d * d * 4.0);
  float hot = 1.0 - smoothstep(0.0, 0.35, vAge);
  float a = g * smoothstep(0.0, 0.06, vAge) * (1.0 - smoothstep(0.45, 1.0, vAge));
  vec3 ember = vec3(1.0, 0.5, 0.15) * 1.7;
  vec3 cinder = vec3(0.62, 0.57, 0.52);
  gl_FragColor = vec4(mix(cinder, ember, hot), a);
}`;

function canvasTexture(T, w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"));
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function drawBill(g) {
  g.fillStyle = "#d8d8d2";
  g.fillRect(0, 0, 512, 224);
  g.strokeStyle = "#2c2c2a";
  g.lineWidth = 9;
  g.strokeRect(10, 10, 492, 204);
  g.lineWidth = 2.5;
  g.strokeRect(26, 26, 460, 172);
  g.globalAlpha = 0.25;
  for (let i = 0; i < 16; i++) {
    for (const cx of [86, 426]) {
      g.beginPath();
      g.arc(cx, 112, 22 + i * 5, 0, 6.3);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  g.fillStyle = "#e8e8e2";
  g.beginPath();
  g.ellipse(256, 112, 74, 74, 0, 0, 6.3);
  g.fill();
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = "#2c2c2a";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "bold 70px serif";
  g.fillText("20", 256, 116);
  g.font = "bold 34px serif";
  g.fillText("20", 66, 54);
  g.fillText("20", 446, 172);
}
function drawCardFace(g) {
  g.fillStyle = "#e9e9e6";
  g.fillRect(0, 0, 256, 358);
  g.strokeStyle = "#1c1c1c";
  g.lineWidth = 10;
  g.strokeRect(5, 5, 246, 348);
  g.fillStyle = "#a9a9a4";
  g.fillRect(24, 58, 208, 156);
  g.fillStyle = "#1c1c1c";
  g.fillRect(24, 26, 120, 18);
  for (let i = 0; i < 4; i++) g.fillRect(24, 240 + i * 24, 208 - i * 28, 8);
  g.beginPath();
  g.arc(128, 136, 40, 0, 6.3);
  g.fillStyle = "#7c7c78";
  g.fill();
}
function drawCardBack(g) {
  g.fillStyle = "#1e1e1e";
  g.fillRect(0, 0, 256, 358);
  g.strokeStyle = "#d4d4d0";
  g.lineWidth = 10;
  g.strokeRect(5, 5, 246, 348);
  g.strokeStyle = "#6a6a66";
  g.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(128, 179, 28 + i * 18, 0, 6.3);
    g.stroke();
  }
}

export default function AshScene() {
  const host = useRef(null);

  useEffect(() => {
    let disposed = false;
    let stop = () => {};
    import("three").then((T) => {
      if (disposed) return;
      let renderer;
      try {
        renderer = new T.WebGLRenderer({
          antialias: true,
          powerPreference: "high-performance",
        });
      } catch {
        return; // The CSS ground behind the hero still shows.
      }
      stop = build(T, renderer);
    });
    return () => {
      disposed = true;
      stop();
    };

    function build(T, renderer) {
      const el = host.current;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      let pr = Math.min(window.devicePixelRatio, 1.5);
      renderer.setPixelRatio(pr);
      renderer.setClearColor(0x0c0907, 1);
      el.appendChild(renderer.domElement);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(40, 1, 0.5, 100);
      camera.position.set(0, 0, 14);
      const disposables = [];
      const keep = (o) => (disposables.push(o), o);

      // Light curtain, drawn behind everything
      const curtainU = {
        uTime: { value: 0 },
        uRise: { value: reduced ? 1 : 0 },
        uAspect: { value: 1 },
        uShift: { value: 0 },
      };
      const curtain = new T.Mesh(
        keep(new T.PlaneGeometry(2, 2)),
        keep(
          new T.ShaderMaterial({
            vertexShader: CURTAIN_VERT,
            fragmentShader: CURTAIN_FRAG,
            uniforms: curtainU,
            depthTest: false,
            depthWrite: false,
          }),
        ),
      );
      curtain.frustumCulled = false;
      curtain.renderOrder = -1;
      scene.add(curtain);

      // Cards in the dark
      const cardGeo = keep(new T.BoxGeometry(0.63, 0.88, 0.01));
      const edge = keep(new T.MeshBasicMaterial({ color: 0x5a4a40 }));
      const face = keep(
        new T.MeshBasicMaterial({
          map: keep(canvasTexture(T, 256, 358, drawCardFace)),
          color: 0x6e5a4c,
        }),
      );
      const back = keep(
        new T.MeshBasicMaterial({
          map: keep(canvasTexture(T, 256, 358, drawCardBack)),
          color: 0x6e5a4c,
        }),
      );
      const cards = new T.InstancedMesh(
        cardGeo,
        [edge, edge, edge, edge, face, back],
        N_CARDS,
      );
      cards.frustumCulled = false;
      scene.add(cards);

      // Bills that burn
      const billMap = keep(canvasTexture(T, 512, 224, drawBill));
      const billGeo = keep(new T.PlaneGeometry(1, 0.44));
      const burn = new Float32Array(N_BILLS);
      billGeo.setAttribute(
        "aBurn",
        new T.InstancedBufferAttribute(burn, 1).setUsage(T.DynamicDrawUsage),
      );
      const bills = new T.InstancedMesh(
        billGeo,
        keep(
          new T.ShaderMaterial({
            vertexShader: BILL_VERT,
            fragmentShader: BILL_FRAG,
            uniforms: { uMap: { value: billMap } },
            side: T.DoubleSide,
          }),
        ),
        N_BILLS,
      );
      bills.frustumCulled = false;
      scene.add(bills);

      // Ash and sparks
      const ashGeo = keep(new T.BufferGeometry());
      const aPos = new Float32Array(N_ASH * 3);
      const aVel = new Float32Array(N_ASH * 3);
      const aAge = new Float32Array(N_ASH).fill(1);
      const aLife = new Float32Array(N_ASH).fill(1);
      const aSize = new Float32Array(N_ASH);
      ashGeo.setAttribute(
        "position",
        new T.BufferAttribute(aPos, 3).setUsage(T.DynamicDrawUsage),
      );
      ashGeo.setAttribute(
        "aAge",
        new T.BufferAttribute(aAge, 1).setUsage(T.DynamicDrawUsage),
      );
      ashGeo.setAttribute(
        "aSize",
        new T.BufferAttribute(aSize, 1).setUsage(T.DynamicDrawUsage),
      );
      const ashPx = { value: 600 };
      const ash = new T.Points(
        ashGeo,
        keep(
          new T.ShaderMaterial({
            vertexShader: ASH_VERT,
            fragmentShader: ASH_FRAG,
            uniforms: { uPx: ashPx },
            transparent: true,
            depthWrite: false,
            blending: T.AdditiveBlending,
          }),
        ),
      );
      ash.frustumCulled = false;
      scene.add(ash);

      let halfH = 5;
      let halfW = 9;
      function resize() {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (!w || !h) return;
        renderer.setPixelRatio(pr);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        curtainU.uAspect.value = w / h;
        halfH = 14 * Math.tan(T.MathUtils.degToRad(20));
        halfW = halfH * camera.aspect;
        ashPx.value = (h * pr) / (2 * Math.tan(T.MathUtils.degToRad(20)));
      }
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      const dummy = new T.Object3D();
      const rand = Math.random;
      // Keep bills out of the middle third where the headline sits.
      const sideX = () => {
        const edgeMin = Math.min(1.4, halfW * 0.2);
        const x = edgeMin + rand() * Math.max(halfW - edgeMin, 0.5);
        return rand() < 0.5 ? -x : x;
      };
      const bs = Array.from({ length: N_BILLS }, (_, i) => ({
        seed: rand() * 100,
        wait: i * 0.35 + rand() * 0.6,
        live: false,
      }));
      function spawnBill(b) {
        b.x = sideX();
        b.y = -halfH - 0.8 - rand() * 1.2;
        b.z = -2.5 + rand() * 4.5;
        b.vy = 0.55 + rand() * 0.5;
        b.vx = (rand() - 0.5) * 0.25;
        b.spin = (rand() - 0.5) * 1.2;
        b.ry = rand() * 6.3;
        b.size = (0.85 + rand() * 0.5) * (halfW < 4 ? 0.7 : 1);
        b.catchY =
          halfW < 4
            ? -halfH * 0.85 + rand() * halfH * 0.25
            : -halfH * 0.6 + rand() * halfH * 0.5;
        b.burn = 0;
        b.live = true;
      }
      const cs = Array.from({ length: N_CARDS }, () => ({
        seed: rand() * 100,
      }));
      function spawnCard(c, anywhere) {
        c.x = sideX() * (0.9 + rand() * 0.3);
        c.y = anywhere ? (rand() * 2 - 1) * halfH : -halfH - 1 - rand() * 2;
        c.z = -9 + rand() * 4;
        c.vy = 0.12 + rand() * 0.16;
        c.rx = rand() * 6.3;
        c.ry = rand() * 6.3;
        c.wx = (rand() - 0.5) * 0.6;
        c.wy = (rand() - 0.5) * 0.8;
      }
      cs.forEach((c) => spawnCard(c, true));
      let ashCursor = 0;
      function emitAsh(x, y, z, count) {
        for (let k = 0; k < count; k++) {
          const i = ashCursor;
          ashCursor = (ashCursor + 1) % N_ASH;
          const j = i * 3;
          aPos[j] = x + (rand() - 0.5) * 0.8;
          aPos[j + 1] = y + (rand() - 0.5) * 0.3;
          aPos[j + 2] = z + (rand() - 0.5) * 0.3;
          aVel[j] = (rand() - 0.5) * 0.5;
          aVel[j + 1] = 0.5 + rand() * 1.4;
          aVel[j + 2] = (rand() - 0.5) * 0.4;
          aAge[i] = 0;
          aLife[i] = 1.8 + rand() * 2.6;
          aSize[i] = 0.025 + rand() * 0.06;
        }
      }

      function simulate(dt, t, clock) {
        // Bills
        bs.forEach((b, i) => {
          if (!b.live) {
            b.wait -= dt;
            const cap = halfW < 4 ? 9 : N_BILLS;
            if (b.wait <= 0 && t > 1.1 && i < cap) spawnBill(b);
            if (!b.live) {
              burn[i] = 1;
              dummy.position.set(0, -99, 0);
              dummy.scale.setScalar(0.001);
              dummy.updateMatrix();
              bills.setMatrixAt(i, dummy.matrix);
              return;
            }
          }
          b.x += (b.vx + Math.sin(clock * 1.1 + b.seed) * 0.35) * dt;
          b.y += b.vy * dt * (b.burn > 0 ? 0.6 : 1);
          b.ry += b.spin * dt;
          if (b.burn === 0 && b.y > b.catchY) b.burn = 0.001;
          if (b.burn > 0) {
            b.burn += dt / 2.1;
            if (rand() < dt * 60) emitAsh(b.x, b.y, b.z, 1);
          }
          if (b.burn >= 1 || b.y > halfH + 1.5) {
            b.live = false;
            b.wait = 0.4 + rand() * 1.8;
          }
          burn[i] = Math.min(b.burn, 1);
          dummy.position.set(b.x, b.y, b.z);
          dummy.rotation.set(
            Math.sin(clock * 0.9 + b.seed) * 0.7,
            b.ry,
            Math.sin(clock * 0.7 + b.seed * 2) * 0.5,
          );
          dummy.scale.setScalar(b.size);
          dummy.updateMatrix();
          bills.setMatrixAt(i, dummy.matrix);
        });
        bills.instanceMatrix.needsUpdate = true;
        billGeo.attributes.aBurn.needsUpdate = true;

        // Cards
        cs.forEach((c, i) => {
          c.y += c.vy * dt;
          c.rx += c.wx * dt;
          c.ry += c.wy * dt;
          if (c.y > halfH + 2.5) spawnCard(c, false);
          dummy.position.set(
            c.x + Math.sin(clock * 0.4 + c.seed) * 0.3,
            c.y,
            c.z,
          );
          dummy.rotation.set(c.rx, c.ry, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          cards.setMatrixAt(i, dummy.matrix);
        });
        cards.instanceMatrix.needsUpdate = true;

        // Ash
        for (let i = 0; i < N_ASH; i++) {
          if (aAge[i] >= 1) continue;
          aAge[i] += dt / aLife[i];
          const j = i * 3;
          aPos[j] += (aVel[j] + Math.sin(clock * 1.7 + i) * 0.25) * dt;
          aPos[j + 1] += aVel[j + 1] * dt;
          aPos[j + 2] += aVel[j + 2] * dt;
          aVel[j + 1] *= 1 - dt * 0.15;
        }
        ashGeo.attributes.position.needsUpdate = true;
        ashGeo.attributes.aAge.needsUpdate = true;
        ashGeo.attributes.aSize.needsUpdate = true;
      }

      // Pointer parallax with a little spring, decorative only
      const ptr = { x: 0, y: 0 };
      const cam = { x: 0, y: 0, vx: 0, vy: 0 };
      const onPointer = (e) => {
        ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
        ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
      };
      if (!reduced)
        window.addEventListener("pointermove", onPointer, { passive: true });

      let visible = true;
      const io = new IntersectionObserver(
        ([e]) => (visible = e.isIntersecting),
      );
      io.observe(el);

      const start = performance.now();
      let last = start;
      let raf = 0;
      let frames = 0;
      let slow = 0;

      if (reduced) {
        for (let k = 0; k < 300; k++) simulate(1 / 30, 2 + k / 30, k / 30);
        curtainU.uTime.value = 4;
        renderer.render(scene, camera);
      }

      function frame(now) {
        raf = requestAnimationFrame(frame);
        if (reduced || !visible || document.hidden) {
          last = now;
          return;
        }
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const t = (now - start) / 1000;
        const clock = now / 1000;
        // The curtain rises once, with a strong ease-out.
        const k = Math.min(t / 2.4, 1);
        curtainU.uRise.value = 1 - Math.pow(1 - k, 4);
        curtainU.uTime.value = clock;
        simulate(dt, t, clock);

        const tx = ptr.x * 0.6;
        const ty = -ptr.y * 0.35;
        cam.vx += ((tx - cam.x) * 40 - cam.vx * 11) * dt;
        cam.vy += ((ty - cam.y) * 40 - cam.vy * 11) * dt;
        cam.x += cam.vx * dt;
        cam.y += cam.vy * dt;
        camera.position.set(cam.x, cam.y, 14);
        camera.lookAt(0, 0, 0);
        curtainU.uShift.value = cam.x * 0.01;

        renderer.render(scene, camera);
        frames++;
        if (frames > 40 && pr > 1) {
          slow = dt > 0.035 ? slow + 1 : Math.max(0, slow - 1);
          if (slow > 45) {
            pr = 1;
            resize();
          }
        }
      }
      raf = requestAnimationFrame(frame);

      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onPointer);
        disposables.forEach((o) => o.dispose());
        cards.dispose();
        bills.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }
  }, []);

  return <div className="ash" ref={host} aria-hidden="true" />;
}
