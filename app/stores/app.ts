export const useAppStore = defineStore("appStore", {
  state: () => ({
    loading: false,
    progress: {
      max: 0,
      value: 0,
      on: false,
    },
  }),
  actions: {
    setLoading(value: boolean) {
      this.loading = value;
    },
    setProgress({
      max,
      value,
      on,
    }: {
      max?: number;
      value?: number;
      on?: boolean;
    }) {
      if (max !== undefined) this.progress.max = max;
      if (value !== undefined) this.progress.value = value;
      if (on !== undefined) this.progress.on = on;
    },
  },
});
