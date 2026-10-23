# Observed native operations

These are observed implementation details, not a stable vendor API. Discover the current page's modules before using versioned paths.

```js
const m = qtLoader.module();
m.__Z12getSavedCircv();
const snapshot = JSON.parse(localStorage.getItem('seda_saved_info'));
// snapshot.data_dump is XML; snapshot.layoutType is layout metadata.
m.__Z17handleOpenCircuitv(); // open own current cloud file
m.__Z15handlePowerCircv();   // toggle power: inspect state before toggling
m.__Z14handleStopCircv();
m.__Z15handleZoomToFitv();
m.__Z13handleZoomOutv();
m.autoSavedCirc();
```

The native canvas is `document.querySelector('#viewer-render').shadowRoot.querySelector('canvas.qt-window-content')`.

Current file read: `GET https://e-backendprod.ismarteda.com:20506/api/file/detail?fileId=<target>` through the authorized browser session. Preserve original content and setting locally before mutation.

Observed frontend file module `/assets/index-DRd14vBk.js` export `u({fileId,content:xml,setting})` saved an authorized file. Fetch its current detail, save, call native open, then poll serialized XML for the exact requested values and all expected wires. Backups and API responses can contain private data: do not commit them.

Observed project module `/assets/index-BCIte41m.js` exports `g({projectId,version})` and `u({projectId,version,name,updateBy,description})`. Preserve current ownership/version metadata. Renaming is optional.

Official 导出项目 generated a ZIP containing vendor-encrypted text files. Preserve it as an official archive; do not rename raw XML as that archive. Use fresh DOM snapshots/selectors for UI controls.

Readback must be case-specific: a previous case with 13 wires can otherwise satisfy an inadequate wait. Native serialized connector IDs use uid. Do not claim verification from a save response alone.
