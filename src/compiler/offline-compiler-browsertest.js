import { OfflineCompiler } from "./offline-compiler.js";

export { OfflineCompiler };

if (!window.TAAR) {
  window.TAAR = {};
}

window.TAAR.IMAGE = {
  OfflineCompiler,
};
