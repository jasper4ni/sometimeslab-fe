<template>
  <div ref="container">
    <!-- <div
      v-if="loading"
      class="fixed h-full w-full top-0 left-0 bg-black/25 flex items-center justify-center z-[999]"
    >
      Loading...
    </div> -->
  </div>
</template>
<script setup lang="ts">
import gsap from "gsap";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import leftClick from "~/assets/icons/left-click.png";

// 绑定 DOM 元素
const container = ref<HTMLElement | null>(null);
const loading = ref(false);
const sceneId = ref("brown");
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const scene = new THREE.Scene();
const width = ref();
const height = ref();
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let icons: Array<THREE.Sprite> = [];
// const textureCache = new Map(); // 预加载的纹理缓存
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

onMounted(() => {
  width.value = window.innerWidth;
  height.value = window.innerHeight;
  camera = new THREE.PerspectiveCamera(
    baseFov,
    width.value / height.value,
    0.01,
    1
  );
  camera.position.set(0.001, 0.001, 0.001);

  const path = "/cubeMap/brown";
  const textures = [
    loadTexture(`${path}/px.jpg`), // 右 (Positive X)
    loadTexture(`${path}/nx.jpg`), // 左 (Negative X)
    loadTexture(`${path}/py.jpg`), // 上 (Positive Y)
    loadTexture(`${path}/ny.jpg`), // 下 (Negative Y)
    loadTexture(`${path}/pz.jpg`), // 前 (Positive Z)
    loadTexture(`${path}/nz.jpg`), // 后 (Negative Z)
  ];

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const mesh = new THREE.Mesh(geometry, textures);
  scene.add(mesh);

  // Create renderer
  renderer = createRenderer(width.value, height.value);
  renderer.setAnimationLoop(animation);

  // Add renderer to container
  container.value?.appendChild(renderer.domElement);

  // Create orbit control
  controls = createControl(camera, renderer);

  // Add event listener
  addEventListener();

  icons.push(
    createIcon(
      { x: -0.5, y: -0.10500169689345348, z: -0.008895084037684249 },
      leftClick,
      scene,
      { scaleX: 0.05, scaleY: 0.05 },
      { sceneId: sceneId.value }
    )
  );
});

function animation() {
  renderer.render(scene, camera);
  controls.update();
}

const addEventListener = () => {
  renderer.domElement.addEventListener(
    "wheel",
    handleOnWheel({ loading, currentFov, camera })
  );
  renderer.domElement.addEventListener("mousedown", handleMouseDown);
  // 绑定点击事件
  renderer.domElement.addEventListener(
    "mouseup",
    handleMouseUp({ raycaster, mouse, scene, icons, camera })
  );
};
</script>
