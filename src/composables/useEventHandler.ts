import * as THREE from "three";
import type { Ref } from "vue";

interface HandleOnWheelParams {
  loading: Ref<boolean>;
  currentFov: Ref<number>;
  camera: THREE.PerspectiveCamera;
}
interface HandleMouseUpParams {
  raycaster: THREE.Raycaster;
  scene: THREE.Scene;
  mouse: THREE.Vector2;
  icons: Array<THREE.Sprite>;
  camera: THREE.PerspectiveCamera;
}

const minFov = 30;
const maxFov = 100;
const dragThreshold = 5;
const mouseDownPosition = { x: 0, y: 0 };

export const handleOnWheel = ({
  loading,
  currentFov,
  camera,
}: HandleOnWheelParams) => {
  return (event: WheelEvent) => {
    event.preventDefault();
    if (loading.value) return;
    const zoomFactor = event.deltaY > 0 ? 1.2 : 0.8; // 🟢 **指数缩放**
    currentFov.value = camera.fov * zoomFactor;
    currentFov.value = Math.max(minFov, Math.min(maxFov, currentFov.value));
  };
};

export const handleMouseDown = (event: MouseEvent) => {
  mouseDownPosition.x = event.clientX;
  mouseDownPosition.y = event.clientY;
};

export const handleMouseUp = ({
  raycaster,
  scene,
  mouse,
  icons,
  camera,
}: HandleMouseUpParams) => {
  return (event: MouseEvent) => {
    console.log("当前相机位置:", { ...camera.position });
    // 计算鼠标在 NDC 坐标系的坐标（归一化设备坐标）
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const dx = event.clientX - mouseDownPosition.x;
    const dy = event.clientY - mouseDownPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 让射线从相机出发，投射到鼠标点击的方向
    raycaster.setFromCamera(mouse, camera);

    // 计算射线与场景中的对象相交情况
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
      const intersect = intersects[0]; // 获取最近的交点
      const position = intersect.point; // 获取 3D 空间中的点击点坐标
      console.log("鼠标指向的3D坐标:", position);
      // createIcon(position);
    }
    // 计算射线与场景中的对象相交情况
    if (distance < dragThreshold && icons && icons.length) {
      const intersectsIcon = raycaster.intersectObjects(icons, true);

      if (intersectsIcon.length > 0) {
        const selectedIcon = intersectsIcon[0].object;
        console.log(selectedIcon.userData);
      }
    }
  };
};
