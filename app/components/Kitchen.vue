<template>
  <div ref="container"></div>
  <!-- Label -->
  <div
    ref="label"
    class="absolute bg-black text-white px-2 py-1 rounded"
    style="display: none; position: absolute"
  ></div>
</template>
<script setup>
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// const controls = new OrbitControls(camera, renderer.domElement);
// const loader = new GLTFLoader();

const container = ref(null);
const label = ref(null);

onMounted(() => {
  // 创建场景
  const scene = new THREE.Scene();

  // 添加环境光（让模型更真实）
  const light = new THREE.AmbientLight(0xffffff, 3);
  scene.add(light);

  // 创建相机
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 5); // 调整相机位置

  const cameraSpeed = 0.1; // 移动速度
  // 渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio); // 适配高分屏
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.value.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // 启用阻尼（惯性效果）
  controls.dampingFactor = 0.05;
  controls.enableZoom = true; // 允许缩放

  // 加载 3D 模型
  const loader = new GLTFLoader();
  let model;

  loader.load("/models/modern_kitchen_counter.glb", (gltf) => {
    model = gltf.scene;
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.material.side = THREE.DoubleSide; // 解决某些面不可见的问题
        if (child.material.map) {
          child.material.map.encoding = THREE.sRGBEncoding;
          child.material.map.flipY = false;
        }
      }
    });

    model.scale.set(1, 1, 1); // 调整模型大小
    // scene.add(model);
    scene.add(gltf.scene);

    // 指定特定的 Hover 位置（例如模型的某个部位）
    const hoverPoints = [
      {
        name: "前门",
        position: new THREE.Vector3(
          -0.9657658056350513,
          1.1296407119668672,
          0.9938554001409486
        ),
      },
      // { name: "窗户", position: new THREE.Vector3(-1, 1, 0) },
    ];

    hoverPoints.forEach((point) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.1), // 用小球表示 Hover 目标
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      sphere.position.copy(point.position);
      sphere.userData = { label: point.name }; // 绑定 Label 数据
      scene.add(sphere);
    });

    // 鼠标检测
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseMove(event) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);

      if (intersects.length > 0) {
        const hoveredObject = intersects[0].object;
        if (hoveredObject.userData.label) {
          label.value.style.display = "block";
          label.value.innerText = hoveredObject.userData.label;
          label.value.style.left = `${event.clientX + 10}px`;
          label.value.style.top = `${event.clientY + 10}px`;
        } else {
          label.value.style.display = "none";
        }
      } else {
        label.value.style.display = "none";
      }
    }

    window.addEventListener("mousemove", onMouseMove);
  });

  // // 监听键盘输入
  // const keys = {
  //   w: false,
  //   a: false,
  //   s: false,
  //   d: false,
  //   ArrowUp: false,
  //   ArrowLeft: false,
  //   ArrowDown: false,
  //   ArrowRight: false,
  // };

  // // 监听按键按下
  // window.addEventListener("keydown", (event) => {
  //   if (keys.hasOwnProperty(event.key)) keys[event.key] = true;
  // });

  // // 监听按键松开
  // window.addEventListener("keyup", (event) => {
  //   if (keys.hasOwnProperty(event.key)) keys[event.key] = false;
  // });

  // 旋转动画
  function animate() {
    requestAnimationFrame(animate);

    // // 计算相机前进方向
    // const direction = new THREE.Vector3();
    // camera.getWorldDirection(direction);

    // // WASD / 方向键 控制相机移动
    // if (keys.w || keys.ArrowUp)
    //   camera.position.addScaledVector(direction, cameraSpeed);
    // if (keys.s || keys.ArrowDown)
    //   camera.position.addScaledVector(direction, -cameraSpeed);
    // if (keys.a || keys.ArrowLeft) camera.position.x -= cameraSpeed; // 左移
    // if (keys.d || keys.ArrowRight) camera.position.x += cameraSpeed; // 右移

    controls.update(); // 更新控制器
    // model.rotation.y += 0.001; // 让模型缓慢旋转
    renderer.render(scene, camera);
  }
  animate();

  // // 创建 Raycaster 和鼠标向量
  // const raycaster = new THREE.Raycaster();
  // const mouse = new THREE.Vector2();

  // // 监听鼠标移动事件
  // window.addEventListener("mousemove", (event) => {
  //   // 计算鼠标位置 (归一化到 -1 到 1 之间)
  //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  //   // 更新 Raycaster
  //   if (model) {
  //     raycaster.setFromCamera(mouse, camera);
  //     const intersects = raycaster.intersectObject(model, true);

  //     if (intersects.length > 0) {
  //       const intersectPoint = intersects[0].point;
  //       console.log("鼠标指向的3D坐标:", intersectPoint);
  //     }
  //   }
  // });
});
</script>
