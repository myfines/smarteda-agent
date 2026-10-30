import { XMLBuilder } from "fast-xml-parser";
import { parseCircuit } from "./core.mjs";
const idOf = (x) => x.CircId || x.uid;
const all = (m) => [...m.components, ...m.connectors];
function owner(pin, components) {
  return components
    .filter((c) => pin.startsWith(idOf(c) + "-"))
    .sort((a, b) => idOf(b).length - idOf(a).length)[0];
}
function serialize(data) {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    format: true,
    indentBy: "",
    suppressEmptyNode: true,
    suppressBooleanAttributes: false,
  }).build(data);
}

export function inspectCircuit(xml) {
  const m = parseCircuit(xml),
    parent = new Map(),
    groups = new Map();
  const find = (p) => {
    if (!parent.has(p)) parent.set(p, p);
    let root = p;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(p) !== p) {
      const next = parent.get(p);
      parent.set(p, root);
      p = next;
    }
    return root;
  };
  for (const w of m.connectors) {
    const a = find(w.startpinid),
      b = find(w.endpinid);
    parent.set(a, b);
  }
  for (const p of parent.keys()) {
    const root = find(p);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(p);
  }
  const nets = [...groups.values()]
    .map((pins) => ({
      pins: pins.sort(),
      wires: m.connectors
        .filter((w) => pins.includes(w.startpinid))
        .map(idOf)
        .sort(),
    }))
    .sort((a, b) => a.pins[0].localeCompare(b.pins[0]));
  const types = Object.create(null);
  for (const c of m.components)
    types[c.itemtype] = (types[c.itemtype] || 0) + 1;
  return {
    components: m.components.length,
    connectors: m.connectors.length,
    types,
    nets,
    unwiredComponents: m.components
      .filter(
        (c) =>
          !m.connectors.some(
            (w) =>
              owner(w.startpinid, m.components) === c ||
              owner(w.endpinid, m.components) === c,
          ),
      )
      .map(idOf),
    electricalRulesChecked: false,
    note: "Connectivity follows explicit pin IDs only. Crossings, ground/net-label equivalence and valid physical pin catalogs are not inferred.",
  };
}
export function diffCircuits(before, after) {
  const a = new Map(all(parseCircuit(before)).map((c) => [idOf(c), c])),
    b = new Map(all(parseCircuit(after)).map((c) => [idOf(c), c]));
  const added = [...b.keys()].filter((id) => !a.has(id)).sort(),
    removed = [...a.keys()].filter((id) => !b.has(id)).sort(),
    changed = [];
  for (const [id, x] of a) {
    const y = b.get(id);
    if (!y) continue;
    const properties = {};
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)]))
      if (JSON.stringify(x[k]) !== JSON.stringify(y[k]))
        properties[k] = { before: x[k] ?? null, after: y[k] ?? null };
    if (Object.keys(properties).length) changed.push({ id, properties });
  }
  return {
    added,
    removed,
    changed,
    topologyChanged:
      added.length > 0 ||
      removed.length > 0 ||
      changed.some((x) =>
        ["startpinid", "endpinid", "itemtype", "CircId", "uid"].some(
          (k) => k in x.properties,
        ),
      ),
  };
}
export function editCircuit(
  xml,
  { clone, remove = [], cascade = false, connections = [] } = {},
) {
  const m = parseCircuit(xml);
  let items = all(m);
  const idMap = Object.create(null),
    boundaries = [];
  const occupied = new Set(items.map(idOf));
  const allocate = (type) => {
    let n = 1;
    while (occupied.has(`${type}-${n}`)) n++;
    const id = `${type}-${n}`;
    occupied.add(id);
    return id;
  };
  const knownPins = new Set(
    m.connectors.flatMap((w) => [w.startpinid, w.endpinid]),
  );
  if (clone) {
    if (!clone.ids.length || new Set(clone.ids).size !== clone.ids.length)
      throw Error("Clone IDs must be nonempty and unique");
    if (![clone.dx, clone.dy].every(Number.isFinite))
      throw Error("Invalid translation");
    const selected = new Set(clone.ids);
    for (const id of selected)
      if (!m.components.some((c) => idOf(c) === id))
        throw Error("Unknown component " + id);
    const rewrite = (pin) => {
      const c = owner(pin, m.components);
      return idMap[idOf(c)] + pin.slice(idOf(c).length);
    };
    for (const id of selected) {
      const original = m.components.find((c) => idOf(c) === id),
        c = structuredClone(original);
      const next = allocate(c.itemtype);
      idMap[id] = next;
      if (c.CircId) c.CircId = next;
      else c.uid = next;
      if (c.Pos) {
        const xy = c.Pos.split(",").map(Number);
        if (xy.length !== 2 || !xy.every(Number.isFinite))
          throw Error("Invalid position");
        c.Pos = `${xy[0] + clone.dx},${xy[1] + clone.dy}`;
      }
      for (const k of ["label", "designator"]) if (c[k]) c[k] += "_" + next;
      items.push(c);
    }
    for (const pin of [...knownPins]) {
      const c = owner(pin, m.components);
      if (selected.has(idOf(c))) knownPins.add(rewrite(pin));
    }
    for (const original of m.connectors) {
      const start = selected.has(
          idOf(owner(original.startpinid, m.components)),
        ),
        end = selected.has(idOf(owner(original.endpinid, m.components)));
      if (start && end) {
        const w = structuredClone(original),
          id = allocate("Connector");
        if (w.CircId) w.CircId = id;
        else w.uid = id;
        w.startpinid = rewrite(w.startpinid);
        w.endpinid = rewrite(w.endpinid);
        w.pointList = w.pointList
          .split(",")
          .map((v, i) => Number(v) + (i % 2 ? clone.dy : clone.dx))
          .join(",");
        items.push(w);
      } else if (start || end)
        boundaries.push({
          originalWire: idOf(original),
          newPin: rewrite(start ? original.startpinid : original.endpinid),
          externalPin: start ? original.endpinid : original.startpinid,
        });
    }
  }
  const removing = new Set(remove);
  for (const id of removing)
    if (!items.some((c) => idOf(c) === id)) throw Error("Unknown item " + id);
  const touches = (w) =>
    [w.startpinid, w.endpinid].some((pin) => {
      const c = owner(
        pin,
        items.filter((x) => x.itemtype !== "Connector"),
      );
      return c && removing.has(idOf(c));
    });
  if (
    !cascade &&
    items.some(
      (w) => w.itemtype === "Connector" && !removing.has(idOf(w)) && touches(w),
    )
  )
    throw Error("Cannot remove connected component without cascade");
  items = items.filter(
    (c) =>
      !removing.has(idOf(c)) &&
      !(cascade && c.itemtype === "Connector" && touches(c)),
  );
  const components = items.filter((c) => c.itemtype !== "Connector");
  for (const connection of connections) {
    const { from, to, points } = connection;
    if (
      from === to ||
      ![from, to].every((pin) => knownPins.has(pin) && owner(pin, components))
    )
      throw Error("Use observed pins from the original model or cloned block");
    if (
      !Array.isArray(points) ||
      points.length < 4 ||
      points.length % 2 ||
      !points.every(Number.isFinite)
    )
      throw Error("Invalid connector points");
    if (
      items.some(
        (w) =>
          w.itemtype === "Connector" &&
          ((w.startpinid === from && w.endpinid === to) ||
            (w.startpinid === to && w.endpinid === from)),
      )
    )
      throw Error("Duplicate connector endpoints");
    items.push({
      itemtype: "Connector",
      uid: allocate("Connector"),
      startpinid: from,
      endpinid: to,
      pointList: points.join(","),
    });
  }
  m.data.circuit.item = items;
  const result = serialize(m.data);
  parseCircuit(result);
  return {
    xml: result,
    idMap,
    boundaries,
    diff: diffCircuits(xml, result),
    pinCatalogVerified: false,
    note: "Offline model edit. Connection pins must have been observed in the source or cloned from it; geometry is caller supplied. Native import verification is still required.",
  };
}
