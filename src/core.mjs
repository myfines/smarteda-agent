import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";
const options = {
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
};
export function parseCircuit(xml) {
  if (xml.length > 5_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw Error("Unsupported or oversized XML");
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw Error("Invalid XML: " + valid.err.msg);
  const data = new XMLParser(options).parse(xml);
  if (!data.circuit || typeof data.circuit !== "object")
    throw Error("Expected circuit root");
  const items = [data.circuit.item || []].flat();
  const ids = new Set();
  for (const x of items) {
    const id = x.CircId || x.uid;
    if (!id || ids.has(id)) throw Error("Missing or duplicate item ID");
    ids.add(id);
  }
  const components = items.filter((x) => x.itemtype !== "Connector");
  const connectors = items.filter((x) => x.itemtype === "Connector");
  for (const w of connectors) {
    for (const k of ["startpinid", "endpinid"])
      if (
        !components.some((c) =>
          String(w[k] || "").startsWith((c.CircId || c.uid) + "-"),
        )
      )
        throw Error("Dangling connector " + w[k]);
    const points = String(w.pointList || "").split(",");
    if (
      points.length < 4 ||
      points.length % 2 ||
      points.some((x) => !x.trim() || !Number.isFinite(Number(x)))
    )
      throw Error("Invalid pointList");
  }
  return { data, components, connectors };
}
export function patchCircuit(xml, changes) {
  const m = parseCircuit(xml);
  const forbidden = new Set([
    "CircId",
    "uid",
    "itemtype",
    "startpinid",
    "endpinid",
  ]);
  for (const change of changes) {
    const item = m.components.find((x) => (x.CircId || x.uid) === change.id);
    if (!item) throw Error("Unknown component " + change.id);
    for (const [key, value] of Object.entries(change.properties)) {
      if (forbidden.has(key) || !Object.hasOwn(item, key))
        throw Error("Unsupported property " + key);
      if (typeof value !== "string" || value.length > 2000)
        throw Error("Invalid property value");
      item[key] = value;
    }
  }
  const out = new XMLBuilder({
    ...options,
    format: true,
    indentBy: "",
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
  }).build(m.data);
  parseCircuit(out);
  return out;
}
export function assertTarget(url) {
  const u = new URL(url);
  if (
    u.origin !== "https://design.ismarteda.com" ||
    !u.hash.startsWith("#/simulator?")
  )
    throw Error("Expected official SmartEDA simulator");
  const id = new URLSearchParams(u.hash.split("?")[1]).get("file_id");
  if (!id) throw Error("Missing file_id");
  return id;
}
export function buildReadCode() {
  return `async(page)=>await page.evaluate(()=>{if(location.origin!=='https://design.ismarteda.com')throw Error('Unexpected origin');if(!window.qtLoader||qtLoader.status!=='Running')throw Error('Native engine not ready');qtLoader.module().__Z12getSavedCircv();const s=JSON.parse(localStorage.getItem('seda_saved_info'));return {url:location.href,engine:qtLoader.status,xml:s.data_dump,simulation:window.__smartedaTelemetry||null}})`;
}
export function buildSimulationCode(action) {
  if (!["start", "stop"].includes(action)) throw Error("Unsupported action");
  return `async(page)=>{await page.evaluate((action)=>{if(location.origin!=='https://design.ismarteda.com'||qtLoader.status!=='Running')throw Error('Native engine not ready');if(!window.__smartedaTelemetry){window.__smartedaTelemetry={events:[]};for(const name of ['setSimTime','handleSimStatus']){const original=window[name];if(typeof original==='function')window[name]=function(value){const t=window.__smartedaTelemetry;t[name]=value;t.events.push({name,value,at:Date.now()});if(t.events.length>20)t.events.shift();return original.apply(this,arguments)}}}qtLoader.module().__Z14handleStopCircv();if(action==='start')qtLoader.module().__Z15handlePowerCircv()},${JSON.stringify(action)});await page.waitForTimeout(900);return await page.evaluate(()=>({telemetry:window.__smartedaTelemetry,measurementAvailable:false,measurementReason:'Native probe numerical API is not yet verified'}))}`;
}
