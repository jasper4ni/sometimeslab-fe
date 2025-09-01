<template>
  <div ref="container"></div>
  <div
    :class="{ 'loading-overlay-active': loading }"
    class="loading-overlay"
  ></div>
</template>
<script setup lang="ts">
import gsap from "gsap";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import leftClick from "~/assets/icons/left-click.png";
import type { SCENE } from "~/composables/types";

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
const materialsCache: Map<string, THREE.MeshBasicMaterial[]> = new Map(); // 预加载的纹理缓存
const materials = ref<THREE.MeshBasicMaterial[]>([]);
// let isAnimating = true;
const baseFov = 75; // 🟢 你原来的 FOV
const currentFov = ref(baseFov);
const baseIconScale = 0.045; // 🟢 这个是 icon 的基础大小
let mesh: THREE.Mesh;
const currentScene = computed(() => {
  return scenes.find((scene) => scene.id === sceneId.value);
});

const scenes: SCENE[] = [
  {
    id: "brown",
    path: "/cubeMap/brown",
    cameraPosition: { x: 0.0016, y: 0.0, z: 0.0008 },
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

watch(currentFov, (newFov: number) => {
  // 🚀 计算 icon 缩放比例，使其在 FOV 变化时保持大小
  const newIconScale = baseIconScale * (newFov / baseFov);

  if (!loading.value) {
    // 计算新的旋转速度，确保拖动一致性
    const newRotateSpeed = getNewRotateSpeedByFov(newFov);
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
  // Create renderer
  renderer = createRenderer(width.value, height.value);

  if (currentScene.value) {
    if (currentScene.value?.cameraPosition) {
      camera.position.copy(currentScene.value?.cameraPosition);
    } else {
      camera.position.set(0.001, 0.001, 0.001);
    }
    const manager = createManager(() => {
      if (currentScene.value) {
        preloadScenes(currentScene.value);
      }
    });
    materials.value = getMaterials(currentScene.value?.path, manager);
    materialsCache.set(currentScene.value?.id, materials.value);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    mesh = new THREE.Mesh(geometry, materials.value);
    scene.add(mesh);

    currentScene.value.icons.forEach((icon) => {
      icons.push(
        createIcon(
          icon.position,
          leftClick,
          scene,
          { scaleX: baseIconScale, scaleY: baseIconScale },
          icon.action
        )
      );
    });
  }

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

const changeScene = async (id: string) => {
  const newScene = scenes.find((v) => v.id === id);
  if (sceneId.value === id || !newScene) return;
  // sceneId.value = id;
  loading.value = true;

  controls.rotateSpeed = 0;
  controls.update();

  // const { x, y, z } = newScene.cameraPosition;
  // camera.position.set(x, y, z);
  // camera.updateProjectionMatrix();

  // ✅ 先检查缓存
  let newMaterials: THREE.MeshBasicMaterial[];
  const cache = materialsCache.get(id);
  if (!cache) {
    console.log(`🕵️ 纹理未缓存，开始加载: ${id}`);
    newMaterials = getMaterials(newScene.path);
    materialsCache.set(newScene.id, newMaterials);
  } else {
    newMaterials = cache;
  }

  // ✅ 2. 初始化新材质（初始透明）
  newMaterials.forEach((mat) => {
    mat.transparent = true;
    mat.opacity = 0; // Start invisible
  });
  // ✅ 3. 创建临时 Mesh 用于新场景（叠加在旧场景上）
  const tempMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), newMaterials);
  tempMesh.visible = false;
  scene.add(tempMesh); // 先添加，再淡入
  tempMesh.visible = true;
  await sceneReplace(newMaterials, tempMesh, newScene);
  controls.rotateSpeed = getNewRotateSpeedByFov(baseFov);
  controls.update();
  rerenderIcons(newScene);
  currentFov.value = baseFov;
  loading.value = false;

  // if (camera.fov > baseFov) {
  //   // 🔹 FOV 大于 75，先缩小 FOV 再切换场景
  //   gsap.to(camera, {
  //     fov: baseFov,
  //     duration: 0.4,
  //     ease: "power2.out",
  //     onUpdate: () => {
  //       camera.updateProjectionMatrix();
  //       const newIconScale = baseIconScale * (camera.fov / baseFov);

  //       icons.forEach((icon) => {
  //         icon.scale.set(newIconScale, newIconScale, 2);
  //       });
  //     },
  //     onComplete: async () => {
  //       tempMesh.visible = true;
  //       await sceneReplace(newMaterials, tempMesh, newScene);
  //       controls.rotateSpeed = getNewRotateSpeedByFov(baseFov);
  //       controls.update();
  //       rerenderIcons(newScene);
  //       currentFov.value = baseFov;
  //       loading.value = false;
  //     },
  //   });
  // } else if (camera.fov < baseFov) {
  //   tempMesh.visible = true;
  //   await sceneReplace(newMaterials, tempMesh, newScene);
  //   // 🔹 FOV 小于 75，先切换场景再调整 FOV
  //   gsap.to(camera, {
  //     fov: baseFov,
  //     duration: 1,
  //     ease: "power2.out",
  //     onUpdate: () => {
  //       camera.updateProjectionMatrix();
  //     },
  //     onComplete: () => {
  //       controls.rotateSpeed = getNewRotateSpeedByFov(baseFov);
  //       controls.update();
  //       rerenderIcons(newScene);
  //       currentFov.value = baseFov;
  //       loading.value = false;
  //     },
  //   });
  // } else {
  //   tempMesh.visible = true;
  //   await sceneReplace(newMaterials, tempMesh, newScene);
  //   controls.rotateSpeed = getNewRotateSpeedByFov(baseFov);
  //   controls.update();
  //   rerenderIcons(newScene);
  //   currentFov.value = baseFov;
  //   loading.value = false;
  // }
  sceneId.value = id;
};

const sceneReplace = async (
  newMaterials: THREE.MeshBasicMaterial[],
  tempMesh: THREE.Mesh,
  newScene: SCENE
) => {
  const { x, y, z } = newScene.cameraPosition;
  // ✅ 4. 同时淡出旧材质 + 淡入新材质
  await Promise.all([
    // 淡出旧场景
    // gsap.to(materials.value, {
    //   opacity: 0,
    //   duration: 1.0, // 调整时间
    //   ease: "power2.out",
    //   onUpdate: () => {
    //     materials.value.forEach((m) => (m.needsUpdate = true));
    //   },
    // }),
    // 淡入新场景
    gsap.to(newMaterials, {
      opacity: 1,
      duration: 0.5, // 调整时间
      ease: "power2.in",
      onUpdate: () => {
        newMaterials.forEach((m) => (m.needsUpdate = true));
      },
      onComplete: () => {
        // ✅ 5. 移除旧 Mesh，替换为新 Mesh
        scene.remove(mesh); // 移除旧场景

        camera.position.set(x, y, z);
        camera.updateProjectionMatrix();
        mesh = tempMesh; // 更新引用
        materials.value = newMaterials;
        loading.value = false;
      },
    }),
    gsap.to(
      icons.map((icon) => icon.material),
      {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
        onUpdate: () => {
          icons.forEach((icon) => {
            icon.material.transparent = true;
            icon.material.needsUpdate = true;
          });
        },
      }
    ),
  ]);
};

const rerenderIcons = (newScene: SCENE) => {
  clearIcon();
  const newIconScale = baseIconScale * (currentFov.value / baseFov);
  newScene.icons.forEach((icon) => {
    const sprite = createIcon(
      icon.position,
      leftClick,
      scene,
      { scaleX: newIconScale, scaleY: newIconScale },
      icon.action
    );
    sprite.material.opacity = 0; // 初始透明
    gsap.to(sprite.material, {
      opacity: 1,
      duration: 0.5,
      ease: "power2.in",
    });
    icons.push(sprite);
  });
};

const iconCallback = (payload: Record<string, any>) => {
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

const getMaterials = (path: string, manager?: THREE.LoadingManager) => {
  if (!manager) {
    manager = createManager();
  }
  return [
    loadTexture(`${path}/px.jpg`, manager, renderer), // 右 (Positive X)
    loadTexture(`${path}/nx.jpg`, manager, renderer), // 左 (Negative X)
    loadTexture(`${path}/py.jpg`, manager, renderer), // 上 (Positive Y)
    loadTexture(`${path}/ny.jpg`, manager, renderer), // 下 (Negative Y)
    loadTexture(`${path}/pz.jpg`, manager, renderer), // 前 (Positive Z)
    loadTexture(`${path}/nz.jpg`, manager, renderer), // 后 (Negative Z)
  ];
};

const preloadScenes = (scene: SCENE) => {
  const scenesToPreload = scene.icons
    .filter((icon) => icon.action.type === "REDIRECT")
    .map((icon) => {
      return icon.action;
    });

  scenesToPreload.forEach((value) => {
    // ✅ 先检查缓存
    let newMaterials: THREE.MeshBasicMaterial[];
    const cache = materialsCache.get(value.nextScene);
    if (!cache) {
      const newScene = scenes.find((v) => v.id === value.nextScene);
      if (newScene) {
        console.log(`🕵️ 纹理未缓存，开始加载: ${value.nextScene}`);
        newMaterials = getMaterials(newScene.path);
        materialsCache.set(value.nextScene, newMaterials);
      }
    }
  });
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
      getIcon: () => icons,
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

<style lang="scss" scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #e5e5e5;
  animation: overlay 0.2s ease-out forwards;
  &-active {
    animation: overlay-active 0.3s ease-in forwards;
  }
}
@keyframes overlay-active {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes overlay {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
    display: none;
  }
}
</style>
