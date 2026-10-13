import type { TubeAntyApi } from "../../preload/index";

declare global {
  interface Window {
    api: TubeAntyApi;
  }
}
