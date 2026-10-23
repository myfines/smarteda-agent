import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser";
const options = {
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
};
export function parseCircuit(xml) {
  if (xml.length > 5_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw Error("Unsupported or oversized XML");
  // Native Oscope serialization repeats some attributes (Trigger/connectGnd).
  // Repair only identical repeats on this known vendor component.
  xml = xml.replace(/<item\b[^>]*>/g, (tag) => {
    if (!/itemtype="Oscope"/.test(tag)) return tag;
    const seen = new Map();
    return tag.replace(/\s([\w:-]+)="([^"]*)"/g, (match, key, value) => {
      if (seen.has(key)) {
        if (seen.get(key) !== value)
          throw Error("Conflicting native Oscope attribute " + key);
        return "";
      }
      seen.set(key, value);
      return match;
    });
  });
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

export function translateCircuit(xml, dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy))
    throw Error("Invalid translation");
  const m = parseCircuit(xml);
  for (const c of [...m.components, ...m.connectors]) {
    if (c.Pos) {
      const p = String(c.Pos).split(",").map(Number);
      if (p.length !== 2 || p.some((x) => !Number.isFinite(x)))
        throw Error("Invalid component position");
      c.Pos = `${p[0] + dx},${p[1] + dy}`;
    }
    if (c.pointList)
      c.pointList = String(c.pointList)
        .split(",")
        .map((v, i) => Number(v) + (i % 2 === 0 ? dx : dy))
        .join(",");
  }
  return new XMLBuilder({
    ...options,
    format: true,
    indentBy: "",
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
  }).build(m.data);
}
export function buildLayoutCode(width, height, expectedFileId) {
  if (
    ![width, height].every((x) => Number.isFinite(x) && x >= 200 && x <= 100000)
  )
    throw Error("Paper dimensions must be 200..100000 mm");
  return `async(page)=>{await page.evaluate(({width,height,id})=>{if(location.origin!=='https://design.ismarteda.com'||new URLSearchParams(location.hash.split('?')[1]).get('file_id')!==id)throw Error('Target changed');const m=qtLoader.module();if(typeof m.passSetting!=='function')throw Error('Unsupported native settings interface');m.passSetting(JSON.stringify({layoutType:'9',layoutWidth:String(width),layoutHeight:String(height)}));m.autoSavedCirc();m.__Z15handleZoomToFitv();m.__Z13handleZoomOutv()},${JSON.stringify({ width, height, id: expectedFileId })});await page.waitForFunction(async({width,height})=>{const id=new URLSearchParams(location.hash.split('?')[1]).get('file_id');const j=await fetch('https://e-backendprod.ismarteda.com:20506/api/file/detail?fileId='+encodeURIComponent(id)).then(r=>r.json());const s=JSON.parse(j.data.setting);return s.layoutType==='9'&&Number(s.layoutWidth)===width&&Number(s.layoutHeight)===height},${JSON.stringify({ width, height })},{timeout:15000});return {verified:true,width:${width},height:${height},units:'mm'}}`;
}

export function buildScopeCode(scopeId, limit = 5) {
  if (!/^Oscope-[A-Za-z0-9_-]+$/.test(scopeId))
    throw Error("Invalid native scope ID");
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
    throw Error("Sample limit must be 1..1000");
  return `async(page)=>await page.evaluate(async({scopeId,limit})=>{if(location.origin!=='https://design.ismarteda.com'||qtLoader.status!=='Running')throw Error('Native engine not ready');const original=window.handleOscopeDisplayData;const captured=[];try{window.handleOscopeDisplayData=function(raw){const data=JSON.parse(raw);if(data.Id===scopeId||data.Id?.startsWith(scopeId+'Chan'))captured.push(data);return original?.apply(this,arguments)};qtLoader.module().sendDataToUI(scopeId);const deadline=Date.now()+1200;while(!captured.length&&Date.now()<deadline)await new Promise(r=>setTimeout(r,20));if(!captured.length)throw Error('No native scope callback returned for '+scopeId);return {source:'SmartEDA native Oscope buffered waveform callback',scopeId,requestedAt:Date.now(),buffered:true,sampleFreshnessVerified:false,instantaneousMeasurement:false,voltageUnit:'V',reportedResolution:0.01,coordinateUnit:'ms (native plot label; not absolute wall time)',traces:captured.map(d=>({nativeId:d.Id,sampleCount:d.ChannelData.length,samples:d.ChannelData.slice(-limit).map(s=>{const sample={coordinate:Number(s.name),value1:Number(s.value1),value2:Number(s.value2)};if(Object.values(sample).some(x=>!Number.isFinite(x)))throw Error('Non-numeric native sample');return sample})}))}}finally{window.handleOscopeDisplayData=original}},${JSON.stringify({ scopeId, limit })})`;
}
