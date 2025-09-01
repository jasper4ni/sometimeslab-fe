import { defineStore } from "pinia";
import * as THREE from "three";

export const useSpriteStore = defineStore("spriteStore", {
  state: () => ({
    sprites: [] as THREE.Sprite[],
  }),
  actions: {
    setSprites(value: THREE.Sprite[]) {
      this.sprites = value;
    },
  },
});
