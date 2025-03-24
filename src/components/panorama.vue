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
<script setup>
import gsap from "gsap";
import * as THREE from "three";
import { computed, onMounted, onUnmounted, ref } from "vue";
import leftClick from "~/assets/icons/left-click.png";

// 绑定 DOM 元素
const container = ref(null);
const loading = ref(true);
const sceneId = ref("brown");
const currentScene = computed(() => {
  return scenes.find((v) => v.id === sceneId.value);
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const scenes = [
  {
    id: "brown",
    texture: "/panorama/brown.jpg",
    cameraPosition: {
      x: -66.84013431187826,
      y: 12.270295911142227,
      z: -188.10060149670795,
    },
    icons: [
      {
        x: 358.06,
        y: -135.27,
        z: -317.89,
        icon: leftClick,
        nextId: "studio",
      },
      {
        x: -392.56,
        y: 61.37,
        z: -303.28,
        icon: leftClick,
        nextId: "studio",
      },
    ],
  },
  {
    id: "studio",
    texture: "/panorama/studio.jpg",
    cameraPosition: {
      x: 135.16796572875197,
      y: -1.4226103449049003,
      z: -147.4028399338302,
    },
    icons: [
      {
        x: -12.83,
        y: 5.31,
        z: -499.61,
        icon: leftClick,
        nextId: "brown",
      },
      {
        x: 96.04,
        y: -11.66,
        z: 490.5,
        icon: leftClick,
        nextId: "brown",
      },
    ],
  },
];

// 创建场景
const scene = new THREE.Scene();
const width = ref();
const height = ref();

let camera = null;
let material = null;
let renderer = null;
let controls = null;
let textureLoader = null;
let icons = [];
let onResize = null;
let onMouseUp = null;
let onMouseDown = null;
let onWheel = null;
let mouseDownPosition = { x: 0, y: 0 };
const dragThreshold = 5;
const textureCache = new Map(); // 预加载的纹理缓存
let isAnimating = true;
const baseFov = 75; // 🟢 你原来的 FOV
const minFov = 30;
const maxFov = 100;
const currentFov = ref(baseFov);
const baseSpeed = 10; // 🟢 你可以调整这个基准速度
const baseIconScale = 50; // 🟢 这个是 icon 的基础大小

watch(currentFov, (newFov) => {
  // 🚀 计算 icon 缩放比例，使其在 FOV 变化时保持大小
  const newIconScale = baseIconScale * (newFov / baseFov);

  if (!loading.value) {
    // 计算新的旋转速度，确保拖动一致性
    let newRotateSpeed = controls.rotateSpeed * (newFov / camera.fov);

    // 限制 rotateSpeed 最小值（最多不超过 -0.5）
    newRotateSpeed = Math.max(-0.5, Math.min(-0.2, newRotateSpeed)); // 约束范围

    gsap.to(controls, {
      rotateSpeed: newRotateSpeed, // 🔥 关键调整点
      duration: 0.5,
      ease: "power2.out",
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
  camera = createCamera(width.value, height.value, 120);
  // ✅ 避免多次创建 renderer
  if (!renderer) {
    renderer = createRenderer(width.value, height.value);
    container.value.appendChild(renderer.domElement);
  }
  // 绑定 OrbitControls
  controls = createControl(camera, renderer);
  controls.rotateSpeed = 0;
  controls.update();
  if (!onWheel) {
    onWheel = (event) => {
      event.preventDefault();
      if (loading.value) return;
      const zoomFactor = event.deltaY > 0 ? 1.2 : 0.8; // 🟢 **指数缩放**
      currentFov.value = camera.fov * zoomFactor;

      // 计算新的平移速度，让它随着 FOV 变化
      const newSpeed = baseSpeed * (currentFov.value / maxFov); // 🔥 FOV 越小，速度越慢
      // 限制 FOV 范围，避免太小或太大
      currentFov.value = Math.max(minFov, Math.min(maxFov, currentFov.value));

      // 🚀 使用 gsap 平滑过渡
      gsap.to(camera, {
        fov: currentFov.value,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => camera.updateProjectionMatrix(), // 🔥 记得更新投影矩阵
      });

      // 🚀 平滑调整 OrbitControls 的平移速度
      gsap.to(controls, {
        maxSpeed: newSpeed, // 这个参数可能需要根据你的控件库调整
        duration: 0.5,
        ease: "power2.out",
      });
    };
    // 🚀 监听滚轮事件，修改 targetZoom
    renderer.domElement.addEventListener("wheel", onWheel);
  }

  // 贴图加载管理器
  const manager = createManager(() => {
    animate();
    // 动画：放大视角
    gsap.to(camera, {
      fov: 75, // 目标FOV
      duration: 2, // 3秒完成动画
      ease: "power2.out",
      onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => {
        loading.value = false;
        controls.rotateSpeed = -0.5;
        controls.update();
        preloadScenes(scenes);
      },
    });
  });

  // 加载全景图
  const [textureLoaderValue, texture] = createTexture(
    manager,
    currentScene.value.texture
  );
  textureLoader = textureLoaderValue;
  textureCache.set(sceneId.value, texture);

  const [sphere, materialValue] = createSphere(texture);
  material = materialValue;
  scene.add(sphere);

  // 创建 icons
  icons = currentScene.value.icons.map(({ x, y, z, icon, nextId }) => {
    return createIcon(
      x,
      y,
      z,
      icon,
      scene,
      scenes.find((v) => v.id === nextId)
    );
  });

  // Init default camera position
  resetCameraPosition();

  // ✅ 确保事件只绑定一次
  if (!onResize) {
    onResize = () => {
      width.value = window.innerWidth;
      height.value = window.innerHeight;
      camera.aspect = width.value / height.value;
      camera.updateProjectionMatrix();
      renderer.setSize(width.value, height.value);
    };
    window.addEventListener("resize", onResize);
  }

  if (!onMouseDown) {
    onMouseDown = (event) => {
      mouseDownPosition = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("mousedown", onMouseDown);
  }

  if (!onMouseUp) {
    onMouseUp = (event) => {
      if (loading.value) return;
      const dx = event.clientX - mouseDownPosition.x;
      const dy = event.clientY - mouseDownPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      mouse.x = (event.clientX / width.value) * 2 - 1;
      mouse.y = -(event.clientY / height.value) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersectsScene = raycaster.intersectObjects(scene.children);

      if (intersectsScene.length > 0) {
        const intersectPoint = intersectsScene[0].point;
        console.log("鼠标指向的3D坐标:", intersectPoint);
        console.log("当前相机位置:", {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        });
      }

      if (distance < dragThreshold) {
        const intersects = raycaster.intersectObjects(icons);

        if (intersects.length > 0) {
          const selectedIcon = intersects[0].object;
          switchScene(selectedIcon.userData.id, selectedIcon.userData.icons);
        }
      }
    };
    window.addEventListener("mouseup", onMouseUp);
  }

  function animate() {
    if (!isAnimating || !renderer) return; // 停止循环
    requestAnimationFrame(animate);
    // if (loading.value) return; // ✅ 场景加载中不渲染，避免卡顿

    controls.update();
    renderer.render(scene, camera);
  }
});

function switchScene(newSceneId, newIcons) {
  loading.value = true;
  const targetFov = 75;
  controls.rotateSpeed = 0;
  controls.update();
  const newTexture = changeScene(newSceneId);

  if (camera.fov > targetFov) {
    // 🔹 FOV 大于 75，先缩小 FOV 再切换场景
    gsap.to(camera, {
      fov: targetFov,
      duration: 1.5,
      ease: "power2.out",
      onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => {
        finalizeScene(newTexture, newIcons);
        loading.value = false;
        controls.rotateSpeed = -0.5;
        controls.update();
        currentFov.value = targetFov;
      },
    });
  } else if (camera.fov < targetFov) {
    // 🔹 FOV 小于 75，先切换场景再调整 FOV
    finalizeScene(newTexture, newIcons);
    gsap.to(camera, {
      fov: targetFov,
      duration: 1.5,
      ease: "power2.out",
      onUpdate: () => camera.updateProjectionMatrix(),
      onComplete: () => {
        loading.value = false;
        controls.rotateSpeed = -0.5;
        controls.update();
        currentFov.value = targetFov;
      },
    });
  } else {
    // 🔹 FOV 正好是 75，直接切换场景
    finalizeScene(newTexture, newIcons);
  }
}

function changeScene(newSceneId) {
  if (sceneId.value === newSceneId) return; // 避免重复加载
  sceneId.value = newSceneId;

  // ✅ 先检查缓存
  let newTexture = textureCache.get(newSceneId);
  if (!newTexture) {
    console.log(`🕵️ 纹理未缓存，开始加载: ${newSceneId}`);
    newTexture = textureLoader.load(
      scenes.find((v) => v.id === newSceneId).texture,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(newSceneId, texture);
        resolve(texture);
      }
    );
  }
  return newTexture;
}

function finalizeScene(newTexture, newIcons) {
  if (material.map !== newTexture) {
    material.map = newTexture;
    material.needsUpdate = true;
  }
  // ✅ 切换场景后重置相机
  resetCameraPosition();
  rerenderIcons(newIcons);
}

function rerenderIcons(newIcons) {
  while (icons.length > newIcons.length) {
    const icon = icons.pop();
    scene.remove(icon);
  }
  newIcons.forEach(({ x, y, z, icon, nextId }, index) => {
    if (icons[index]) {
      icons[index].position.set(x, y, z);
      icons[index].userData = scenes.find((v) => v.id === nextId);
    } else {
      icons.push(
        createIcon(
          x,
          y,
          z,
          icon,
          scene,
          scenes.find((v) => v.id === nextId)
        )
      );
    }
  });
  loading.value = false;
}

function resetCameraPosition() {
  const sceneConfig = scenes.find((s) => s.id === sceneId.value);
  if (sceneConfig && sceneConfig.cameraPosition) {
    const { x, y, z } = sceneConfig.cameraPosition;

    // ✅ 设置相机位置
    camera.position.set(x, y, z);

    // ✅ 让 OrbitControls 目标点归零，确保相机朝向正确
    controls.target.set(0, 0, 0);

    // ✅ 立即更新控件
    controls.update();
  }
}

function preloadScenes(scenesToPreload) {
  // ✅ 预加载所有场景纹理
  scenesToPreload.forEach((scene) => {
    if (!textureCache.has(scene.id)) {
      const texture = textureLoader.load(scene.texture, () => {
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(scene.id, texture);
        console.log(`✅ 预加载完成: ${scene.id}`);
      });
    }
  });
}

// ✅ 组件销毁时移除事件监听
onUnmounted(() => {
  isAnimating = false; // 让 animate 停止执行
  if (onResize) {
    window.removeEventListener("resize", onResize);
    onResize = null;
  }
  if (onMouseUp) {
    window.removeEventListener("mouseup", onMouseUp);
    onMouseUp = null;
  }
  if (onMouseDown) {
    window.removeEventListener("mousedown", onMouseDown);
    onMouseDown = null;
  }

  // ✅ 释放 Three.js 资源，防止内存泄漏
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => mat.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });

  if (renderer) {
    if (renderer.domElement) {
      renderer.domElement.removeEventListener("wheel", onWheel);
      onWheel = null;
    }
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
  }
});
</script>
