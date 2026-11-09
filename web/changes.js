// Graph fields shared by the editor's diff and the store's guarded merge.
const fields = {
  layout: ['mode', 'widths', 'collapsed'],
  content: ['cat', 'title', 'sideNote', 'pic', 'due', 'status', 'images', 'documents'],
  position: ['snapY', 'freeX', 'freeY', 'freeW', 'freeH'],
  edge: ['label', 'color'],
};
const pick = (object, keys) => Object.fromEntries(keys.map(key => [key, object[key]]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const byId = items => new Map(items.map(item => [item.id, item]));

export function graphSnapshot(workspace) {
  return structuredClone({
    title: workspace.title, ...pick(workspace, fields.layout),
    nodes: workspace.nodes.map(node => ({
      id: node.id, ...pick(node, fields.content), ...pick(node, fields.position),
      images: node.images.map(image => typeof image === 'string' ? image : image.id),
    })),
    edges: workspace.edges.map(({ id, from, to, label, color }) => ({ id, from, to, label, color })),
  });
}

export const scope = ({ kind, id }) => kind === 'edge-add' || kind === 'edge-remove'
  ? 'edge:' + id : id ? kind + ':' + id : kind;

export function diffGraph(before, after) {
  const ops = [];
  const compare = (kind, id, a, b, keys) => {
    const value = pick(b, keys);
    if (!same(pick(a, keys), value)) ops.push({ kind, id, value });
  };
  compare('rename', null, before, after, ['title']);
  compare('layout', null, before, after, fields.layout);
  const oldNodes = byId(before.nodes);
  for (const node of after.nodes) {
    const old = oldNodes.get(node.id);
    if (!old) ops.push({ kind: 'node-add', id: node.id, value: node });
    else {
      compare('content', node.id, old, node, fields.content);
      compare('position', node.id, old, node, fields.position);
    }
  }
  const oldEdges = byId(before.edges);
  const newEdges = byId(after.edges);
  for (const edge of after.edges) {
    const old = oldEdges.get(edge.id);
    if (!old) ops.push({ kind: 'edge-add', id: edge.id, value: edge });
    else compare('edge', edge.id, old, edge, fields.edge);
  }
  for (const edge of before.edges) {
    if (!newEdges.has(edge.id)) ops.push({ kind: 'edge-remove', id: edge.id, value: null });
  }
  return ops;
}

// Strict for writes. Draft previews can skip a missing object and let the
// confirmation surface handle the conflict against the authoritative graph.
export function applyGraphOps(graph, ops) {
  const next = structuredClone(graph);
  for (const { kind, id, value } of ops) {
    const nodes = next.nodes;
    const edges = next.edges;
    const get = items => items.find(item => item.id === id);
    switch (kind) {
      case 'rename': Object.assign(next, pick(value, ['title'])); break;
      case 'layout': Object.assign(next, pick(value, fields.layout)); break;
      case 'node-add':
        if (get(nodes)) throw new Error('Node นี้มีอยู่แล้ว');
        nodes.push({ id, ...pick(value, [...fields.content, ...fields.position]) });
        break;
      case 'content':
      case 'position': {
        const node = get(nodes);
        if (!node) throw new Error('ไม่พบ Node');
        Object.assign(node, pick(value, fields[kind]));
        break;
      }
      case 'edge-add':
        if (get(edges) || edges.some(edge => edge.from === value.from && edge.to === value.to)) {
          throw new Error('มีเส้นทิศทางนี้แล้ว');
        }
        edges.push({ id, ...pick(value, ['from', 'to', ...fields.edge]) });
        break;
      case 'edge':
      case 'edge-remove': {
        const edge = get(edges);
        if (!edge) throw new Error('เส้นนี้ถูกเปลี่ยนหรือลบแล้ว');
        if (kind === 'edge-remove') edges.splice(edges.indexOf(edge), 1);
        else Object.assign(edge, pick(value, fields.edge));
        break;
      }
      default: throw new Error('ไม่รู้จักการแก้ไขนี้');
    }
  }
  return next;
}
