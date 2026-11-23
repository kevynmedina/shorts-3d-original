import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import palabrasJson from '../palabras.json';
import {CORTES, FPS, INICIO} from './cortes';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Subtítulos dinámicos palabra a palabra desde palabras.json.
// Zona segura (1080x1920): nada por encima del 10 % (y < 192) ni por debajo del 20 % (y > 1536).
// Franja ~60-72 % de la altura (y ≈ 1150-1380). Grupos de 2 a 4 palabras; la palabra actual va en amarillo.

type Palabra = {palabra: string; texto?: string; inicio: number; fin: number};
const PALABRAS = (palabrasJson as Palabra[]).filter((p) => /[\p{L}\p{N}]/u.test(p.palabra));
type Grupo = {ini: number; fin: number; palabras: Palabra[]};

// Grupos de 2 a 4 palabras. Se corta SIEMPRE tras . ? ! … (fin de frase), tras «:» y preferiblemente tras coma
// (si ya hay 2 palabras); nunca un grupo cruza de una frase a la siguiente.
const grupos = (): Grupo[] => {
	const out: Grupo[] = [];
	let cur: Palabra[] = [];
	const cerrar = () => {
		if (cur.length) out.push({ini: cur[0].inicio, fin: cur[cur.length - 1].fin, palabras: cur});
		cur = [];
	};
	PALABRAS.forEach((p, i) => {
		const prev = PALABRAS[i - 1];
		const pausa = prev ? p.inicio - prev.fin > 0.3 : false;
		const dur = cur.length ? p.fin - cur[0].inicio : 0;
		if (cur.length && (pausa || cur.length >= 4 || dur > 1.8)) cerrar();
		cur.push(p);
		const t = p.texto ?? p.palabra;
		if (/[.?!…]["»)]?$/.test(t) || /:$/.test(t)) cerrar();
		else if (/,$/.test(t) && cur.length >= 2) cerrar();
	});
	cerrar();
	return out;
};
const GRUPOS = grupos();

// Franja por toma (borde superior del texto; crece hacia abajo, máx. 3 líneas = ~310 px, siempre < y 1536).
type Franja = {y: number};
const FRANJAS: {desde: number; franja: Franja}[] = [
	{desde: INICIO.t1, franja: {y: 1150}},
	{desde: CORTES.c1, franja: {y: 1150}},
	{desde: CORTES.c2, franja: {y: 1150}},
	{desde: CORTES.c3, franja: {y: 1150}},
	{desde: CORTES.c4, franja: {y: 1150}},
	{desde: CORTES.c5, franja: {y: 1150}},
	{desde: CORTES.c6, franja: {y: 1150}},
];
export const franjaEn = (cuadro: number): Franja => {
	let r = FRANJAS[0].franja;
	for (const k of FRANJAS) if (cuadro >= k.desde) r = k.franja;
	return r;
};

export const Subtitulos: React.FC = () => {
	const f = useCurrentFrame();
	const t = f / FPS;
	let idx = -1;
	for (let i = 0; i < GRUPOS.length; i++) if (t >= GRUPOS[i].ini - 0.12) idx = i;
	if (idx < 0) return null;
	const g = GRUPOS[idx];
	const siguiente = GRUPOS[idx + 1];
	const finVis = Math.min(g.fin + 0.35, siguiente ? siguiente.ini - 0.12 : Infinity);
	if (t > finVis) return null;
	const op = interpolate(t, [g.ini - 0.12, g.ini - 0.06], [0, 1], clamp) * interpolate(t, [finVis - 0.05, finVis], [1, 0], clamp);
	const fr = franjaEn(Math.round(g.ini * FPS));
	return (
		<AbsoluteFill style={{pointerEvents: 'none', zIndex: 1000, opacity: 1}}>
			<div
				style={{
					position: 'absolute', left: 50, right: 50, top: fr.y, textAlign: 'center', opacity: op,
					fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, fontSize: 92, lineHeight: 1.12,
					WebkitTextStroke: '16px #241726', paintOrder: 'stroke fill', letterSpacing: 1,
				}}
			>
				{g.palabras.map((p, i) => {
					const activa = t >= p.inicio && t < p.fin + 0.05;
					return (
						<span key={i} style={{color: activa ? '#ffd34d' : '#ffffff', marginRight: 22, display: 'inline-block'}}>
							{p.texto ?? p.palabra}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

export {GRUPOS};
