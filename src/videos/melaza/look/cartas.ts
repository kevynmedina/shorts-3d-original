import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxContact, INK, Outfit, Expr } from "./toon";
import { rng } from "./paint";

// Tarjetas de personaje: se dibujan con toon.ts (cast de puente) y se ponen como billboard de yaw.
// Diseño 600 x 1000 unidades (suelas en y = 975). Canvas 1080 x 1800 = escala 1.8.
// Metro: 1 unidad = 0.00216 m, así que una persona mide 2.16 m (cabeza de frijol, 3.5 cabezas).

export const K = 0.00216;      // metros por unidad de diseño
const ESC = 1.8;               // escala del canvas
export const ALTO_PERSONA = 1000 * K;
export const ALTO_CABALLO = 400 * K;

const tex = (c: HTMLCanvasElement) => {
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 8;
	return t;
};

const lienzo = (w: number, h: number) => {
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	const g = c.getContext("2d")!;
	g.setTransform(ESC, 0, 0, ESC, 0, 0);
	return { c, g };
};

export type OpcionesPersona = {
	mode?: "march" | "stroll" | "stand";
	expr?: Expr;
	seed?: number;
	light?: number;
	lado?: boolean;     // vista de perfil (correr)
	fase?: number;
};

// Persona (frente o perfil) como textura con fondo transparente.
export const texturaPersona = (o: Outfit, op: OpcionesPersona = {}): THREE.CanvasTexture => {
	const { c, g } = lienzo(1080, 1800);
	const p = new Pen(g);
	const light = op.light ?? -2.09;
	if (op.lado) {
		bodySide(p, o, { mode: "march", expr: op.expr ?? "neutral", seed: op.seed ?? 1, light, phase: op.fase ?? 0 });
	} else {
		bodyFront(p, o, { mode: op.mode ?? "stand", expr: op.expr ?? "neutral", seed: op.seed ?? 1, light });
	}
	return tex(c);
};

// Elipse en puntos de diseño (para sombreado y contornos).
type P2 = [number, number];
const elipse = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 44): P2[] => {
	const pts: P2[] = [];
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2;
		const x = rx * Math.cos(a), y = ry * Math.sin(a);
		pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
	}
	return pts;
};

// Caballo de caricatura al galope, mirando a la derecha, con el mismo contorno y sombreado que la gente.
export const texturaCaballo = (): THREE.CanvasTexture => {
	const { c, g } = lienzo(1080, 720);
	const p = new Pen(g);
	const light = -2.09;
	const cuero = "#a0592a", sombra = "#5a2c12", crin = "#3d2412", pata = "#6e3a1a";
	// patas (galope: dos delanteras extendidas, dos traseras recogidas)
	p.line([[205, 255], [150, 380]], pata, 24);
	p.line([[230, 262], [262, 372]], pata, 24);
	p.line([[370, 255], [410, 375]], pata, 24);
	p.line([[400, 248], [455, 360]], pata, 24);
	// cola y crin
	p.line([[120, 175], [78, 225], [92, 292]], crin, 26);
	p.line([[388, 96], [352, 130], [330, 150]], crin, 26);
	// tronco, cuello y cabeza
	const cuerpo = elipse(290, 215, 176, 66, -0.06);
	p.shadedFill(cuerpo, cuero, sombra, light, 176);
	p.poly(cuerpo, null);
	p.shadedFill(elipse(410, 150, 46, 104, -0.45), cuero, sombra, light, 104);
	p.poly(elipse(410, 150, 46, 104, -0.45), null);
	const cabeza = elipse(475, 86, 54, 34, -0.35);
	p.shadedFill(cabeza, cuero, sombra, light, 54);
	p.poly(cabeza, null);
	// hocico, ojo y fosa nasal
	p.dot(505, 96, 6, INK);
	p.dot(446, 74, 13, "#ffffff");
	p.dot(449, 75, 6, INK);
	return tex(c);
};

// Persona CORRIENDO hacia la cámara (vista de frente): paso largo, brazo agitado, cuerpo inclinado, cara de pánico.
// Devuelve `n` cuadros del ciclo de carrera.
export const texturasCorredor = (o: Outfit, seed: number, n = 6, expr: Expr = "shock"): THREE.CanvasTexture[] =>
	Array.from({ length: n }, (_, k) => {
		const { c, g } = lienzo(1080, 1800);
		const p = new Pen(g);
		const fase = k / n;
		bodyFront(p, o, {
			mode: "march", phase: fase, lift: 150, expr, seed, light: -2.09,
			wave: 0.5 + 0.5 * Math.sin(fase * Math.PI * 2), tilt: 4 * Math.sin(fase * Math.PI * 2), headTilt: -3,
		});
		return tex(c);
	});

// Caballo AL GALOPE (perfil hacia la derecha), `n` cuadros del ciclo: patas con rodilla, cuerpo que sube y baja,
// cuello estirado, crin y cola al viento, ojo con blanco (pánico).
export const texturasCaballoGalope = (n = 6): THREE.CanvasTexture[] =>
	Array.from({ length: n }, (_, k) => {
		const { c, g } = lienzo(1080, 720);
		const p = new Pen(g);
		const light = -2.09;
		const cuero = "#a0592a", sombra = "#5a2c12", crin = "#3d2412", pata = "#7a4220", pataLejos = "#5a3018", casco = "#2a1a10";
		const fi = (k / n) * Math.PI * 2;
		const bob = -12 * Math.sin(2 * fi);
		const pitch = 0.06 * Math.sin(fi);
		const rotP = (x: number, y: number): P2 => {
			const cx = 300, cy = 210;
			return [cx + (x - cx) * Math.cos(pitch) - (y - cy) * Math.sin(pitch), cy + (x - cx) * Math.sin(pitch) + (y - cy) * Math.cos(pitch) + bob];
		};
		// pata de dos segmentos: ángulo del muslo y doblez de la rodilla según la fase
		const pataG = (cadera: P2, off: number, delantera: boolean, col: string) => {
			const s = Math.sin(fi + off * Math.PI * 2);
			const cc = Math.cos(fi + off * Math.PI * 2);
			const a1 = (delantera ? 0.75 : 0.65) * s;            // + = hacia delante
			const dobla = delantera ? Math.max(0, -cc) * 1.5 : Math.max(0, cc) * 1.2;
			const L1 = 78, L2 = 82;
			const h = rotP(cadera[0], cadera[1]);
			const kx = h[0] + Math.sin(a1) * L1, ky = h[1] + Math.cos(a1) * L1;
			const a2 = a1 + (delantera ? -dobla : dobla);
			const fx = kx + Math.sin(a2) * L2, fy = ky + Math.cos(a2) * L2;
			p.line([h, [kx, ky], [fx, fy]], col, 22);
			p.line([[fx, fy], [fx + (delantera ? 6 : 4), fy + 10]], casco, 26);
		};
		// patas lejanas (detrás del cuerpo)
		pataG([215, 245], 0.1, false, pataLejos);
		pataG([395, 245], 0.55, true, pataLejos);
		// cola al viento
		p.line([rotP(128, 180), rotP(70, 168 + 10 * Math.sin(fi)), rotP(22, 190 + 14 * Math.sin(fi + 1))], crin, 30);
		// tronco
		const cuerpo = elipse(290, 210, 172, 62, -0.06).map(([x, y]) => rotP(x, y));
		p.shadedFill(cuerpo, cuero, sombra, light, 172);
		p.poly(cuerpo, null);
		// cuello estirado hacia delante y cabeza baja
		const cuello = elipse(425, 160, 44, 100, -0.95).map(([x, y]) => rotP(x, y));
		p.shadedFill(cuello, cuero, sombra, light, 100);
		p.poly(cuello, null);
		const cabeza = elipse(505, 118, 58, 32, -0.15).map(([x, y]) => rotP(x, y));
		p.shadedFill(cabeza, cuero, sombra, light, 58);
		p.poly(cabeza, null);
		// crin al viento (varios mechones)
		for (let m = 0; m < 4; m++) {
			const b = rotP(452 - m * 20, 88 + m * 20);
			p.line([b, [b[0] - 22, b[1] - 16 + 6 * Math.sin(fi + m)], [b[0] - 38, b[1] - 12 + 8 * Math.sin(fi + m + 1)]], crin, 13);
		}
		// orejas hacia atrás
		const o1 = rotP(470, 92);
		p.poly([o1, [o1[0] - 34, o1[1] - 22], [o1[0] - 8, o1[1] + 10]], cuero);
		// boca abierta, fosa nasal, ojo con blanco (pánico)
		const bo = rotP(556, 128);
		p.poly([bo, [bo[0] - 30, bo[1] + 4], [bo[0] - 6, bo[1] + 16]], "#5a1e28");
		const na = rotP(548, 106);
		p.dot(na[0], na[1], 6, INK);
		const oj = rotP(480, 104);
		p.dot(oj[0], oj[1], 16, INK);
		p.dot(oj[0], oj[1], 12, "#ffffff");
		p.dot(oj[0] + 3, oj[1], 5, INK);
		// patas cercanas (delante del cuerpo)
		pataG([200, 250], 0.0, false, pata);
		pataG([380, 250], 0.45, true, pata);
		// líneas de velocidad detrás
		for (let m = 0; m < 3; m++) {
			const y = 150 + m * 45 + bob;
			p.stroke([[60 - m * 10, y], [10 - m * 10, y]], 6, "rgba(255,240,210,0.85)");
		}
		return tex(c);
	});

// Sombra de contacto: mancha multiplicativa bajo los pies (fxContact de toon.ts).
export const texturaContacto = (col: string): THREE.CanvasTexture => {
	const c = document.createElement("canvas");
	c.width = 128;
	c.height = 128;
	fxContact(new Pen(c.getContext("2d")!), col);
	return tex(c);
};

// Caballo y personas: tarjeta de 600 x 1000 con el origen en los pies (ancho del plano = 600 u).
export const geoPersona = () => new THREE.PlaneGeometry(600 * K, 1000 * K).translate(0, 475 * K, 0);
export const geoCaballo = () => new THREE.PlaneGeometry(600 * K, 400 * K).translate(0, 200 * K, 0);

export const semilla = (n: number) => rng(n * 9301 + 49297);
