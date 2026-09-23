// Manifold Mesh → 바이너리 STL(ArrayBuffer). 단위 mm 그대로.

export function meshToSTL(mesh, label = 'boxkit') {
  const np = mesh.numProp, V = mesh.vertProperties, T = mesh.triVerts;
  // Float32 storage can collapse tiny construction edges. Omit zero-area faces.
  const valid=[];
  for(let t=0;t<mesh.numTri;t++){
    const ids=[T[3*t],T[3*t+1],T[3*t+2]],p=ids.map(i=>[V[i*np],V[i*np+1],V[i*np+2]]),u=p[1].map((v,k)=>v-p[0][k]),v=p[2].map((v,k)=>v-p[0][k]);
    if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>0)valid.push(t);
  }
  const n=valid.length;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  const head = new TextEncoder().encode(label.slice(0, 79));
  new Uint8Array(buf, 0, 80).set(head);
  dv.setUint32(80, n, true);
  let o = 84;
  const p = (i, k) => V[i * np + k];
  for (let t = 0; t < n; t++) {
    const ti=valid[t], a = T[3 * ti], b = T[3 * ti + 1], c = T[3 * ti + 2];
    const ax = p(a, 0), ay = p(a, 1), az = p(a, 2);
    const ux = p(b, 0) - ax, uy = p(b, 1) - ay, uz = p(b, 2) - az;
    const vx = p(c, 0) - ax, vy = p(c, 1) - ay, vz = p(c, 2) - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true); o += 12;
    for (const i of [a, b, c]) { dv.setFloat32(o, p(i, 0), true); dv.setFloat32(o + 4, p(i, 1), true); dv.setFloat32(o + 8, p(i, 2), true); o += 12; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return buf;
}

export const manifoldToSTL = (m, label) => meshToSTL(m.getMesh(), label);
