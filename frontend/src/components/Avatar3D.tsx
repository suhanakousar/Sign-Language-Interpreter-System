"use client";

import { Suspense, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import { useAppStore } from "@/lib/store";
import { AVATAR_CONFIG } from "@/lib/constants";
import type { FacialExpression } from "@/types";

// ─── ASL Pose Database ───
// Each pose defines target rotations for body parts.
// Values: [x, z] for arms, [x] for forearms, [y] for head, [x] for spine.

interface AvatarPose {
  rightArm: [number, number];
  rightForearm: [number];
  leftArm: [number, number];
  leftForearm: [number];
  head: [number, number];
  spine: [number];
}

const IDLE_POSE: AvatarPose = {
  rightArm: [0.2, -0.15],
  rightForearm: [0],
  leftArm: [0.2, 0.15],
  leftForearm: [0],
  head: [0, 0],
  spine: [0],
};

// Predefined gesture poses for known signs
const SIGN_POSES: Record<string, AvatarPose> = {
  hello: {
    rightArm: [-1.2, -0.8],
    rightForearm: [-0.3],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0, 0.1],
    spine: [0],
  },
  goodbye: {
    rightArm: [-1.4, -0.6],
    rightForearm: [-0.5],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.05, 0],
    spine: [0],
  },
  yes: {
    rightArm: [0.2, -0.15],
    rightForearm: [0],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.15, 0],
    spine: [0.05],
  },
  no: {
    rightArm: [0.2, -0.15],
    rightForearm: [0],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0, 0.2],
    spine: [0],
  },
  i: {
    rightArm: [-0.3, -0.1],
    rightForearm: [-0.8],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0, 0],
    spine: [0],
  },
  you: {
    rightArm: [-0.8, -0.3],
    rightForearm: [-0.5],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0, 0],
    spine: [0.03],
  },
  thank: {
    rightArm: [-0.6, -0.2],
    rightForearm: [-0.4],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.1, 0],
    spine: [0.05],
  },
  please: {
    rightArm: [-0.4, -0.1],
    rightForearm: [-0.3],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.05, 0],
    spine: [0.03],
  },
  sorry: {
    rightArm: [-0.3, -0.1],
    rightForearm: [-0.6],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.1, 0],
    spine: [0.05],
  },
  love: {
    rightArm: [-0.5, -0.4],
    rightForearm: [-0.6],
    leftArm: [-0.5, 0.4],
    leftForearm: [-0.6],
    head: [0, 0],
    spine: [0],
  },
  help: {
    rightArm: [-0.7, -0.3],
    rightForearm: [-0.5],
    leftArm: [-0.4, 0.2],
    leftForearm: [-0.3],
    head: [0, 0],
    spine: [0.03],
  },
  go: {
    rightArm: [-0.9, -0.5],
    rightForearm: [-0.4],
    leftArm: [-0.9, 0.5],
    leftForearm: [-0.4],
    head: [0, 0.05],
    spine: [0.05],
  },
  stop: {
    rightArm: [-1.2, -0.5],
    rightForearm: [-0.8],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0, 0],
    spine: [0],
  },
  eat: {
    rightArm: [-0.6, -0.2],
    rightForearm: [-1.0],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.05, 0],
    spine: [0],
  },
  drink: {
    rightArm: [-0.5, -0.2],
    rightForearm: [-1.2],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [-0.1, 0],
    spine: [-0.03],
  },
  sleep: {
    rightArm: [-0.4, -0.15],
    rightForearm: [-0.8],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.2, 0.15],
    spine: [0.05],
  },
  school: {
    rightArm: [-0.8, -0.4],
    rightForearm: [-0.3],
    leftArm: [-0.6, 0.3],
    leftForearm: [-0.2],
    head: [0, 0],
    spine: [0],
  },
  home: {
    rightArm: [-0.5, -0.2],
    rightForearm: [-0.7],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.05, 0.05],
    spine: [0],
  },
  work: {
    rightArm: [-0.6, -0.5],
    rightForearm: [-0.4],
    leftArm: [-0.6, 0.5],
    leftForearm: [-0.4],
    head: [0, 0],
    spine: [0],
  },
  want: {
    rightArm: [-0.7, -0.4],
    rightForearm: [-0.6],
    leftArm: [-0.7, 0.4],
    leftForearm: [-0.6],
    head: [0, 0],
    spine: [0.05],
  },
  know: {
    rightArm: [-0.3, -0.15],
    rightForearm: [-1.0],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.05, 0],
    spine: [0],
  },
  think: {
    rightArm: [-0.3, -0.15],
    rightForearm: [-1.1],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.05, 0.05],
    spine: [0],
  },
  see: {
    rightArm: [-0.5, -0.2],
    rightForearm: [-0.8],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0, 0],
    spine: [0.03],
  },
  hear: {
    rightArm: [-0.3, -0.15],
    rightForearm: [-0.9],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0, 0.1],
    spine: [0],
  },
  not: {
    rightArm: [-0.8, -0.3],
    rightForearm: [-0.5],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [-0.05, 0.1],
    spine: [0],
  },
  good: {
    rightArm: [-0.6, -0.25],
    rightForearm: [-0.5],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0.08, 0],
    spine: [0.03],
  },
  bad: {
    rightArm: [-0.6, -0.25],
    rightForearm: [-0.6],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [-0.05, 0],
    spine: [0],
  },
  happy: {
    rightArm: [-0.5, -0.5],
    rightForearm: [-0.3],
    leftArm: [-0.5, 0.5],
    leftForearm: [-0.3],
    head: [0, 0],
    spine: [0.05],
  },
  sad: {
    rightArm: [0.3, -0.1],
    rightForearm: [0],
    leftArm: [0.3, 0.1],
    leftForearm: [0],
    head: [0.15, 0],
    spine: [0.08],
  },
  what: {
    rightArm: [-0.9, -0.5],
    rightForearm: [-0.4],
    leftArm: [-0.9, 0.5],
    leftForearm: [-0.4],
    head: [-0.05, 0],
    spine: [0.03],
  },
  where: {
    rightArm: [-0.8, -0.3],
    rightForearm: [-0.3],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [-0.05, 0.05],
    spine: [0],
  },
  who: {
    rightArm: [-0.4, -0.15],
    rightForearm: [-1.0],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [-0.05, 0],
    spine: [0],
  },
  how: {
    rightArm: [-0.7, -0.5],
    rightForearm: [-0.5],
    leftArm: [-0.7, 0.5],
    leftForearm: [-0.5],
    head: [-0.05, 0],
    spine: [0.03],
  },
  friend: {
    rightArm: [-0.6, -0.3],
    rightForearm: [-0.5],
    leftArm: [-0.6, 0.3],
    leftForearm: [-0.5],
    head: [0.05, 0],
    spine: [0],
  },
  family: {
    rightArm: [-0.8, -0.5],
    rightForearm: [-0.3],
    leftArm: [-0.8, 0.5],
    leftForearm: [-0.3],
    head: [0, 0],
    spine: [0],
  },
  name: {
    rightArm: [-0.7, -0.3],
    rightForearm: [-0.6],
    leftArm: [-0.5, 0.3],
    leftForearm: [-0.4],
    head: [0, 0],
    spine: [0],
  },
};

// Fingerspelling poses — hand raised, slight variations per letter
function getFingerSpellPose(letter: string): AvatarPose {
  const code = letter.toLowerCase().charCodeAt(0) - 97;
  const variation = (code % 5) * 0.08;
  return {
    rightArm: [-1.3, -0.6 - variation],
    rightForearm: [-0.7 - variation * 0.5],
    leftArm: [0.2, 0.15],
    leftForearm: [0],
    head: [0, -0.05],
    spine: [0],
  };
}

// Generate pose for any word — known signs use database, unknown use procedural
function getPoseForGesture(word: string): AvatarPose {
  const lower = word.toLowerCase();

  // Check pose database
  if (SIGN_POSES[lower]) return SIGN_POSES[lower];

  // Single letter = fingerspelling
  if (lower.length === 1 && /^[a-z]$/.test(lower)) return getFingerSpellPose(lower);

  // Procedural fallback — deterministic pose from word hash
  const hash = [...lower].reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
  return {
    rightArm: [-0.5 - (hash % 8) * 0.1, -0.3 - (hash % 5) * 0.1],
    rightForearm: [-0.3 - (hash % 6) * 0.1],
    leftArm: [-0.3 - ((hash * 7) % 6) * 0.1, 0.2 + ((hash * 3) % 5) * 0.1],
    leftForearm: [-0.2 - ((hash * 11) % 5) * 0.08],
    head: [((hash % 3) - 1) * 0.05, ((hash % 5) - 2) * 0.04],
    spine: [(hash % 3) * 0.02],
  };
}

// ─── Facial expression parameters ───

interface FaceParams {
  eyebrowL: number; // up/down
  eyebrowR: number;
  mouthWidth: number; // smile width
  mouthOpen: number;
  eyeSquint: number;
}

const FACE_EXPRESSIONS: Record<string, FaceParams> = {
  neutral: { eyebrowL: 0, eyebrowR: 0, mouthWidth: 0, mouthOpen: 0, eyeSquint: 0 },
  happy: { eyebrowL: 0.2, eyebrowR: 0.2, mouthWidth: 0.4, mouthOpen: 0.1, eyeSquint: 0.3 },
  sad: { eyebrowL: -0.3, eyebrowR: -0.3, mouthWidth: -0.2, mouthOpen: 0, eyeSquint: 0 },
  surprised: { eyebrowL: 0.5, eyebrowR: 0.5, mouthWidth: 0.1, mouthOpen: 0.5, eyeSquint: -0.3 },
  questioning: { eyebrowL: 0.4, eyebrowR: -0.1, mouthWidth: 0, mouthOpen: 0.1, eyeSquint: 0 },
  emphatic: { eyebrowL: -0.2, eyebrowR: -0.2, mouthWidth: 0, mouthOpen: 0.2, eyeSquint: 0.2 },
};

// ─── Loading indicator ───

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2" role="status" aria-label="Loading 3D scene">
        <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">{progress.toFixed(0)}%</p>
      </div>
    </Html>
  );
}

// ─── Full Skeletal Avatar ───

function SkeletalAvatar() {
  const groupRef = useRef<THREE.Group>(null);
  const currentGesture = useAppStore((s) => s.currentGesture);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Body part refs
  const spineRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const rightWristRef = useRef<THREE.Group>(null);
  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const leftWristRef = useRef<THREE.Group>(null);

  // Facial feature refs
  const eyebrowLRef = useRef<THREE.Mesh>(null);
  const eyebrowRRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  // Animation targets
  const targetPose = useRef<AvatarPose>({ ...IDLE_POSE });
  const targetFace = useRef<FaceParams>({ ...FACE_EXPRESSIONS.neutral });
  const gestureProgress = useRef(0);

  // Update targets when gesture changes
  useEffect(() => {
    if (!currentGesture) {
      targetPose.current = { ...IDLE_POSE };
      targetFace.current = { ...FACE_EXPRESSIONS.neutral };
      gestureProgress.current = 0;
      return;
    }

    targetPose.current = getPoseForGesture(currentGesture.word);

    const expression = currentGesture.facial_expression as FacialExpression || "neutral";
    targetFace.current = {
      ...(FACE_EXPRESSIONS[expression] || FACE_EXPRESSIONS.neutral),
    };
    gestureProgress.current = 0;
  }, [currentGesture]);

  // Animation loop
  useFrame((_, delta) => {
    const speed = prefersReducedMotion ? 20 : 5;
    const d = Math.min(delta, 0.05); // Cap delta to avoid jumps
    const lerpAmt = speed * d;

    // Spine
    if (spineRef.current) {
      spineRef.current.rotation.x = THREE.MathUtils.lerp(
        spineRef.current.rotation.x,
        targetPose.current.spine[0],
        lerpAmt
      );
    }

    // Head
    if (headRef.current) {
      headRef.current.rotation.x = THREE.MathUtils.lerp(
        headRef.current.rotation.x,
        targetPose.current.head[0],
        lerpAmt
      );
      headRef.current.rotation.y = THREE.MathUtils.lerp(
        headRef.current.rotation.y,
        targetPose.current.head[1],
        lerpAmt
      );
    }

    // Right arm chain
    if (rightShoulderRef.current) {
      rightShoulderRef.current.rotation.x = THREE.MathUtils.lerp(
        rightShoulderRef.current.rotation.x,
        targetPose.current.rightArm[0],
        lerpAmt
      );
      rightShoulderRef.current.rotation.z = THREE.MathUtils.lerp(
        rightShoulderRef.current.rotation.z,
        targetPose.current.rightArm[1],
        lerpAmt
      );
    }
    if (rightElbowRef.current) {
      rightElbowRef.current.rotation.x = THREE.MathUtils.lerp(
        rightElbowRef.current.rotation.x,
        targetPose.current.rightForearm[0],
        lerpAmt
      );
    }

    // Left arm chain
    if (leftShoulderRef.current) {
      leftShoulderRef.current.rotation.x = THREE.MathUtils.lerp(
        leftShoulderRef.current.rotation.x,
        targetPose.current.leftArm[0],
        lerpAmt
      );
      leftShoulderRef.current.rotation.z = THREE.MathUtils.lerp(
        leftShoulderRef.current.rotation.z,
        targetPose.current.leftArm[1],
        lerpAmt
      );
    }
    if (leftElbowRef.current) {
      leftElbowRef.current.rotation.x = THREE.MathUtils.lerp(
        leftElbowRef.current.rotation.x,
        targetPose.current.leftForearm[0],
        lerpAmt
      );
    }

    // Facial animation
    if (eyebrowLRef.current) {
      eyebrowLRef.current.position.y = THREE.MathUtils.lerp(
        eyebrowLRef.current.position.y,
        1.78 + targetFace.current.eyebrowL * 0.03,
        lerpAmt
      );
    }
    if (eyebrowRRef.current) {
      eyebrowRRef.current.position.y = THREE.MathUtils.lerp(
        eyebrowRRef.current.position.y,
        1.78 + targetFace.current.eyebrowR * 0.03,
        lerpAmt
      );
    }
    if (mouthRef.current) {
      mouthRef.current.scale.x = THREE.MathUtils.lerp(
        mouthRef.current.scale.x,
        1 + targetFace.current.mouthWidth,
        lerpAmt
      );
      mouthRef.current.scale.y = THREE.MathUtils.lerp(
        mouthRef.current.scale.y,
        1 + targetFace.current.mouthOpen * 2,
        lerpAmt
      );
    }

    // Breathing animation
    if (groupRef.current && !prefersReducedMotion) {
      const breathe = Math.sin(Date.now() * 0.002) * 0.005;
      groupRef.current.position.y = breathe;
    }

    // Subtle idle sway
    if (spineRef.current && !currentGesture && !prefersReducedMotion) {
      const sway = Math.sin(Date.now() * 0.001) * 0.01;
      spineRef.current.rotation.z = sway;
    }
  });

  // ─── Materials ───

  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#e8b88a", roughness: 0.7, metalness: 0.05 }),
    []
  );
  const clothMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3b82f6", roughness: 0.5, metalness: 0.1 }),
    []
  );
  const pantsMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.8, metalness: 0 }),
    []
  );
  const eyeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1e293b" }),
    []
  );
  const browMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#5a3825" }),
    []
  );
  const mouthMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#c4726c" }),
    []
  );
  const hairMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#3d2b1f", roughness: 0.9 }),
    []
  );
  const shoeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1a1a2e", roughness: 0.6 }),
    []
  );

  // Finger helper
  const Finger = ({ position, rotation = [0, 0, 0] as [number, number, number], length = 0.06 }: {
    position: [number, number, number];
    rotation?: [number, number, number];
    length?: number;
  }) => (
    <group position={position} rotation={rotation}>
      <mesh material={skinMat}>
        <capsuleGeometry args={[0.008, length, 4, 6]} />
      </mesh>
    </group>
  );

  // Hand with fingers
  const Hand = ({ side }: { side: "left" | "right" }) => {
    const mirror = side === "left" ? -1 : 1;
    return (
      <group>
        {/* Palm */}
        <mesh position={[0, -0.04, 0]} material={skinMat}>
          <boxGeometry args={[0.06, 0.03, 0.05]} />
        </mesh>
        {/* Fingers */}
        <Finger position={[-0.02 * mirror, -0.07, -0.02]} />
        <Finger position={[-0.007 * mirror, -0.08, -0.018]} length={0.07} />
        <Finger position={[0.007 * mirror, -0.08, -0.016]} length={0.065} />
        <Finger position={[0.02 * mirror, -0.07, -0.014]} length={0.055} />
        {/* Thumb */}
        <Finger
          position={[-0.03 * mirror, -0.03, 0.01]}
          rotation={[0, 0, 0.5 * mirror]}
          length={0.04}
        />
      </group>
    );
  };

  return (
    <group ref={groupRef} position={[0, -0.85, 0]}>
      {/* ── Spine / Torso ── */}
      <group ref={spineRef}>
        {/* Lower torso */}
        <mesh position={[0, 1.1, 0]} material={clothMat}>
          <capsuleGeometry args={[0.17, 0.2, 8, 16]} />
        </mesh>
        {/* Upper torso */}
        <mesh position={[0, 1.35, 0]} material={clothMat}>
          <capsuleGeometry args={[0.19, 0.2, 8, 16]} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.52, 0]} material={skinMat}>
          <capsuleGeometry args={[0.04, 0.06, 6, 6]} />
        </mesh>

        {/* ── Head ── */}
        <group ref={headRef} position={[0, 1.65, 0]}>
          {/* Skull */}
          <mesh material={skinMat}>
            <sphereGeometry args={[0.14, 32, 32]} />
          </mesh>
          {/* Hair */}
          <mesh position={[0, 0.05, -0.02]} material={hairMat}>
            <sphereGeometry args={[0.145, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          </mesh>
          {/* Ears */}
          <mesh position={[-0.14, -0.02, 0]} material={skinMat}>
            <sphereGeometry args={[0.025, 8, 8]} />
          </mesh>
          <mesh position={[0.14, -0.02, 0]} material={skinMat}>
            <sphereGeometry args={[0.025, 8, 8]} />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.045, 0.02, 0.12]} material={eyeMat}>
            <sphereGeometry args={[0.018, 12, 12]} />
          </mesh>
          <mesh position={[0.045, 0.02, 0.12]} material={eyeMat}>
            <sphereGeometry args={[0.018, 12, 12]} />
          </mesh>
          {/* Eye whites */}
          <mesh position={[-0.045, 0.02, 0.115]}>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>
          <mesh position={[0.045, 0.02, 0.115]}>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial color="#f1f5f9" />
          </mesh>

          {/* Eyebrows */}
          <mesh ref={eyebrowLRef} position={[-0.045, 1.78 - 1.65, 0.125]} material={browMat}>
            <boxGeometry args={[0.04, 0.006, 0.01]} />
          </mesh>
          <mesh ref={eyebrowRRef} position={[0.045, 1.78 - 1.65, 0.125]} material={browMat}>
            <boxGeometry args={[0.04, 0.006, 0.01]} />
          </mesh>

          {/* Nose */}
          <mesh position={[0, -0.01, 0.135]} material={skinMat}>
            <coneGeometry args={[0.015, 0.03, 8]} />
          </mesh>

          {/* Mouth */}
          <mesh ref={mouthRef} position={[0, -0.05, 0.12]} material={mouthMat}>
            <boxGeometry args={[0.04, 0.008, 0.01]} />
          </mesh>
        </group>

        {/* ── Right Arm ── */}
        <group ref={rightShoulderRef} position={[0.24, 1.44, 0]}>
          {/* Shoulder joint visual */}
          <mesh material={clothMat}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>
          {/* Upper arm */}
          <mesh position={[0, -0.15, 0]} material={clothMat}>
            <capsuleGeometry args={[0.045, 0.2, 8, 8]} />
          </mesh>

          {/* Elbow */}
          <group ref={rightElbowRef} position={[0, -0.3, 0]}>
            <mesh material={skinMat}>
              <sphereGeometry args={[0.035, 8, 8]} />
            </mesh>
            {/* Forearm */}
            <mesh position={[0, -0.14, 0]} material={skinMat}>
              <capsuleGeometry args={[0.035, 0.18, 8, 8]} />
            </mesh>

            {/* Wrist + Hand */}
            <group ref={rightWristRef} position={[0, -0.28, 0]}>
              <Hand side="right" />
            </group>
          </group>
        </group>

        {/* ── Left Arm ── */}
        <group ref={leftShoulderRef} position={[-0.24, 1.44, 0]}>
          <mesh material={clothMat}>
            <sphereGeometry args={[0.06, 8, 8]} />
          </mesh>
          <mesh position={[0, -0.15, 0]} material={clothMat}>
            <capsuleGeometry args={[0.045, 0.2, 8, 8]} />
          </mesh>

          <group ref={leftElbowRef} position={[0, -0.3, 0]}>
            <mesh material={skinMat}>
              <sphereGeometry args={[0.035, 8, 8]} />
            </mesh>
            <mesh position={[0, -0.14, 0]} material={skinMat}>
              <capsuleGeometry args={[0.035, 0.18, 8, 8]} />
            </mesh>

            <group position={[0, -0.28, 0]}>
              <Hand side="left" />
            </group>
          </group>
        </group>
      </group>

      {/* ── Hips ── */}
      <mesh position={[0, 0.95, 0]} material={pantsMat}>
        <capsuleGeometry args={[0.16, 0.1, 8, 16]} />
      </mesh>

      {/* ── Right Leg ── */}
      <group position={[0.08, 0.85, 0]}>
        <mesh position={[0, -0.2, 0]} material={pantsMat}>
          <capsuleGeometry args={[0.06, 0.35, 8, 8]} />
        </mesh>
        {/* Knee */}
        <mesh position={[0, -0.42, 0]} material={pantsMat}>
          <sphereGeometry args={[0.045, 8, 8]} />
        </mesh>
        {/* Shin */}
        <mesh position={[0, -0.62, 0]} material={pantsMat}>
          <capsuleGeometry args={[0.05, 0.3, 8, 8]} />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.82, 0.03]} material={shoeMat}>
          <boxGeometry args={[0.08, 0.05, 0.14]} />
        </mesh>
      </group>

      {/* ── Left Leg ── */}
      <group position={[-0.08, 0.85, 0]}>
        <mesh position={[0, -0.2, 0]} material={pantsMat}>
          <capsuleGeometry args={[0.06, 0.35, 8, 8]} />
        </mesh>
        <mesh position={[0, -0.42, 0]} material={pantsMat}>
          <sphereGeometry args={[0.045, 8, 8]} />
        </mesh>
        <mesh position={[0, -0.62, 0]} material={pantsMat}>
          <capsuleGeometry args={[0.05, 0.3, 8, 8]} />
        </mesh>
        <mesh position={[0, -0.82, 0.03]} material={shoeMat}>
          <boxGeometry args={[0.08, 0.05, 0.14]} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Scene setup ───

function Scene() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...AVATAR_CONFIG.cameraPosition);
    camera.lookAt(...AVATAR_CONFIG.cameraTarget);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />
      <pointLight position={[0, 2, 3]} intensity={0.4} color="#e0e7ff" />

      <SkeletalAvatar />

      <ContactShadows
        position={[0, -0.85, 0]}
        opacity={0.35}
        scale={4}
        blur={2.5}
      />
      {/* Floor grid for spatial reference */}
      <gridHelper
        args={[6, 20, "#e2e8f0", "#f1f5f9"]}
        position={[0, -0.85, 0]}
        rotation={[0, 0, 0]}
      />
      <Environment preset="studio" />
      <OrbitControls
        target={AVATAR_CONFIG.cameraTarget}
        enablePan={false}
        minDistance={1.5}
        maxDistance={5}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
}

// ─── Gesture label overlay ───

function GestureOverlay() {
  const { currentGesture, isPlaying, settings, gestureQueue } = useAppStore();

  if (!settings.show_subtitles) return null;

  return (
    <div
      className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {currentGesture && isPlaying && (
        <div className="bg-black/70 text-white px-5 py-2.5 rounded-xl text-base font-semibold backdrop-blur-sm animate-fade-in tracking-wider">
          {currentGesture.word.toUpperCase()}
          {currentGesture.facial_expression &&
            currentGesture.facial_expression !== "neutral" && (
              <span className="ml-2 text-xs opacity-60">
                ({currentGesture.facial_expression})
              </span>
            )}
        </div>
      )}
      {gestureQueue.length > 0 && (
        <div className="text-xs text-white/50 bg-black/30 px-3 py-1 rounded-lg backdrop-blur-sm">
          {gestureQueue.length} sign{gestureQueue.length !== 1 ? "s" : ""} queued
        </div>
      )}
    </div>
  );
}

// ─── Main component ───

export function Avatar3D() {
  return (
    <div
      className="glass-panel relative w-full h-full overflow-hidden"
      role="img"
      aria-label="3D sign language avatar performing gestures"
    >
      <div className="absolute top-3 left-4 z-10">
        <h2 className="text-sm font-semibold text-slate-700">
          Sign Language Avatar
        </h2>
      </div>

      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 35 }}
      >
        <Suspense fallback={<Loader />}>
          <Scene />
        </Suspense>
      </Canvas>

      <GestureOverlay />
    </div>
  );
}
