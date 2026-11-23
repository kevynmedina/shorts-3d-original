import * as THREE from 'three';
import {Expr, INK, Outfit, Pen, Prop, bodyFront} from '../../melaza/look/toon';

// Reparto de época (1518) y modernos: vestuario y texturas de cartas, con bancos cacheados.
// Todo se dibuja con toon.ts (bodyFront); el canvas tiene el mismo aspecto 600x1000 que el de la melaza,
// pero con escala `esc` (1.8 = alta calidad; 0.55-0.7 = multitudes).

type Modo = 'march' | 'stroll' | 'stand' | 'sit' | 'fall';
export type OpTex = {
	mode?: Modo; expr?: Expr; seed?: number; phase?: number; lift?: number; wave?: number; tilt?: number;
	headTilt?: number; prop?: Prop; esc?: number; extra?: (p: Pen) => void;
};

export const textura = (o: Outfit, op: OpTex = {}): THREE.CanvasTexture => {
	const esc = op.esc ?? 1.2;
	const c = document.createElement('canvas');
	c.width = Math.round(600 * esc);
	c.height = Math.round(1000 * esc);
	const g = c.getContext('2d')!;
	g.setTransform(esc, 0, 0, esc, 0, 0);
	const p = new Pen(g);
	bodyFront(p, o, {
		mode: op.mode ?? 'stand', expr: op.expr ?? 'neutral', seed: op.seed ?? 1, light: -2.09,
		phase: op.phase, lift: op.lift, wave: op.wave, tilt: op.tilt, headTilt: op.headTilt, prop: op.prop,
	});
	p.rot = null;
	op.extra?.(p);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	t.anisotropy = 4;
	return t;
};

const banco = new Map<string, THREE.CanvasTexture[]>();
const memo = (k: string, fn: () => THREE.CanvasTexture[]) => {
	let v = banco.get(k);
	if (!v) { v = fn(); banco.set(k, v); }
	return v;
};

const PIEL = ['#f2c9a0', '#ecd0b6', '#c99067', '#ffe2c2'];

// ---- Época ----
export const TROFFEA: Outfit = {jacket: '#8e3b3b', dress: '#c08a52', pants: '#4a3426', boots: '#3a2a1c', hat: 'bonnet', skin: PIEL[0], build: 'adult'};
export const MEDICO_A: Outfit = {jacket: '#2a2230', pants: '#2a2230', boots: '#1a1418', hat: 'tophat', skin: PIEL[1], moustache: '#3a2a20', build: 'stout'};
export const MEDICO_B: Outfit = {jacket: '#4a2a3a', pants: '#2a2230', boots: '#1a1418', hat: 'tophat', skin: PIEL[3], moustache: '#6a5a4a', build: 'adult'};
export const MUSICO_T: Outfit = {jacket: '#a0382c', pants: '#4a4234', boots: '#2a1d14', hat: 'cap', cap: '#2f4a6a', skin: PIEL[0], moustache: '#4a3020', build: 'stout'};
export const MUSICO_V: Outfit = {jacket: '#2f5d8a', pants: '#3b3f52', boots: '#2a1d14', hat: 'hair', hair: '#4a3020', skin: PIEL[2], build: 'adult'};
export const PREGONERO: Outfit = {jacket: '#8c2a2a', pants: '#3b3f52', boots: '#2a1d14', hat: 'cap', cap: '#d9a441', skin: PIEL[1], moustache: '#4a3020', build: 'stout'};
export const GUARDIA: Outfit = {jacket: '#4a5a7a', pants: '#3b3f52', boots: '#1a1418', hat: 'cap', cap: '#8a8d96', skin: PIEL[2], moustache: '#2a201a', build: 'stout', sash: '#c0353a'};
export const CARPINTERO: Outfit = {jacket: '#a98a56', pants: '#5a4634', boots: '#2a1d14', hat: 'cap', cap: '#7a5a2a', skin: PIEL[0], build: 'adult'};

export const DANZA: Outfit[] = [
	{jacket: '#6b8a4a', pants: '#5a4a3a', boots: '#3a2a1c', hat: 'cap', cap: '#8a3a2a', skin: PIEL[0]},
	{jacket: '#b9794a', dress: '#7a5ab5', pants: '#4a3426', boots: '#3a2a1c', hat: 'bonnet', skin: PIEL[1]},
	{jacket: '#3f6fb5', pants: '#4a4234', boots: '#2a1d14', hat: 'hair', hair: '#3a2a1c', skin: PIEL[2]},
	{jacket: '#8c3b4a', dress: '#d9a441', pants: '#4a3426', boots: '#3a2a1c', hat: 'bonnet', skin: PIEL[3]},
	{jacket: '#5d7a3a', pants: '#3b3f52', boots: '#2a1d14', hat: 'cap', cap: '#4b3a2b', skin: PIEL[1]},
	{jacket: '#c9a441', dress: '#5a8fc2', pants: '#4a3426', boots: '#3a2a1c', hat: 'bonnet', skin: PIEL[0]},
	{jacket: '#7a4a3a', pants: '#3b3f52', boots: '#2a1d14', hat: 'hair', hair: '#7a5a3a', skin: PIEL[3]},
	{jacket: '#2f5f6a', dress: '#a0382c', pants: '#4a3426', boots: '#3a2a1c', hat: 'bonnet', skin: PIEL[2]},
];
export const VECINOS: Outfit[] = [
	{jacket: '#5a4632', pants: '#3b3f52', boots: '#2a1d14', hat: 'cap', cap: '#4b3a2b', skin: PIEL[0]},
	{jacket: '#7b5ac9', dress: '#c25a7a', pants: '#3b3f52', boots: '#4a3426', hat: 'bonnet', skin: PIEL[1]},
	{jacket: '#4f6a3a', pants: '#4a4234', boots: '#2a1d14', hat: 'hair', hair: '#5a3b2a', skin: PIEL[2]},
	{jacket: '#a0382c', dress: '#d9c28a', pants: '#3b3f52', boots: '#4a3426', hat: 'bonnet', skin: PIEL[3]},
];
// ---- Modernos (T6) ----
export const MODERNOS: Outfit[] = [
	{jacket: '#e2453c', pants: '#3b5b9a', boots: '#f4f1ea', hat: 'cap', cap: '#2a2a33', skin: PIEL[1]},
	{jacket: '#2f9a8a', pants: '#2a2a33', boots: '#f4f1ea', hat: 'hair', hair: '#2a1d14', skin: PIEL[2]},
	{jacket: '#f2c24a', pants: '#3b3f52', boots: '#2a2a33', hat: 'hair', hair: '#7a4a2a', skin: PIEL[0]},
	{jacket: '#7b5ac9', pants: '#3b5b9a', boots: '#f4f1ea', hat: 'cap', cap: '#e2453c', skin: PIEL[3]},
	{jacket: '#4a4a55', pants: '#2a2a33', boots: '#d9d9de', hat: 'hair', hair: '#d9d9de', skin: PIEL[1]},
	{jacket: '#e07a3c', pants: '#2a2a33', boots: '#2a2a33', hat: 'hair', hair: '#2a1d14', skin: PIEL[2]},
];

const EXPR_DANZA: Expr[] = ['dazed', 'pained', 'laugh', 'nervous', 'shock', 'grin'];

// ---- Bancos ----
/** bailarín de multitud: 4 cuadros de baile (rebote, giro de brazo, inclinación). */
export const bailarin = (i: number, esc = 0.6) =>
	memo(`bail${i}_${esc}`, () =>
		Array.from({length: 4}, (_, k) => {
			const ph = k / 4, a = ph * Math.PI * 2;
			return textura(DANZA[i % DANZA.length], {
				mode: 'march', phase: ph, lift: 150, wave: 0.5 + 0.5 * Math.sin(a + i), tilt: 7 * Math.sin(a + i * 0.7),
				headTilt: 6 * Math.cos(a), expr: EXPR_DANZA[i % EXPR_DANZA.length], seed: i + 3, esc,
			});
		}));

export const sentado = (i: number, esc = 0.6, mode: 'sit' | 'fall' = 'sit') =>
	memo(`${mode}${i}_${esc}`, () => [textura(DANZA[i % DANZA.length], {mode, expr: i % 2 ? 'dazed' : 'pained', seed: i + 3, esc})]);

/** Troffea bailando (6 cuadros) y de pie. */
export const troffeaBaila = (esc = 1.2) =>
	memo(`troffea_baila${esc}`, () =>
		Array.from({length: 6}, (_, k) => {
			const ph = k / 6, a = ph * Math.PI * 2;
			return textura(TROFFEA, {mode: 'march', phase: ph, lift: 150, wave: 0.5 + 0.5 * Math.sin(a), tilt: 8 * Math.sin(a), headTilt: 7 * Math.cos(a), expr: k % 2 ? 'dazed' : 'grin', seed: 21, esc});
		}));
export const troffeaPie = (expr: Expr = 'neutral', esc = 1.2) => memo(`troffea_pie${expr}${esc}`, () => [textura(TROFFEA, {mode: 'stand', expr, seed: 21, esc})]);

export const vecino = (i: number, expr: Expr = 'nervous', esc = 1.0) =>
	memo(`vec${i}${expr}${esc}`, () => [textura(VECINOS[i % VECINOS.length], {mode: 'stand', expr, seed: 30 + i, esc})]);

export const medico = (i: number, esc = 1.0) =>
	memo(`med${i}${esc}`, () => [
		textura(i % 2 ? MEDICO_B : MEDICO_A, {mode: 'stand', expr: 'stern', seed: 40 + i, esc, tilt: -2}),
		textura(i % 2 ? MEDICO_B : MEDICO_A, {mode: 'stand', expr: 'nervous', seed: 40 + i, esc, tilt: 3}),
	]);

export const carpintero = (esc = 1.0) =>
	memo(`carp${esc}`, () => [0, 1].map((k) => textura(CARPINTERO, {mode: 'stand', expr: 'stern', seed: 51, esc, prop: ['hammer', k]})));
export const pregonero = (esc = 1.0) =>
	memo(`preg${esc}`, () => [0, 1].map((k) => textura(PREGONERO, {mode: 'stand', expr: 'grin', seed: 52, esc, prop: ['hammer', k]})));
export const guardia = (esc = 1.0) => memo(`guar${esc}`, () => [textura(GUARDIA, {mode: 'stand', expr: 'stern', seed: 53, esc})]);

// Instrumentos dibujados sobre la carta (espacio de diseño 600x1000; torso ~y 330-615).
const tambor = (p: Pen) => {
	p.poly([[196, 560], [404, 560], [398, 650], [202, 650]], '#f1ece0', 8);
	p.ell(300, 560, 104, 24, '#f7f3ea', 8);
	p.poly([[196, 650], [404, 650], [402, 666], [198, 666]], '#a0382c', 6);
	p.line([[212, 566], [240, 646], [270, 566], [300, 646], [330, 566], [360, 646], [388, 566]], INK, 3, false);
	p.line([[250, 520], [214, 468]], '#d9b070', 10);
	p.line([[350, 520], [388, 468]], '#d9b070', 10);
};
const violin = (p: Pen) => {
	p.ell(262, 400, 60, 42, '#9a4a1e', 7, 0, 360, -35);
	p.line([[290, 380], [360, 300]], '#3a1c0c', 12);
	p.line([[210, 470], [350, 330]], '#e8dcc0', 7, false);
};

const instrumento = (k: 'tambor' | 'violin' | 'ninguno') => (p: Pen) => { if (k === 'tambor') tambor(p); if (k === 'violin') violin(p); };

/** músico: 'tambor' | 'violin' | 'ninguno' (callado y sorprendido). 3 cuadros de rebote. */
export const musico = (tipo: 'tambor' | 'violin' | 'ninguno', esc = 1.0) =>
	memo(`mus${tipo}${esc}`, () =>
		[0, 1, 2].map((k) => textura(tipo === 'violin' ? MUSICO_V : MUSICO_T, {
			mode: 'stroll', phase: k / 3, lift: 40, expr: tipo === 'ninguno' ? 'shock' : k % 2 ? 'smile' : 'grin', seed: tipo === 'violin' ? 61 : 62,
			esc, extra: instrumento(tipo),
		})));

/** pasajero moderno: [normal, bostezo]. Bostezo = ojos cerrados + boca redonda («whistle»). */
export const pasajero = (i: number, modo: 'stand' | 'sit' = 'stand', esc = 1.0) =>
	memo(`pas${i}${modo}${esc}`, () => [
		textura(MODERNOS[i % MODERNOS.length], {mode: modo, expr: 'neutral', seed: 70 + i, esc}),
		textura(MODERNOS[i % MODERNOS.length], {mode: modo, expr: 'whistle', seed: 70 + i, esc}),
	]);

/** bailarín caído que bosteza (empate T5 -> T6). */
export const bosteza = (esc = 1.2) =>
	memo(`bosteza${esc}`, () => [
		textura(DANZA[2], {mode: 'sit', expr: 'dazed', seed: 5, esc}),
		textura(DANZA[2], {mode: 'sit', expr: 'whistle', seed: 5, esc}),
	]);
