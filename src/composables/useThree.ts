import gsap from "gsap";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const iconCache = new Map<string, THREE.Texture>(); // 贴图缓存

export function createCamera(width: number, height: number, FOV = 75) {
  const camera = new THREE.PerspectiveCamera(
    FOV, // 视角（FOV）
    width / height, // 纵横比
    0.1, // 近裁剪面
    5000 // 远裁剪面
  );
  camera.position.set(-0.01, 199.9, 0.01); // 防止 OrbitControls 报错
  return camera;
}

export function createRenderer(width: number, height: number) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio); // 适配高分屏
  renderer.setSize(width, height);
  return renderer;
}

export function createManager(recall: Function) {
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

export function createTexture(manager: THREE.LoadingManager, src: string) {
  const textureLoader = new THREE.TextureLoader(manager);
  // 替换成你的全景图片路径
  const texture = textureLoader.load(src, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace; // 设置正确的颜色空间
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false; // 禁用 Mipmaps，减少模糊
  });

  return texture;
}

export function createSphere(texture: THREE.Texture) {
  const geometry = new THREE.SphereGeometry(500, 128, 128);
  geometry.scale(-1, 1, 1); // 反转球体，使纹理在内部可见
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide, // 让纹理出现在球体内部
  });
  return [new THREE.Mesh(geometry, material), material];
}

export function createCubeTexture(manager: THREE.LoadingManager, path: string) {
  const loader = new THREE.CubeTextureLoader(manager);
  return loader.load([
    `${path}/px.jpg`, // 右 (Positive X)
    `${path}/nx.jpg`, // 左 (Negative X)
    `${path}/py.jpg`, // 上 (Positive Y)
    `${path}/ny.jpg`, // 下 (Negative Y)
    `${path}/pz.jpg`, // 前 (Positive Z)
    `${path}/nz.jpg`, // 后 (Negative Z)
  ]);
}

export function createIcon(
  { x, y, z }: { x: number; y: number; z: number },
  iconPath: string,
  scene: THREE.Scene,
  { scaleX, scaleY }: { scaleX: number; scaleY: number },
  payload: Object
) {
  let iconTexture = iconCache.get(iconPath);
  if (!iconTexture) {
    iconTexture = new THREE.TextureLoader().load(iconPath);
    iconCache.set(iconPath, iconTexture);
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

export function createControl(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true; // 启用惯性
  controls.dampingFactor = 0.1; // 适中的阻尼
  controls.rotateSpeed = -0.3; // 旋转速度
  controls.enableZoom = false; // ❌ 禁用默认缩放，改用自定义插值缩放
  controls.enablePan = false; // 禁止平移
  // controls.minDistance = 30; // 允许无限接近目标
  // controls.maxDistance = 300; // 允许放得更大

  return controls;
}

export const loadTexture = (url: string) => {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace; // 设置正确的颜色空间
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false; // 禁用 Mipmaps，减少模糊
  });
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
  material.depthTest = false;
  material.depthWrite = false;
  return material;
};
