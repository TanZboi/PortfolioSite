import "./styles/index.css";
import { App } from "./app/App";

const container = document.querySelector<HTMLDivElement>("#app");
if (!container) {
  throw new Error("#app root element is missing from index.html");
}

new App(container);
