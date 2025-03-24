import gsap from "gsap";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const iconCache = {}; // 贴图缓存

export function createCamera(width, height, FOV = 75) {
  const camera = new THREE.PerspectiveCamera(
    FOV, // 视角（FOV）
    width / height, // 纵横比
    0.1, // 近裁剪面
    5000 // 远裁剪面
  );
  camera.position.set(-0.01, 199.9, 0.01); // 防止 OrbitControls 报错
  return camera;
}

export function createRenderer(width, height) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio); // 适配高分屏
  renderer.setSize(width, height);
  return renderer;
}

export function createManager(recall) {
  // 监听所有资源加载完成
  const manager = new THREE.LoadingManager();
  manager.onLoad = function () {
    console.log("✅ 所有资源加载完毕！");
    if (recall) recall();
  };

  // 监听加载进度
  manager.onProgress = function (url, loaded, total) {
    console.log(`📦 加载进度: ${loaded} / ${total} - ${url}`);
  };

  // 监听加载错误
  manager.onError = function (url) {
    console.error(`❌ 资源加载失败: ${url}`);
  };

  return manager;
}

export function createTexture(manager, src) {
  const textureLoader = new THREE.TextureLoader(manager);
  // 替换成你的全景图片路径
  const texture = textureLoader.load(src, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace; // 设置正确的颜色空间
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false; // 禁用 Mipmaps，减少模糊
  });

  return [textureLoader, texture];
}

export function createSphere(texture) {
  const geometry = new THREE.SphereGeometry(500, 128, 128);
  geometry.scale(-1, 1, 1); // 反转球体，使纹理在内部可见
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide, // 让纹理出现在球体内部
  });
  return [new THREE.Mesh(geometry, material), material];
}

export function createIcon(
  { x, y, z },
  iconPath,
  scene,
  { scaleX, scaleY },
  payload
) {
  let iconTexture = iconCache[iconPath];
  if (!iconTexture) {
    iconTexture = new THREE.TextureLoader().load(iconPath);
    iconCache[iconPath] = iconTexture;
  }

  const spriteMaterial = new THREE.SpriteMaterial({
    map: iconTexture,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(scaleX, scaleY, 1); // 控制 icon 大小
  sprite.position.set(x, y, z); // 设置 icon 坐标
  // 添加点击事件
  sprite.userData = payload;
  scene.add(sprite);
  // 透明度变化
  gsap.fromTo(
    sprite.material,
    { opacity: 0 },
    {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    }
  );
  return sprite;
}

export function createControl(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true; // 启用惯性
  controls.dampingFactor = 0.1; // 适中的阻尼
  controls.rotateSpeed = -0.5; // 旋转速度
  controls.enableZoom = false; // ❌ 禁用默认缩放，改用自定义插值缩放
  controls.enablePan = false; // 禁止平移
  controls.minDistance = 30; // 允许无限接近目标
  controls.maxDistance = 300; // 允许放得更大

  return controls;
}

export function loadScene(scene, src, manager) {
  // 清空当前场景
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  // 新场景
  const texture = createTexture(manager, src);
  // 创建球体并应用贴图
  const [sphere, material] = createSphere(texture);
  scene.add(sphere);
  console.log("🎉 加载了新场景");
}
