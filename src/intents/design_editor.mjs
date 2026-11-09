// Design Editor intent: the side panel (slides and ATEM graphics). Canva calls render() once.
import { mount } from "../app/mount";

export default {
  render() {
    mount(document.getElementById("root") || document.body.appendChild(document.createElement("div")));
  },
};
