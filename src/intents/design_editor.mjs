// Design Editor intent: the side panel (Play, live driving, upload). Canva calls render() once.
export default {
  async render() {
    await import("../main.mjs");
  },
};
