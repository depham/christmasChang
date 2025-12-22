import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';

const count = 26000;
const heartGroups = 12;
const tempObject = new THREE.Object3D();
const LOVE_TEXT_START = 0.82;
const LOVE_TEXT_END   = 0.90;
const CUTE_TEXT_START = 0.90;
const CUTE_TEXT_END   = 0.96;

/* ====== HELPER: CREATE TEXT POINTS ====== */
function createTextPoints(text, size = 72, width = 500, height = 160) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.font = `bold ${size}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.fillText(text, width / 2, height / 2);

  const img = ctx.getImageData(0, 0, width, height).data;
  const pts = [];

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4;
      if (img[i] > 200) {
        pts.push({
          x: (x / width - 0.5) * 8,
          y: (1 - y / height) * 2,
        });
      }
    }
  }
  return pts;
}

function Particles({ gesture }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const fistStartTime = useRef(null);
  const [showText, setShowText] = useState(false);

  /* ===== TEXT POINTS ===== */
  const changPoints = useMemo(() => createTextPoints('Chang', 72, 320, 120), []);
  const merryPoints = useMemo(
    () => createTextPoints('Merry Christmas', 48, 520, 140),
    []
  );
  const lovePoints = useMemo(
  () => createTextPoints('Yêu bồ lắm', 55, 420, 120),
  []
);
const cutePoints = useMemo(
  () => createTextPoints('Cưng ạ', 55, 420, 120),
  []
);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        time: Math.random() * 100,
        speed: 0.01 + Math.random() * 0.015,
        curPos: new THREE.Vector3(
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60
        ),
      })),
    []
  );

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const treeHeight = 16;
    const layerCount = 9;
    const layerHeight = treeHeight / layerCount;

    /* ===== COLOR MODE ===== */
    if (gesture === 'HEART' || gesture === 'FIST') {
      materialRef.current.color.set('#ffffff');
      materialRef.current.emissive.set('#ffffff');
      materialRef.current.emissiveIntensity = 10 + Math.sin(time * 10) * 5;

      // ===== Timer 5s chuyển sang text =====
      if (fistStartTime.current === null) {
        fistStartTime.current = time;
        setShowText(false);
      } else if (time - fistStartTime.current > 10) {
        setShowText(true);
      }
    } else {
      materialRef.current.color.set('#ff2d88');
      materialRef.current.emissive.set('#b80050');
      materialRef.current.emissiveIntensity = 4.5;
      fistStartTime.current = null;
      setShowText(false);
    }

    particles.forEach((p) => {
      p.time += p.speed;
      const i = p.id;
      const ratio = i / count;
      const target = new THREE.Vector3();

      /* ================= TREE MODE / TEXT MODE ================= */
      if (gesture === 'HEART' || gesture === 'FIST') {
        if (showText) {
          // Hiển thị text "Giáng sinh vui vẻ"
          if (ratio > 0.88 && ratio <= 0.93 && merryPoints.length) {
            const id = i % merryPoints.length;
            const tp = merryPoints[id];
            target.set(tp.x, treeHeight / 2 + 0.5 + tp.y, 0);
          } else {
            // particle còn lại rơi tự do
            p.curPos.y -= p.speed * 6;
            if (p.curPos.y < -30) {
              p.curPos.y = 30;
              p.curPos.x = (Math.random() - 0.5) * 80;
              p.curPos.z = (Math.random() - 0.5) * 80;
            }
            target.copy(p.curPos);
          }
        } else {
          // Hiển thị cây thông như cũ
          if (ratio > 0.93 && ratio <= 0.96 && changPoints.length) {
            const id = i % changPoints.length;
            const tp = changPoints[id];
            target.set(tp.x, treeHeight / 2 + 0.5 + tp.y, 0);
          } else if (ratio > 0.96) {
            const a = ((i % 50) / 50) * Math.PI * 2;
            target.set(Math.cos(a) * 1.6, treeHeight / 2 - 0.5, Math.sin(a) * 1.6);
          } else if (i % 14 === 0) {
            p.curPos.y -= p.speed * 6;
            if (p.curPos.y < -30) {
              p.curPos.y = 30;
              p.curPos.x = (Math.random() - 0.5) * 80;
              p.curPos.z = (Math.random() - 0.5) * 80;
            }
            target.copy(p.curPos);
          } else if (ratio > 0.88 && ratio <= 0.90) {
            const tRatio = (i % 500) / 500;
            const y = treeHeight / 2 - tRatio * treeHeight + 0.5;
            const radius = 0.2 + tRatio * 4;
            const angle = tRatio * Math.PI * 20 + time;
            target.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
          } else if (ratio > 0.90 && ratio <= 0.92) {
            const tRatio = (i % 250) / 250;
            const y = treeHeight / 2 - tRatio * treeHeight - 0.65;
            const radius = 0.3 + tRatio * 1.5;
            const angle = tRatio * Math.PI * 7 + time * 0.5;
            target.set(Math.cos(angle) * radius * 20, y + 5, Math.sin(angle) * radius * 20);
          } else if (ratio > 0.92 && ratio <= 0.94) {
            const tRatio = (i % 250) / 250;
            const y = treeHeight / 2 - tRatio * treeHeight - 0.75;
            const radius = 0.3 + tRatio * 1.5;
            const angle = tRatio * Math.PI * 7 + time * 0.5;
            target.set(Math.cos(angle) * radius * 30, y + 5, Math.sin(angle) * radius * 30);
          } else if (ratio > 0.94 && ratio <= 0.96) {
            const tRatio = (i % 250) / 250;
            const y = treeHeight / 2 - tRatio * treeHeight - 0.75;
            const radius = 0.1 + tRatio * 2.5;
            const angle = tRatio * Math.PI * 3 + time * 0.3;
            target.set(Math.cos(angle) * radius, y - 1.5, Math.sin(angle) * radius);
          } else {
            const layer = Math.floor(ratio * layerCount);
            const layerRatio = (ratio * layerCount) % 1;
            const radius = 7.2 * (1 - layer / layerCount);
            const rotationSpeed = 0.3 + layer * 0.15;
            const angle = layerRatio * Math.PI * 5 + time * rotationSpeed;
            target.set(Math.cos(angle) * radius, layer * layerHeight - treeHeight / 2.5, Math.sin(angle) * radius);
          }
        }
      if (gesture === 'HEART' || gesture === 'FIST') {

  /* ===== TEXT "Yêu bồ lắm" sau 5s ===== */
  if (showText && ratio > LOVE_TEXT_START  && ratio <= LOVE_TEXT_END && lovePoints.length) {
    const id = Math.floor(
  (i * 97) % lovePoints.length
);
    const tp = lovePoints[id];

    target.set(
      tp.x * 2.5,
      treeHeight / 2 + tp.y * 2.5 - 1.5, // phía trên cây
      0
    );
  }
  /* ===== TEXT "Cưng ạ" (dưới Yêu bồ lắm) ===== */
else if (
  showText &&
  ratio > CUTE_TEXT_START &&
  ratio <= CUTE_TEXT_END &&
  cutePoints.length
) {
  const id = Math.floor(
    (i * 131) % cutePoints.length
  );
  const tp = cutePoints[id];

  target.set(
    tp.x * 2.2,
    treeHeight / 2 + tp.y * 2.2 - 3.0, // thấp hơn "Yêu bồ lắm"
    0
  );
}
  /* ===== TREE LOGIC (GIỮ NGUYÊN) ===== */
  else if (ratio > 0.93 && ratio <= 0.96 && changPoints.length) {
    const id = i % changPoints.length;
    const tp = changPoints[id];
    target.set(tp.x, treeHeight / 2 + 0.5 + tp.y, 0);
  }
  else if (ratio > 0.96) {
    const a = ((i % 50) / 50) * Math.PI * 2;
    target.set(Math.cos(a) * 1.6, treeHeight / 2 - 0.5, Math.sin(a) * 1.6);
  }
  else if (i % 14 === 0) {
    p.curPos.y -= p.speed * 6;
    if (p.curPos.y < -30) {
      p.curPos.y = 30;
      p.curPos.x = (Math.random() - 0.5) * 80;
      p.curPos.z = (Math.random() - 0.5) * 80;
    }
    target.copy(p.curPos);
  }
  else if (ratio > 0.82 && ratio <= 0.8) {
    const tRatio = (i % 400) / 400;
    const y = treeHeight / 2 - tRatio * treeHeight + 0.5;
    const radius = 0.2 + tRatio * 4;
    const angle = tRatio * Math.PI * 10 + time;
    target.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }
  else if (ratio > 0.84 && ratio <= 0.86) {
    const tRatio = (i % 650) / 650;
    const y = treeHeight / 2 - tRatio * treeHeight + 0.5;
    const radius = 0.2 + tRatio * 5;
    const angle = tRatio * Math.PI * 25 + time;
    target.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }
  else if (ratio > 0.86 && ratio <= 0.88) {
    const tRatio = (i % 350) / 350;
    const y = treeHeight / 2 - tRatio * treeHeight + 3.5;
    const radius = 0.1 + tRatio * 6;
    const angle = tRatio * Math.PI * 25 + time;
    target.set(Math.cos(angle * 1.75) * radius, y, Math.sin(angle * 0.75) * radius + 8);
  }
  else if ( !showText && ratio > 0.88 && ratio <= 0.90) {
    const tRatio = (i % 250) / 250;
    const y = treeHeight / 2 - tRatio * treeHeight - 0.65;
    const radius = 0.3 + tRatio * 1.5;
    const angle = tRatio * Math.PI * 7 + time * 0.5;
    target.set(Math.cos(angle) * radius * 20, y + 5, Math.sin(angle) * radius * 20);
  }
   else if ( !showText && ratio > 0.90 && ratio <= 0.92) {
    const tRatio = (i % 250) / 250;
    const y = treeHeight / 2 - tRatio * treeHeight - 0.15;
    const radius = 0.3 + tRatio * 1.5;
    const angle = tRatio * Math.PI * 7 + time * 0.1;
    target.set(Math.cos(angle) * radius * 35, y + 1.5, Math.sin(angle) * radius * 30);
  }
  else if (!showText && ratio > 0.92 && ratio <= 0.94) {
    const tRatio = (i % 250) / 250;
    const y = treeHeight / 2 - tRatio * treeHeight - 0.75;
    const radius = 0.1 + tRatio * 2.5;
    const angle = tRatio * Math.PI * 3 + time * 0.3;
    target.set(Math.cos(angle) * radius, y - 1.5, Math.sin(angle) * radius);
  }
  else {
    const layer = Math.floor(ratio * layerCount);
    const layerRatio = (ratio * layerCount) % 1;
    const radius = 7.2 * (1 - layer / layerCount);
    const rotationSpeed = 0.3 + layer * 0.15;
    const angle = layerRatio * Math.PI * 5 + time * rotationSpeed;

    target.set(
      Math.cos(angle) * radius,
      layer * layerHeight - treeHeight / 2.5,
      Math.sin(angle) * radius * 1.2
    );
  }
}
      }

      /* ================= HEART MODE ================= */
      else {
        if (ratio > 0.88 && ratio <= 0.93 && merryPoints.length) {
          const id = i % merryPoints.length;
          const tp = merryPoints[id];
          const zAngle = Math.PI / 12;
          const cosA = Math.cos(zAngle);
          const sinA = Math.sin(zAngle);
          const xRot = tp.x * cosA - tp.y * sinA * 0.75;
          const yRot = tp.x * sinA + tp.y * cosA * 0.75;
          target.set(xRot * 6.5 + 2.5, yRot * 6.5 - 4.5, 0);
        } else {
          const t = p.time;
          const groupId = i % heartGroups;
          const offsetAngle = (groupId / heartGroups) * Math.PI * 2;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          target.set(x / 1.6 + Math.cos(offsetAngle) * 1.2, y / 1.6 + Math.sin(t + groupId) * 1.2, Math.sin(offsetAngle) * 0.8);
        }
      }

      /* ===== TRANSITION ===== */
      p.curPos.lerp(target, 0.045);
      tempObject.position.copy(p.curPos);

      let scale = 0.45;
      if (ratio > 0.88 && ratio <= 0.93) {
        scale = 0.9 + Math.sin(time * 8 + i) * 0.5;
      } else if (i % 30 === 0) {
        scale = 1.3;
      }

      tempObject.scale.set(scale, scale, scale);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshStandardMaterial ref={materialRef} toneMapped={false} emissiveIntensity={5} />
    </instancedMesh>
  );
}

export default function App() {
  const [gesture, setGesture] = useState('OPEN');
  const videoRef = useRef(null);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
       if (results.multiHandLandmarks?.length) {
         const h = results.multiHandLandmarks[0]; 
         const dist = Math.hypot(h[4].x - h[20].x, h[4].y - h[20].y);
          setGesture(dist > 0.12 ? 'FIST' : 'OPEN'); } });

    if (videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => hands.send({ image: videoRef.current }),
        width: 1920,
        height: 1080,
      });
      camera.start();
    }
  }, []);

  return (
    <div
      className={`w-full h-screen transition-colors duration-500 ${
        gesture === 'HEART' || gesture === 'FIST' ? 'bg-[#ff2d88]' : 'bg-[#ffffff]'
      }`}
    >
      {/* layer hiệu ứng lan tỏa */}
    <div
      className={`pointer-events-none absolute inset-0 ${
        gesture === 'HEART' || gesture === 'FIST'
          ? 'radial-pink'
          : 'radial-white'
      }`}
    />
      <video ref={videoRef} className="hidden" />
      <Canvas camera={{ position: [0, 0, 40], fov: 60 }}>
        <Particles gesture={gesture} />
        <EffectComposer>
          <Bloom intensity={2.5} luminanceThreshold={0.1} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
