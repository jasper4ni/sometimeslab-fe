export interface SCENE {
  id: string;
  path: string;
  cameraPosition: CameraPosition;
  icons: ICON[];
}

interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

interface ICON_ACTION {
  type: "REDIRECT";
  nextScene: string;
}

interface ICON {
  position: {
    x: number;
    y: number;
    z: number;
  };
  src: string; // 图片路径或导入的图片
  action: ICON_ACTION;
}
