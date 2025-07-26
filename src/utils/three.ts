const fovRanges = [
  { min: 30, max: 40, rotateSpeed: -0.13 },
  { min: 41, max: 50, rotateSpeed: -0.18 },
  { min: 51, max: 60, rotateSpeed: -0.22 },
  { min: 61, max: 70, rotateSpeed: -0.25 },
  { min: 71, max: 80, rotateSpeed: -0.3 },
  { min: 81, max: 90, rotateSpeed: -0.33 },
  { min: 91, max: Number.MAX_VALUE, rotateSpeed: -0.37 },
];

// 定义区间和对应的函数
export const getNewRotateSpeedByFov = (fov: number) => {
  const range = fovRanges.find((r) => fov >= r.min && fov <= r.max);
  return range?.rotateSpeed ?? -0.3;
};
