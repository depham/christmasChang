import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import * as cam from '@mediapipe/camera_utils';

/* ================= iOS DETECT ================= */
const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !window.MSStream;

/* ================= CONST ================= */
const count = 26000;
const heartGroups = 12;
const tempObject = new THREE.Object3D();
const LOVE_TEXT_START = 0.82;
const LOVE_TEXT_END = 0.90;
const CUTE_TEXT_START = 0.90;
const CUTE_TEXT_END = 0.96;

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

/* ================= PARTICLES ================= */
function Particles({ gesture }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const fistStartTime = useRef(null);
  const [showText, setShowText] = useState(false);

  const changPoints = useMemo(() => createTextPoints('Chang', 72, 320, 120), []);
  const merryPoints = useMemo(() => createTextPoints('Merry Christmas', 48, 520, 140), []);
  const lovePoints = useMemo(() => createTextPoints('Yêu bồ lắm', 55, 420, 120), []);
  const cutePoints = useMemo(() => createTextPoints('Cưng ạ', 55, 420, 120), []);

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

    if (gesture === 'HEART' || gesture === 'FIST') {
      materialRef.current.color.set('#ffffff');
      materialRef.current.emissive.set('#ffffff');
      materialRef.current.emissiveIntensity = 10 + Math.sin(time * 10) * 5;

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
      const i = p.id;
      const ratio = i / count;
      const target = new THREE.Vector3();

      if (gesture === 'HEART' || gesture === 'FIST') {
        if (showText && ratio > LOVE_TEXT_START && ratio <= LOVE_TEXT_END) {
          const tp = lovePoints[(i * 97) % lovePoints.length];
          target.set(tp.x * 2.5, treeHeight / 2 + tp.y * 2.5 - 1.5, 0);
        } else if (showText && ratio > CUTE_TEXT_START && ratio <= CUTE_TEXT_END) {
          const tp = cutePoints[(i * 131) % cutePoints.length];
          target.set(tp.x * 2.2, treeHeight / 2 + tp.y * 2.2 - 3, 0);
        } else {
          const layer = Math.floor(ratio * layerCount);
          const layerRatio = (ratio * layerCount) % 1;
          const radius = 7.2 * (1 - layer / layerCount);
          const angle = layerRatio * Math.PI * 5 + time;
          target.set(
            Math.cos(angle) * radius,
            layer * layerHeight - treeHeight / 2.5,
            Math.sin(angle) * radius
          );
        }
      }

      p.curPos.lerp(target, 0.045);
      tempObject.position.copy(p.curPos);
      tempObject.scale.set(0.5, 0.5, 0.5);
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

/* ================= APP ================= */
export default function App() {
  const [gesture, setGesture] = useState('OPEN');
  const [started, setStarted] = useState(false);
  const videoRef = useRef(null);
  const iosStarted = useRef(false);

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
        setGesture(dist > 0.12 ? 'FIST' : 'OPEN');
      }
    });

    if (IS_IOS && started && videoRef.current && !iosStarted.current) {
      iosStarted.current = true;

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      }).then((stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});

        const loop = async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
          requestAnimationFrame(loop);
        };
        loop();
      });
    }

    if (!IS_IOS && videoRef.current) {
      const camera = new cam.Camera(videoRef.current, {
        onFrame: async () => hands.send({ image: videoRef.current }),
        width: 1920,
        height: 1080,
      });
      camera.start();
    }

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [started]);

  return (
    <div className="w-full h-screen relative">
      <video ref={videoRef} className="hidden" playsInline muted />

      {IS_IOS && !started && (
        <div
          onClick={() => setStarted(true)}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 text-white"
        >
          Tap to start camera
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 40], fov: 60 }}>
        <Particles gesture={gesture} />
        <EffectComposer>
          <Bloom intensity={2.5} luminanceThreshold={0.1} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
