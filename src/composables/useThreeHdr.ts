import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export function createHdrRenderer(width: number, height: number) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio); // 适配高分屏
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return renderer;
}

export function createHdrTexture(manager: THREE.LoadingManager, src: string) {
  const rgbeLoader = new RGBELoader(manager);
  const texture = rgbeLoader.load(src, (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping; // 让 HDR 作为环境贴图
  });
  return texture;
}

export function createHdrSphere() {
  const geometry = new THREE.SphereGeometry(500, 128, 128);
  geometry.scale(-1, 1, 1); // 反转球体，使纹理在内部可见
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, // 颜色
    metalness: 1.0, // 金属度（0-1）
    roughness: 0.5, // 粗糙度（0-1）
  });
  return [new THREE.Mesh(geometry, material), material];
}
