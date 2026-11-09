// Design Editor intent: the side panel (Play, live driving, upload). Canva calls render() once.
export default {
  async render() {
    // main.mjs mounts into #app, but Canva's frame provides #root.
    if (!document.getElementById("app")) {
      const app = document.createElement("div");
      app.id = "app";
      (document.getElementById("root") || document.body).append(app);
    }
    const { mount } = await import("../main.mjs");
    mount();
  },
};
