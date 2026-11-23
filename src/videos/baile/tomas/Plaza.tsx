import React, {useMemo} from 'react';
import {Easing, interpolate} from 'remotion';
import {Caja, Cilindro} from '../Escena3D';
import {LIGHTS, LightPreset} from '../../melaza/look/lights';
import {ctex, rng} from '../../melaza/look/paint';
import {NOCHE} from '../Escena3D';
import {EV, INICIO} from './cortes';
import {
	Adoquines, Barril, Carta, Casas, Contacto, FrenteCasas, Multitud, PilaSacos, Persona, Sprite, Tarima, V3, generarMultitud, lam, mezclarColor, mezclarLuz, useMats, zapatoTex,
} from './mundo';
import {bailarin, carpintero, guardia, medico, musico, pregonero, sentado, bosteza} from './reparto';

// E2: mercado de grano convertido en pista. Se usa en T1 (modo 't1', ya con tarima y músicos), T4 y T5 (modo 'flujo').
// Todo se anima con el cuadro GLOBAL `g` para que T4 y T5 sean exactamente la misma plaza durante el XFADE.

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const suave = Easing.inOut(Easing.cubic);
export const lin = (g: number, xs: number[], ys: number[]) => interpolate(g, xs, ys, clamp);
export const ease = (g: number, a: number, b: number) => interpolate(g, [a, b], [0, 1], {...clamp, easing: suave});

// Luces de la plaza: tarde dorada -> atardecer -> azul (T5).
export const TARDE: LightPreset = {...LIGHTS.golden, az: 140, el: 22};
export const ATARDECER: LightPreset = {...LIGHTS.golden, az: 150, el: 7};
export const AZUL: LightPreset = {
	...NOCHE, az: 150, el: 28,
	lit: [0.7, 0.72, 1.12], shade: [0.2, 0.2, 0.42], lift: [0.03, 0.03, 0.09],
	charTint: [0.92, 0.9, 1.0], charShade: 0.76, sunCol: '#9fb0ff', sunI: 1.3, sky: '#3a4a8a', hemiI: 0.55,
};
export const luzPlaza = (g: number): LightPreset => {
	const a = ease(g, INICIO.t4, EV.espera + 90);
	const b = ease(g, EV.rompe + 20, EV.desgracia + 30);
	return mezclarLuz(mezclarLuz(TARDE, ATARDECER, a), AZUL, b);
};
export const cieloPlaza = (g: number) => {
	const a = ease(g, INICIO.t4, EV.espera + 90);
	const b = ease(g, EV.rompe + 20, EV.desgracia + 30);
	return mezclarColor(mezclarColor('#ffc47c', '#c88a96', a), '#2a3b7a', b);
};

// Cámara continua de la plaza (T4 y T5 comparten esta ruta; g = cuadro global).
const KG = [INICIO.t4, EV.vacia, EV.espera + 20, EV.cae + 8, EV.muertos + 10, EV.desgracia + 15, EV.musica, INICIO.t6 + 4];
export const camaraPlaza = (g: number): {pos: V3; mira: V3} => {
	const P: V3[] = [
		[-3.6, 2.0, 16.5], [-1.5, 3.2, 19], [2.5, 8.0, 25], [2, 6.2, 21], [0.6, 3.5, 17], [-1.2, 2.5, 14], [0.2, 1.9, 13], [0.9, 1.75, 12.6],
	];
	const M: V3[] = [
		[-2.6, 1.0, 9], [0, 1.0, 6], [0, 0.8, 2], [0, 0.8, 4], [0.3, 1.0, 6], [-1.5, 1.1, 8.5], [0.4, 1.3, 8.6], [2.2, 1.4, 8.6],
	];
	const v = (A: V3[]): V3 => [lin(g, KG, A.map((p) => p[0])), lin(g, KG, A.map((p) => p[1])), lin(g, KG, A.map((p) => p[2]))];
	return {pos: v(P), mira: v(M)};
};

const PILAS_INI: V3[] = [[-6.2, 0, 3], [5.2, 0, 4], [-2, 0, 0.2], [3, 0, -1.5], [7.2, 0, 8], [-7.4, 0, 8]];
const PILAS_FIN: V3[] = [[-11, 0, 2], [11, 0, 3], [-11.5, 0, 9], [11.5, 0, 10], [-10.5, 0, 15], [10.5, 0, 16]];
export const MONTANA: V3 = [0, 0, 5.5];

const N_BAILE = 96;
const genGente = (): Persona[] => {
	const r = rng(77);
	const out: Persona[] = [];
	let i = 0;
	while (out.length < N_BAILE) {
		const x = (r() * 2 - 1) * 7.6, z = -3.0 + r() * 18.5;
		const primero = out.length < 24;
		if (Math.hypot(x - MONTANA[0], z - MONTANA[2]) < 3.7) continue;
		if (primero && PILAS_INI.some((p) => Math.hypot(x - p[0], z - p[2]) < 2.6)) continue;
		if (Math.hypot(x + 2.5, z - 9.4) < 2.4) continue; // espacio de los médicos
		out.push({x, z, o: Math.floor(r() * 8), ph: r() * 4, s: 0.86 + r() * 0.14, t0: 0});
		i++;
	}
	// los que llegan después de «vacía el mercado» (entran de los lados); ordenados al azar
	out.forEach((p, k) => {
		if (k >= 24) {
			const u = (k - 24) / (N_BAILE - 25);
			p.t0 = Math.round(EV.vacia + u * (EV.orquesta - EV.vacia));
			p.x0 = p.x < 0 ? -9.5 : 9.5; p.z0 = p.z;
		}
		p.tCae = Math.round(EV.rompe + 8 + r() * 85);
	});
	return out;
};

const corazon = () =>
	ctex('baile_corazon', 128, 128, (g) => {
		g.fillStyle = '#e8303a'; g.strokeStyle = '#241726'; g.lineWidth = 8; g.lineJoin = 'round';
		g.beginPath(); g.moveTo(64, 110); g.bezierCurveTo(10, 70, 14, 20, 50, 24); g.bezierCurveTo(60, 26, 64, 36, 64, 40);
		g.bezierCurveTo(64, 36, 68, 26, 78, 24); g.bezierCurveTo(114, 20, 118, 70, 64, 110); g.closePath(); g.fill(); g.stroke();
	});

export const Plaza: React.FC<{g: number; modo: 't1' | 'flujo'; cam: V3; zMax?: number; ritmoBaile?: number}> = ({g, modo, cam, zMax = 1e9, ritmoBaile = 1}) => {
	const gente = useMemo(genGente, []);
	const t1 = modo === 't1';
	const dancers = useMemo(() => (t1 ? gente.slice(0, 18).map((p) => ({...p, x: p.x * 0.6, z: -3.2 + ((p.z + 3) / 18.5) * 2.6, s: p.s * 1.1, t0: 0, tCae: undefined, x0: undefined, z0: undefined})) : gente), [t1, gente]);
	const visibles = useMemo(() => dancers, [dancers]);
	const bancos = {
		bail: Array.from({length: 8}, (_, i) => useMats(bailarin(i))),
		sit: Array.from({length: 4}, (_, i) => useMats(sentado(i, 0.6, 'sit'))),
		fall: Array.from({length: 4}, (_, i) => useMats(sentado(i, 0.6, 'fall'))),
	};
	const gv = visibles.filter((p) => p.z < zMax);
	const mats = {
		med: [useMats(medico(0)), useMats(medico(1))],
		heroe: useMats(bailarin(2, 1.0)),
		carp: useMats(carpintero()), preg: useMats(pregonero()), guar: useMats(guardia()),
		tam: useMats(musico('tambor')), vio: useMats(musico('violin')), mudo: useMats(musico('ninguno')),
		bost: useMats(bosteza()),
	};
	const matSaco = useMemo(() => lam('#b8a888'), []);
	const sacosT = t1 ? 1 : ease(g, EV.vacia, EV.vacia + 45);
	const alz = t1 ? 1 : ease(g, EV.tarima, EV.tarima + 36);
	const hTar = 1;
	// músicos: en T1 ya tocan; en flujo entran al escenario en «orquesta»
	const entrada = t1 ? 1 : ease(g, EV.orquesta, EV.orquesta + 40);
	const hayMusicos = t1 || g >= EV.orquesta - 2;
	const alFinMusica = g >= EV.prohibir + 12;
	const rompe = !t1 && g >= EV.rompe;
	const jazz = Math.floor(g / 5);
	// zapatos: montaña
	const nZap = t1 ? 0 : Math.floor(110 * ease(g, EV.cae, EV.muertos + 35));
	const zapatos = useMemo(() => {
		const r = rng(5);
		return Array.from({length: 110}, (_, i) => {
			const l = i / 110, a = i * 2.39996, R = 2.9 * Math.pow(1 - l, 0.7) * (0.55 + 0.45 * r());
			return {p: [MONTANA[0] + Math.cos(a) * R, 0.05 + l * 1.5, MONTANA[2] + Math.sin(a) * R] as V3, rz: (r() - 0.5) * 1.2 + (r() < 0.12 ? Math.PI : 0), flip: r() < 0.5, k: i % 6};
		});
	}, []);
	const texZap = useMemo(() => [
		zapatoTex('#7a5a3a', '#2a1c12', true), zapatoTex('#5a3e2a', '#1a1210', true), zapatoTex('#2a2428', '#120e10', true),
		zapatoTex('#8a6a46', '#2a1c12', false), zapatoTex('#4a3626', '#1a1210', true), zapatoTex('#3a3036', '#120e10', false),
	], []);
	// pregonero y guardia
	const pregT = !t1 && g >= EV.desgracia - 4;
	const guardiaX = lin(g, [EV.prohibir - 12, EV.prohibir + 14], [9, 5.1]);
	const tamborX = g < EV.prohibir + 4 ? 3.55 : lin(g, [EV.prohibir + 4, EV.prohibir + 22], [3.55, 5.1]);
	const aviso = lin(g, [EV.desgracia + 6, EV.desgracia + 26], [0, 1]);
	const examinado = !t1 && g < EV.espera + 24;
	const salidaMedicos = lin(g, [EV.orquesta, EV.espera + 20], [0, -11]); // los médicos se van antes de «Y entonces»
	return (
		<>
			<Adoquines tam={300} rep={36} />
			<FrenteCasas x0={-34} x1={34} zFrente={-11} semilla={2} />
			<Casas z0={-12} z1={28} mitad={14} lados={[-1, 1]} semilla={1} />
			<Tarima pos={[0, 0, -7]} alz={alz} h={hTar} />
			{/* sacos de grano apilados (se apartan para hacer pista) */}
			{PILAS_INI.map((a, i) => {
				const b = PILAS_FIN[i];
				const p: V3 = [a[0] + (b[0] - a[0]) * sacosT, 0, a[2] + (b[2] - a[2]) * sacosT];
				return <PilaSacos key={i} pos={p} rotY={0.3 * i} capas={3 + (i % 2)} mat={matSaco} />;
			})}
			{[[-12.5, 6], [12.8, 7], [-12.8, 13], [12.5, 13]].map((p, i) => <Barril key={i} pos={[p[0], 0, p[1]]} />)}
			<Multitud gente={gv} f={g} cam={cam} bancos={bancos} ritmo={ritmoBaile} />
			{/* médicos con un bailarín al que toman el pulso */}
			{examinado && (
				<group position={[salidaMedicos, 0, 0]}>
				<>
					<Carta mats={mats.heroe} idx={g * 0.27} pos={[-2.5, Math.abs(Math.sin(g * 0.2)) * 0.2, 9.4]} cam={cam} s={0.95} inclina={0.05 * Math.sin(g * 0.15)} />
					<Contacto pos={[-2.5, 0, 9.4]} />
					<mesh position={[-2.5, 2.45 + 0.05 * Math.sin(g * 0.5), 9.4]} rotation={[0, Math.atan2(cam[0] + 2.5, cam[2] - 9.4), 0]} scale={[1 + 0.25 * Math.max(0, Math.sin(g * 0.5)), 1 + 0.25 * Math.max(0, Math.sin(g * 0.5)), 1]}>
						<planeGeometry args={[0.55, 0.55]} />
						<meshBasicMaterial map={corazon()} transparent toneMapped={false} depthWrite={false} />
					</mesh>
					<Carta mats={mats.med[0]} idx={Math.floor(g / 24)} pos={[-4.5, 0, 9.7]} cam={cam} s={1.0} />
					<Contacto pos={[-4.5, 0, 9.7]} />
					<Carta mats={mats.med[1]} idx={Math.floor(g / 30) + 1} pos={[-0.55, 0, 9.9]} cam={cam} s={1.0} />
					<Contacto pos={[-0.55, 0, 9.9]} />
				</>
				</group>
			)}
			{/* carpinteros */}
			{!t1 && g > EV.vacia + 10 && g < EV.orquesta + 10 && [-4.3, 4.3].map((x, i) => (
				<Carta key={i} mats={mats.carp} idx={Math.floor(g / 6) + i} pos={[x, 0, -3.8 + 0.1 * i]} cam={cam} s={0.95} />
			))}
			{/* músicos en la tarima */}
			{hayMusicos && (
				<>
					<Carta mats={alFinMusica ? mats.mudo : mats.tam} idx={jazz} pos={[lin(entrada, [0, 1], t1 ? [-2.2, -2.2] : [-8, -3]), hTar, -7.2]} cam={cam} s={t1 ? 1.3 : 0.95} />
					<Carta mats={alFinMusica ? mats.mudo : mats.vio} idx={jazz + 1} pos={[lin(entrada, [0, 1], t1 ? [0.4, 0.4] : [8, 0.6]), hTar, -7.0]} cam={cam} s={t1 ? 1.3 : 0.95} />
					<Carta mats={alFinMusica ? mats.mudo : mats.vio} idx={jazz + 2} pos={[lin(entrada, [0, 1], t1 ? [2.6, 2.6] : [9, 3.6]), hTar, -7.4]} cam={cam} s={t1 ? 1.25 : 0.92} />
				</>
			)}
			{/* montaña de zapatos gastados */}
			{zapatos.slice(0, nZap).map((z, i) => {
				const pop = Math.min(1, (nZap - i) / 4);
				return (
					<Sprite key={i} tex={texZap[z.k]} pos={z.p} cam={cam} w={0.85 * pop} flip={z.flip} rotZ={z.rz} tint="#d8d4f0" />
				);
			})}
			{/* aviso de prohibición, pregonero, guardia y el tambor que se llevan */}
			{pregT && (
				<>
					<Caja size={[0.16, 3.2, 0.16]} pos={[-4.6, 1.6, 9]} color="#5a3a22" />
					<mesh position={[-4.6, 2.5, 9.12]} scale={[aviso, aviso, 1]} visible={aviso > 0.02}>
						<planeGeometry args={[1.4, 1.8]} />
						<meshBasicMaterial color="#f2e6c8" />
					</mesh>
					<Caja size={[1.0, 0.1, 0.02]} pos={[-4.6, 3.0, 9.14]} color="#241726" opacidad={aviso} />
					<Caja size={[0.8, 0.1, 0.02]} pos={[-4.6, 2.6, 9.14]} color="#241726" opacidad={aviso} />
					<Caja size={[0.9, 0.1, 0.02]} pos={[-4.6, 2.2, 9.14]} color="#b5201c" opacidad={aviso} />
					<Carta mats={mats.preg} idx={g < EV.prohibir ? Math.floor(g / 8) : 0} pos={[-3.3, 0, 9.4]} cam={cam} s={1.0} />
					<Contacto pos={[-3.3, 0, 9.4]} />
					<Carta mats={g < EV.prohibir + 12 ? mats.tam : mats.mudo} idx={Math.floor(g / 7)} pos={[3.55, 0, 8.6]} cam={cam} s={1.0} />
					<Contacto pos={[3.55, 0, 8.6]} />
					<Carta mats={mats.guar} pos={[guardiaX, 0, 8.9]} cam={cam} s={1.05} />
					<Contacto pos={[guardiaX, 0, 8.9]} />
					<group position={[tamborX, 0.95, 8.2]}>
						<Cilindro radio={0.38} alto={0.4} color="#f1ece0" segmentos={20} />
						<Cilindro radio={0.4} alto={0.07} pos={[0, 0.18, 0]} color="#a0382c" segmentos={20} />
						<Cilindro radio={0.4} alto={0.07} pos={[0, -0.18, 0]} color="#a0382c" segmentos={20} />
					</group>
				</>
			)}
			{/* bailarín caído que bosteza (empate con T6) */}
			{rompe && g > EV.cae + 20 && (
				<>
					<Carta mats={mats.bost} idx={g >= INICIO.t6 - 40 && Math.floor(g / 8) % 3 !== 2 ? 1 : 0} pos={[2.2, 0, 8.6]} cam={cam} s={1.0} />
					<Contacto pos={[2.2, 0, 8.6]} r={0.7} />
				</>
			)}
		</>
	);
};
