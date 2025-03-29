<template>
  <div ref="container"></div>
</template>
<script setup lang="ts">
import gsap from "gsap";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import leftClick from "~/assets/icons/left-click.png";

// 绑定 DOM 元素
const container = ref<HTMLElement | null>(null);
const loading = ref(false);
const sceneId = ref("hall");
const raycaster = new THREE.Raycaster();
const scene = new THREE.Scene();
const width = ref<number>();
const height = ref<number>();
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
// const icons = ref<Array<THREE.Sprite>>([]);
let icons: Array<THREE.Sprite> = [];
const textureCache = new Map(); // 预加载的纹理缓存
// let isAnimating = true;
const baseFov = 75; // 🟢 你原来的 FOV
const currentFov = ref(baseFov);
const baseIconScale = 0.05; // 🟢 这个是 icon 的基础大小

watch(currentFov, (newFov: number) => {
  // 🚀 计算 icon 缩放比例，使其在 FOV 变化时保持大小
  const newIconScale = baseIconScale * (newFov / baseFov);

  if (!loading.value) {
    // 计算新的旋转速度，确保拖动一致性
    let newRotateSpeed = controls.rotateSpeed * (newFov / camera.fov);
    // 限制 rotateSpeed 最小值（最多不超过 -0.4）
    newRotateSpeed = Math.max(-0.4, Math.min(-0.2, newRotateSpeed)); // 约束范围
    controls.rotateSpeed = newRotateSpeed;

    // // 🚀 使用 gsap 平滑过渡
    gsap.to(camera, {
      fov: newFov,
      duration: 0.5,
      ease: "power2.out",
      onUpdate: () => camera.updateProjectionMatrix(), // 🔥 记得更新投影矩阵
    });
  }

  // 🚀 平滑调整 icon 大小
  icons.forEach((icon) => {
    gsap.to(icon.scale, {
      x: newIconScale,
      y: newIconScale,
      duration: 0.5,
      ease: "power2.out",
    });
  });
});

const currentScene = computed(() => {
  return scenes.find((scene) => scene.id === sceneId.value);
});
const scenes = [
  {
    id: "brown",
    path: "/cubeMap/brown",
    cameraPosition: {
      x: -0.0017254181554958677,
      y: 0.00014290166736685247,
      z: 0.000050112894039507436,
    },
    icons: [
      {
        position: {
          x: -0.5,
          y: -0.105,
          z: -0.008,
        },
        src: leftClick,
        action: {
          type: "REDIRECT",
          nextScene: "hall",
        },
      },
    ],
  },
  {
    id: "hall",
    path: "/cubeMap/hall",
    cameraPosition: {
      x: 0.0003302145709619939,
      y: 0.00008642886498814042,
      z: -0.001698083740108611,
    },
    icons: [
      {
        position: { x: -0.5, y: 0.0164, z: 0.3988 },
        src: leftClick,
        action: {
          type: "REDIRECT",
          nextScene: "brown",
        },
      },
    ],
  },
];

onMounted(() => {
  width.value = window.innerWidth;
  height.value = window.innerHeight;
  camera = new THREE.PerspectiveCamera(
    baseFov,
    width.value / height.value,
    0.01,
    1
  );

  if (currentScene.value) {
    if (currentScene.value?.cameraPosition) {
      camera.position.copy(currentScene.value?.cameraPosition);
    } else {
      camera.position.set(0.001, 0.001, 0.001);
    }
    const textures = getTextures(currentScene.value?.path);
    textureCache.set(currentScene.value?.id, textures);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, textures);
    scene.add(mesh);

    currentScene.value.icons.forEach((icon) => {
      icons.push(
        createIcon(
          icon.position,
          leftClick,
          scene,
          { scaleX: 0.05, scaleY: 0.05 },
          icon.action
        )
      );
    });
  }

  // Create renderer
  renderer = createRenderer(width.value, height.value);
  renderer.setAnimationLoop(animation);

  // Add renderer to container
  container.value?.appendChild(renderer.domElement);

  // Create orbit control
  controls = createControl(camera, renderer);

  // Add event listener
  addEventListener();
});

function animation() {
  renderer.render(scene, camera);
  controls.update();
}

const changeScene = (id: string) => {
  const newScene = scenes.find((v) => v.id === id);
  if (sceneId.value === id || !newScene) return;
  sceneId.value = id;

  // ✅ 先检查缓存
  let newTexture = textureCache.get(id);
  if (!newTexture) {
    console.log(`🕵️ 纹理未缓存，开始加载: ${id}`);
    newTexture = getTextures(newScene.path);
    textureCache.set(newScene.id, newTexture);
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry, newTexture);
  clearIcon();
  scene.add(mesh);
  newScene.icons.forEach((icon) => {
    icons.push(
      createIcon(
        icon.position,
        leftClick,
        scene,
        { scaleX: 0.05, scaleY: 0.05 },
        icon.action
      )
    );
  });
};

const iconCallback = (payload: Record<string, any>) => {
  console.log(payload);

  switch (payload.type) {
    case "REDIRECT":
      changeScene(payload.nextScene);
      break;

    default:
      break;
  }
};

const clearIcon = () => {
  icons.forEach((icon) => {
    scene.remove(icon);
    icon.material.dispose(); // 释放纹理
    icon.geometry && icon.geometry.dispose();
  });
  icons = [];
};

const getTextures = (path: string) => {
  const manager = createManager();
  return [
    loadTexture(`${path}/px.jpg`, manager), // 右 (Positive X)
    loadTexture(`${path}/nx.jpg`, manager), // 左 (Negative X)
    loadTexture(`${path}/py.jpg`, manager), // 上 (Positive Y)
    loadTexture(`${path}/ny.jpg`, manager), // 下 (Negative Y)
    loadTexture(`${path}/pz.jpg`, manager), // 前 (Positive Z)
    loadTexture(`${path}/nz.jpg`, manager), // 后 (Negative Z)
  ];
};

const addEventListener = () => {
  renderer.domElement.addEventListener(
    "wheel",
    handleOnWheel({ loading, currentFov, camera })
  );
  renderer.domElement.addEventListener("mousedown", handleMouseDown);
  // 绑定点击事件
  renderer.domElement.addEventListener(
    "mouseup",
    handleMouseUp({
      raycaster,
      scene,
      icons,
      camera,
      iconCallback,
    })
  );
  window.addEventListener(
    "resize",
    handleOnResize({ width, height, camera, renderer })
  );
};
</script>
