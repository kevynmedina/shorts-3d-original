import * as THREE from "three";
import { ctex, rng } from "./paint";
import { twoTone } from "./shade";

// Texturas propias de melaza (las de puente que no se exportan se reproducen aquí con el mismo criterio).
type G = CanvasRenderingContext2D;

const blotch = (g: G, x: number, y: number, rad: number, sx: number, rgb: string, a: number) => {
  g.save();
  g.translate(x, y);
  g.scale(sx, 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  gr.addColorStop(0, rgb.replace("#", "#") + "");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.globalAlpha = a;
  g.fillStyle = gr;
  g.beginPath();
  g.arc(0, 0, rad, 0, Math.PI * 2);
  g.fill();
  g.restore();
};

// Remache: cabeza oscura con brillo crema, como en el puente.
const remache = (g: G, x: number, y: number, rad: number) => {
  g.fillStyle = "#3a2212";
  g.beginPath();
  g.arc(x, y, rad, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f1e6c8";
  g.beginPath();
  g.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.35, 0, Math.PI * 2);
  g.fill();
};

// Pared del tanque: placas de acero en filas, juntas, remaches y óxido/melaza.
export const metalHD = () =>
  ctex("metalHD3", 1024, 1024, (g, r) => {
    const S = 1024, filas = 6, colsPorFila = 4;
    const fh = S / filas;
    g.fillStyle = "#7a4a1a";
    g.fillRect(0, 0, S, S);
    for (let j = 0; j < filas; j++) {
      const desfase = (j % 2) * 0.5;
      for (let i = 0; i < colsPorFila + 1; i++) {
        const x0 = ((i + desfase) * S) / colsPorFila - S / colsPorFila / 2;
        const w = S / colsPorFila;
        const v = 0.92 + r() * 0.16;
        g.fillStyle = `rgb(${Math.round(122 * v)},${Math.round(74 * v)},${Math.round(26 * v)})`;
        g.fillRect(x0 + 6, j * fh + 6, w - 12, fh - 12);
        // filas de remaches a lo largo de las juntas de cada placa (costuras remachadas, legibles de cerca)
        for (let x = 18; x <= w - 18; x += 30) {
          remache(g, x0 + x, j * fh + 18, 7);
          remache(g, x0 + x, j * fh + fh - 18, 7);
        }
        for (let y = 48; y <= fh - 48; y += 30) {
          remache(g, x0 + 18, j * fh + y, 7);
          remache(g, x0 + w - 18, j * fh + y, 7);
        }
      }
    }
    // óxido y manchas de melaza
    for (let k = 0; k < 26; k++) {
      blotch(g, r() * S, r() * S, 40 + r() * 80, 1 + r(), "#8a4a1c", 0.35);
    }
    for (let k = 0; k < 14; k++) {
      blotch(g, r() * S, r() * S, 30 + r() * 60, 1 + r() * 0.5, "#3d1f06", 0.3);
    }
    // escurrimientos oscuros desde algunas juntas
    g.fillStyle = "rgba(50,28,8,0.45)";
    for (let k = 0; k < 10; k++) {
      const x = r() * S, y = r() * S * 0.8;
      g.fillRect(x, y, 4 + r() * 4, 60 + r() * 120);
    }
    // brillo metálico: vetas claras verticales finas (acero laminado)
    for (let k = 0; k < 60; k++) {
      const x = r() * S;
      g.fillStyle = `rgba(255,214,160,${0.05 + r() * 0.07})`;
      g.fillRect(x, 0, 1 + r() * 3, S);
    }
  });

// Parche de pintura gris que tapa la gotera: brochazos irregulares con escurrimientos.
// Textura con alpha (se usa con alphaTest), no un cuadro gris.
export const parcheTex = (): THREE.CanvasTexture => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  const r = rng(77);
  g.clearRect(0, 0, 512, 512);
  // brochazos horizontales superpuestos con bordes irregulares
  for (let k = 0; k < 9; k++) {
    const y = 60 + k * 48 + r() * 10;
    const x0 = 30 + r() * 60, x1 = 440 + r() * 40;
    g.beginPath();
    g.moveTo(x0, y);
    for (let x = x0; x <= x1; x += 20) g.lineTo(x, y + (r() - 0.5) * 18);
    for (let x = x1; x >= x0; x -= 20) g.lineTo(x, y + 36 + (r() - 0.5) * 18);
    g.closePath();
    g.fillStyle = k % 2 ? "#7d8288" : "#8a9096";
    g.fill();
  }
  // escurrimientos de pintura hacia abajo
  for (let k = 0; k < 7; k++) {
    const x = 60 + r() * 380, y = 380 + r() * 40, len = 40 + r() * 110;
    g.fillStyle = "#777c82";
    g.beginPath();
    g.moveTo(x - 6, y);
    g.lineTo(x + 6, y);
    g.lineTo(x + 3, y + len);
    g.lineTo(x - 3, y + len + 14);
    g.lineTo(x - 5, y + len);
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// Parche pintado A BROCHAZOS que se va extendiendo: `color` (gris con cerdas y escurrimientos, alpha = pintado)
// y `orden` (gris = momento en que se pinta cada punto: 1 = primero, ~0.05 = último; negro = nunca).
// Con alphaMap = orden y alphaTest = 1 - progreso, los brochazos aparecen uno tras otro, de izquierda a derecha.
export const parcheBrochazos = () => {
  const W = 1024, H = 768, N = 9;
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const cc = mk(), co = mk();
  const g = cc.getContext("2d")!, o = co.getContext("2d")!;
  o.fillStyle = "#000"; o.fillRect(0, 0, W, H);
  const r = rng(91);
  const grises = ["#8b9198", "#7f858c", "#949aa1", "#868c93"];
  for (let k = 0; k < N; k++) {
    const y = 70 + k * 72 + (r() - 0.5) * 14, alto = 92 + r() * 18;
    const x0 = 40 + r() * 70, x1 = W - 40 - r() * 70;
    const izq = k % 2 === 0;
    // banda del brochazo dibujada por columnas: cada columna tiene su orden (barrido de la brocha)
    for (let x = x0; x <= x1; x += 4) {
      const u = (x - x0) / (x1 - x0);
      const ond = Math.sin(u * 7 + k) * 8 + Math.sin(u * 23 + k * 3) * 3;
      const top = y + ond - (alto / 2) * (0.85 + 0.15 * Math.sin(u * 13 + k));
      const bot = y + ond + (alto / 2) * (0.85 + 0.15 * Math.cos(u * 11 + k));
      g.fillStyle = grises[k % 4];
      g.fillRect(x, top, 5, bot - top);
      const ord = 1 - (k + (izq ? u : 1 - u)) / N * 0.94;
      const v = Math.round(ord * 255);
      o.fillStyle = `rgb(${v},${v},${v})`;
      o.fillRect(x, top, 5, bot - top);
    }
    // cerdas: rayas finas claras y oscuras a lo largo del brochazo
    for (let s = 0; s < 22; s++) {
      const yy = y - alto * 0.42 + r() * alto * 0.84;
      g.strokeStyle = r() < 0.5 ? "rgba(60,64,70,0.55)" : "rgba(200,206,212,0.5)";
      g.lineWidth = 1.5 + r() * 2.5;
      g.beginPath();
      g.moveTo(x0 + r() * 40, yy);
      for (let x = x0; x <= x1; x += 30) g.lineTo(x, yy + Math.sin(x * 0.02 + s) * 4);
      g.stroke();
    }
    // final del brochazo con cerdas sueltas (pincel seco)
    const xe = izq ? x1 : x0;
    for (let s = 0; s < 10; s++) {
      g.fillStyle = grises[(k + 1) % 4];
      g.fillRect(xe + (izq ? 0 : -40) + r() * 30, y - alto / 2 + s * (alto / 10), 10 + r() * 30, 4);
    }
  }
  // escurrimientos de pintura (se pintan con el último brochazo)
  for (let k = 0; k < 8; k++) {
    const x = 80 + r() * 860, y = H - 80 + r() * 20, len = 30 + r() * 60;
    g.fillStyle = "#7d838a";
    g.fillRect(x - 5, y - 20, 10, len);
    o.fillStyle = "rgb(16,16,16)";
    o.fillRect(x - 5, y - 20, 10, len);
  }
  const t1 = new THREE.CanvasTexture(cc); t1.colorSpace = THREE.SRGBColorSpace;
  const t2 = new THREE.CanvasTexture(co);
  return { color: t1, orden: t2 };
};

// Melaza espesa: café muy oscuro, con brillo especular fuerte en la cresta.
export const melazaMat = () =>
  twoTone(new THREE.MeshPhongMaterial({ color: "#4a2208", specular: new THREE.Color("#ffe6b8"), shininess: 60 }));

// Melaza translúcida (borde de la ola).
export const melazaBordeMat = () =>
  twoTone(new THREE.MeshPhongMaterial({ color: "#8a4a14", specular: new THREE.Color("#ffe2b0"), shininess: 40, transparent: true, opacity: 0.45, depthWrite: false }));
