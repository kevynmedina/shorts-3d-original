import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import palabrasJson from '../palabras.json';
import {CORTES, FPS, INICIO} from './cortes';
import {interpolate} from 'remotion';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Subtítulos dinámicos palabra a palabra, calculados desde palabras.json.
// Zona segura (1080x1920): nada por encima del 10 % (y < 192) ni por debajo del 20 % (y > 1536).
// Grupos de 2 a 4 palabras; la palabra actual va en amarillo; contorno oscuro grueso.

type Palabra = {palabra: string; inicio: number; fin: number};
const PALABRAS = (palabrasJson as Palabra[]).filter((p) => /[\p{L}\p{N}]/u.test(p.palabra));

type Grupo = {ini: number; fin: number; palabras: Palabra[]};

// Agrupa: corta por pausa (>0,30 s), por puntuación fuerte y por tamaño (máx. 4 palabras / 1,8 s).
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
		if (/[.!?…:;,]$/.test(p.palabra) && cur.length >= 2) cerrar();
	});
	cerrar();
	return out;
};

const GRUPOS = grupos();

// Posición vertical de la franja POR TOMA (zona segura: 192 <= y <= 1536; las cifras de arriba ocupan ~230-345).
// 'arriba': borde superior fijo (el texto crece hacia abajo). 'abajo': borde inferior fijo (crece hacia arriba),
// así un grupo de 3 líneas nunca baja del 80 % del cuadro. La toma se elige por el INICIO del grupo: un grupo no
// salta de sitio mientras se ve.
type Franja = {modo: 'arriba' | 'abajo'; y: number};
const FRANJAS: {desde: number; franja: Franja}[] = [
	{desde: INICIO.t1, franja: {modo: 'arriba', y: 380}},   // T1: personajes en el centro-bajo, cifra arriba
	{desde: CORTES.c1, franja: {modo: 'abajo', y: 1515}},   // T2: goteras y parche en el centro
	{desde: CORTES.c2, franja: {modo: 'arriba', y: 300}},   // T3: vecinos en el centro-bajo
	{desde: CORTES.c3, franja: {modo: 'arriba', y: 230}},   // T4: ola al fondo, gente y caballo en el centro-bajo
	{desde: CORTES.c4, franja: {modo: 'abajo', y: 1515}},   // T5: «150 HERIDOS» arriba, ola en el centro
	{desde: CORTES.c5, franja: {modo: 'abajo', y: 1515}},   // T6: frasco en el centro
	{desde: CORTES.c6, franja: {modo: 'arriba', y: 200}},   // T7: cartel y empresario debajo
];
export const franjaEn = (cuadro: number): Franja => {
	let r = FRANJAS[0].franja;
	for (const k of FRANJAS) if (cuadro >= k.desde) r = k.franja;
	return r;
};

export const Subtitulos: React.FC = () => {
	const f = useCurrentFrame();
	const t = f / FPS;
	// Grupo actual = el ÚLTIMO que ya empezó (ini - 0,12 s). Su cola termina donde empieza el siguiente.
	let idx = -1;
	for (let i = 0; i < GRUPOS.length; i++) if (t >= GRUPOS[i].ini - 0.12) idx = i;
	if (idx < 0) return null;
	const g = GRUPOS[idx];
	const siguiente = GRUPOS[idx + 1];
	const finVis = Math.min(g.fin + 0.35, siguiente ? siguiente.ini - 0.12 : Infinity);
	if (t > finVis) return null;
	// Entrada suave del grupo (~4 cuadros) y salida suave antes del siguiente.
	const op = interpolate(t, [g.ini - 0.12, g.ini + 0.1], [0, 1], clamp) * interpolate(t, [finVis - 0.15, finVis], [1, 0], clamp);
	const fr = franjaEn(Math.round(g.ini * FPS));
	const vertical = fr.modo === 'arriba' ? {top: fr.y} : {bottom: 1920 - fr.y};
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute', left: 50, right: 50, ...vertical, textAlign: 'center', opacity: op,
					fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, fontSize: 92, lineHeight: 1.12,
					WebkitTextStroke: '16px #241726', paintOrder: 'stroke fill', letterSpacing: 1,
				}}
			>
				{g.palabras.map((p, i) => {
					const activa = t >= p.inicio && t < p.fin + 0.05;
					return (
						<span key={i} style={{color: activa ? '#ffd34d' : '#ffffff', marginRight: 22, display: 'inline-block'}}>
							{p.palabra}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};

export {GRUPOS};
