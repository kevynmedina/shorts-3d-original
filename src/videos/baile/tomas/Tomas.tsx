import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Escena3D, NOCHE, Pose} from '../Escena3D';
import {LIGHTS, LOOK} from '../../melaza/look/lights';
import {Caja, Cilindro} from '../Escena3D';
import {Cifra} from './cifras';
import {CORTES, DUR, EV, INICIO, loc} from './cortes';
import {
	Adoquines, Camion, Capilla, Carta, Casas, Catedral, Contacto, Multitud, Panaderia, Persona, V3, Vela, ZapatoRojo, Sprite, bolsaTex, monedaTex, emisivo, generarMultitud, mezclarColor,
	mezclarLuz, useMats,
} from './mundo';
import {AZUL, Plaza, camaraPlaza, cieloPlaza, ease, lin, luzPlaza, MONTANA, TARDE, ATARDECER} from './Plaza';
import {
	bailarin, medico, musico, pasajero, sentado, troffeaBaila, troffeaPie, vecino, TROFFEA,
} from './reparto';
import {textura, pregonero} from './reparto';

// Siete tomas con cámara propia. Todos los tiempos salen de cortes.ts (calculados desde palabras.json).
// Cada toma recibe cuadros LOCALES (useCurrentFrame dentro de su Sequence); `g = f + INICIO.tN` es el cuadro global.
// Encuadre: los personajes ocupan y ≈ 450-1100 del cuadro; la franja de subtítulos (y ≈ 1150-1450) cae sobre suelo vacío.

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const DIA = {...LIGHTS.day, az: 130, el: 52};
const k = (f: number, xs: number[], ys: number[]) => interpolate(f, xs, ys, clamp);

// ---------------------------------------------------------------- T1 gancho
// E2 al atardecer: grúa lenta que baja hacia la tarima; músicos tocan, bailarines rebotan agotados, bolsa de monedas.
export const T1: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t1;
	const pos: V3 = [k(f, [0, L], [-2.5, 1.2]), k(f, [0, L], [3.6, 2.2]), k(f, [0, L], [10.5, 6.5])];
	const pose: Pose = {pos, mira: [k(f, [0, L], [0.5, 1.2]), k(f, [0, L], [1.6, 1.9]), -6.8], fov: 50};
	const luz = mezclarLuz(TARDE, ATARDECER, 0.45);
	const m0 = loc(EV.monedas, 0); // «contrató»: la mano entrega la bolsa
	const alcalde = useMats(pregonero());
	const u = k(f, [m0 - 12, m0 + 22], [0, 1]);
	const bolsa: V3 = [4.5 + (1.5 - 4.5) * u, 2.5 + 0.5 * Math.sin(Math.PI * u) - 0.35 * u, -6.2];
	const monedas = useMemo(() => Array.from({length: 9}, (_, i) => ({a: (i - 4) * 0.45, v: 1.6 + (i % 3) * 0.5})), []);
	return (
		<AbsoluteFill>
			<Escena3D luz={luz} mundo={LOOK.golden} fondo="#f2b983" pose={pose} enfoque={[1, 1.5, -3]} deriva={0.3}>
				<Plaza g={f} modo="t1" cam={pos} zMax={pos[2] - 3} ritmoBaile={1.5} />
				<Carta mats={alcalde} idx={0} pos={[4.5, 1, -7.2]} cam={pos} s={1.3} />
				{u < 1 && <Sprite tex={bolsaTex()} pos={bolsa} cam={pos} w={1.5} h={1.5} />}
				{f >= m0 + 22 && monedas.map((c, i) => {
					const tt = (f - m0 - 22) / 30;
					const y = 2.4 + c.v * tt * 1.8 - 4.9 * tt * tt;
					if (y < 1.2) return null;
					return <Sprite key={i} tex={monedaTex()} pos={[1.5 + Math.sin(c.a) * tt * 2.2, y, -6.2 + Math.cos(c.a) * 0.3]} cam={pos} w={0.38} h={0.38} rotZ={tt * 6} />;
				})}
			</Escena3D>
			<Cifra texto="1518" inicio={14} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- T2 lugar
// E1 mediodía. Travelling lateral por la calle de entramado: el pan sube de precio; Troffea sale de su casa y baila sola.
const ZPUERTA = -6.25; // puerta de la casa de Troffea (x = -8)
export const T2: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t2;
	const camZ = 8 - 0.108 * f;
	const pos: V3 = [2.9, 1.9, camZ];
	const pose: Pose = {pos, mira: [-8, 0.95, camZ - 5.2], fov: 50};
	const tTro = loc(EV.troffea, INICIO.t2) - 4;
	const tSale = loc(EV.sale, INICIO.t2);
	const tSin = loc(EV.sinMusica, INICIO.t2);
	const troffea = useMats(troffeaBaila());
	const quieta = useMats(troffeaPie('nervous'));
	const vecinos = [useMats(vecino(0)), useMats(vecino(1)), useMats(vecino(2, 'shock')), useMats(vecino(3))];
	// Troffea: sale por la puerta, avanza hacia la calle y baila hacia el fondo (-z)
	const e = k(f, [tTro, tTro + 26], [0, 1]);
	const z = ZPUERTA - 0.085 * Math.max(0, f - tTro) - 0.2 * Math.sin(f / 9);
	const x = -7.7 + 4.3 * e + 0.4 * Math.sin(f / 13);
	const precio = f < loc(EV.pan, INICIO.t2) + 14 ? 0 : f < loc(EV.hambre, INICIO.t2) + 10 ? 1 : 2;
	const luz = DIA;
	const vz = [-12, -4.5, 2.5];
	return (
		<AbsoluteFill>
			<Escena3D luz={luz} mundo={LOOK.day} fondo="#9cc6ec" pose={pose} enfoque={[-6, 1, camZ - 4]} deriva={0.4}>
				<Adoquines tam={300} rep={36} />
				<Casas z0={-90} z1={50} mitad={8} />
				<Panaderia pos={[-6.4, 0, 5.2]} precio={precio} />
				{f >= tTro && (
					<>
						<Carta mats={troffea} idx={f * 0.3} pos={[x, Math.abs(Math.sin(f * 0.3)) * 0.22, z]} cam={pos} s={e < 1 ? 0.5 + 0.5 * e : 1} inclina={0.07 * Math.sin(f * 0.31)} />
						<Contacto pos={[x, 0, z]} />
					</>
				)}
				{/* vecinos que se asoman al verla (tras «Sin música») */}
				{vz.map((zz, i) => (
					<Carta key={i} mats={vecinos[i % 4]} pos={[-7.2 + (i % 2) * 1.1, 0, zz - (i === 2 ? 0 : 0)]} cam={pos} s={f > tSin - 30 + i * 10 ? 1 : 0.001} inclina={0.03 * Math.sin(f * 0.2 + i)} />
				))}
				{void quieta}{void tSale}
			</Escena3D>
			<Cifra texto="Estrasburgo, julio de 1518" inicio={10} fin={150} tam={64} />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- T3 escalada (1 -> 400)
// E1 (el sol cruza y cae; pasan días). Alejamiento continuo que revela la calle llena de bailarines.
const N3 = 400;
export const T3: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t3;
	const pos: V3 = [k(f, [0, L], [1.2, 3.0]), k(f, [0, L], [1.9, 8.5]), k(f, [0, L], [5, 30])];
	const pose: Pose = {pos, mira: [0, k(f, [0, L], [0.9, 0.2]), k(f, [0, L], [-1, -7])], fov: 50};
	const sol = k(f, [30, L], [0, 1]);
	const luz = mezclarLuz(DIA, {...TARDE, az: 130, el: 30}, sol);
	const cielo = mezclarColor('#9cc6ec', '#f3c08a', sol);
	const tMir = loc(EV.miran, INICIO.t3), t30 = loc(EV.treinta, INICIO.t3), t400 = loc(EV.cuatrocientos, INICIO.t3);
	const gente: Persona[] = useMemo(() => {
		const cerca = generarMultitud(40, 11, (r) => [(r() * 2 - 1) * 6.2, -11 + r() * 10.5]);
		const lejos = generarMultitud(N3 - 40, 12, (r) => [(r() * 2 - 1) * 6.4, -36 + r() * 58]);
		// crecimiento continuo: n(f) = 400 * u^3, de 1 en el cuadro 6 a 400 en «cuatrocientos»
		return [...cerca, ...lejos].map((p, i) => {
			const lado = p.x < 0 ? -1 : 1;
			const t0 = 6 + Math.cbrt(i / N3) * (t400 - 6);
			return {...p, t0: Math.round(t0), x0: lado * 7.6, z0: p.z, y0: i % 3 === 0 ? 4.2 : undefined};
		});
	}, [tMir, t30, t400]);
	const bancos = {
		bail: Array.from({length: 8}, (_, i) => useMats(bailarin(i))),
		sit: [], fall: [],
	};
	const troffea = useMats(troffeaBaila());
	const gv = useMemo(() => gente.filter((p) => p.z < 25), [gente]);
	return (
		<AbsoluteFill>
			<Escena3D luz={luz} mundo={LOOK.day} fondo={cielo} pose={pose} enfoque={[0, 1, -1]} lente={{cInf: 10}} deriva={0.4}>
				<Adoquines tam={300} rep={36} />
				<Casas z0={-90} z1={50} mitad={8} />
				<Catedral pos={[-4, 0, -128]} escala={1} calima="#e8d0c4" calimaK={0.4} />
				<Multitud gente={gv.filter((p) => p.z < pos[2] - 10)} f={f} cam={pos} bancos={bancos} />
				<Carta mats={troffea} idx={f * 0.3} pos={[0, Math.abs(Math.sin(f * 0.3)) * 0.22, -1]} cam={pos} s={1.0} inclina={0.07 * Math.sin(f * 0.31)} />
				<Contacto pos={[0, 0, -1]} />
			</Escena3D>
			<Cifra texto="DÍA 6" inicio={loc(EV.seis, INICIO.t3) - 4} fin={tMir - 6} />
			<Cifra texto="+30" inicio={t30 - 2} fin={t400 - 4} />
			<Cifra texto="400" inicio={t400 - 2} color="#ff5a3c" />
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- T4 escalada (médicos, mercado, tarima)
// E2 de tarde. Médicos toman el pulso; los sacos se apartan; carpinteros levantan la tarima; llegan los músicos. Grúa que sube.
export const T4: React.FC = () => {
	const f = useCurrentFrame();
	const g = f + INICIO.t4;
	const c = camaraPlaza(g);
	const pose: Pose = {pos: c.pos, mira: c.mira, fov: 50};
	return (
		<AbsoluteFill>
			<Escena3D luz={luzPlaza(g)} mundo={LOOK.golden} fondo={cieloPlaza(g)} pose={pose} enfoque={[0, 1, 6]} deriva={0.3}>
				<Plaza g={g} modo="flujo" cam={c.pos} zMax={c.pos[2] - (c.pos[2] > 20 ? 15 : 12)} />
			</Escena3D>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- T5 se rompe + doble línea
// Misma plaza (cámara compartida con T4); cambia la luz de dorada a azul. Caen los bailarines; montaña de zapatos;
// el pregonero clava el aviso y quitan el tambor al músico; un bailarín caído bosteza (empata con T6).
export const T5: React.FC = () => {
	const f = useCurrentFrame();
	const g = f + INICIO.t5;
	const c = camaraPlaza(g);
	const pose: Pose = {pos: c.pos, mira: c.mira, fov: 50};
	return (
		<AbsoluteFill>
			<Escena3D luz={luzPlaza(g)} mundo={LOOK.golden} fondo={cieloPlaza(g)} pose={pose} enfoque={[MONTANA[0], 1, MONTANA[2]]} deriva={0.3}>
				<Plaza g={g} modo="flujo" cam={c.pos} zMax={c.pos[2] - (c.pos[2] > 20 ? 15 : 12)} />
			</Escena3D>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- T6 inserto: camión de noche
// Un pasajero bosteza (empata con el bostezo de T5) y el bostezo recorre el pasillo uno por uno. Travelling por el pasillo.
export const T6: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t6;
	const pos: V3 = [k(f, [0, L], [-0.25, -0.05]), k(f, [0, L], [1.7, 1.85]), k(f, [0, L], [6.8, -9])];
	const mira: V3 = [k(f, [0, 60, L], [0.8, 0.3, 0]), k(f, [0, L], [1.5, 1.9]), k(f, [0, 60, L], [2.5, -4, -22])];
	const pose: Pose = {pos, mira, fov: 50};
	// pasajeros: [x, z, modo]
	const lista = useMemo(() => {
		const l: {x: number; z: number; modo: 'stand' | 'sit'; i: number}[] = [{x: 0.8, z: 2.5, modo: 'stand', i: 0}];
		const zs = [5.6, 2.4, -0.8, -4, -7.2, -10.4, -13.6, -16.8];
		zs.forEach((z, j) => {
			if (j !== 1) l.push({x: j % 2 ? -1.6 : 1.6, z, modo: 'sit', i: j + 1});
			if (j % 3 === 1 && j !== 1) l.push({x: -1.6 + (j % 2) * 3.2, z: z + 0.6, modo: 'stand', i: j + 7});
		});
		l.push({x: -1.6, z: 2.4, modo: 'sit', i: 3}, {x: 0.55, z: -8.6, modo: 'stand', i: 9}, {x: -0.6, z: -12.5, modo: 'stand', i: 4});
		return l;
	}, []);
	const m0 = useMats(pasajero(0, 'stand'));
	const bancos = lista.map((p) => ({p, mats: [useMats(pasajero(p.i, p.modo))][0]}));
	const luz: typeof NOCHE = {...NOCHE, az: 160, el: 38, lit: [0.62, 0.64, 1.0]};
	void m0;
	return (
		<AbsoluteFill>
			<Escena3D luz={luz} fondo="#141a34" pose={pose} enfoque={[0, 1.5, -3]} deriva={0.25}>
				<Camion f={f} z0={-24} z1={15} />
				<pointLight position={[0, 2.8, 4]} intensity={22} color="#ffe6b0" distance={14} decay={2} />
				<pointLight position={[0, 2.8, -6]} intensity={22} color="#ffe6b0" distance={14} decay={2} />
				<pointLight position={[0, 2.8, -15]} intensity={20} color="#ffe6b0" distance={14} decay={2} />
				{/* ventanal trasero con la luz de la calle (se convierte en velas en T7) */}
				<mesh position={[0, 1.9, -23.8]} material={emisivo('#ffb35a')}><planeGeometry args={[2.6, 1.0]} /></mesh>
				{bancos.map(({p, mats}, n) => {
					const t = p.i === 0 ? 6 : 36 + n * 11;
					const bosteza = f >= t && f < t + 22;
					const y = p.modo === 'sit' ? 0.42 : 0.08;
					return <Carta key={n} mats={mats} idx={bosteza ? 1 : 0} pos={[p.x, y, p.z]} cam={pos} s={0.92} />;
				})}
			</Escena3D>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- T7 remate
// E3 de noche: capilla de San Vito con velas; Troffea recibe los zapatos rojos; sus pies dan un último paso y se detienen.
export const T7: React.FC = () => {
	const f = useCurrentFrame();
	const g = f + INICIO.t7;
	const L = DUR.t7;
	const pos: V3 = [k(f, [0, L], [0.4, 0.15]), k(f, [0, 60, L], [1.8, 1.3, 0.55]), k(f, [0, L], [-1, -4.3])];
	const mira: V3 = [0, k(f, [0, 60, L], [0.9, 0.7, 0.5]), k(f, [0, L], [-10, -7.4])];
	const pose: Pose = {pos, mira, fov: 50};
	const tro = useMats(troffeaBaila());
	const quieta = useMats(troffeaPie('relief'));
	const luz: typeof NOCHE = {...NOCHE, az: 150, el: 40, lit: [0.6, 0.62, 1.0]};
	const tZap = EV.zapatos + 8, tFin = EV.ultima;
	// zapatos del altar vuelan a los pies de Troffea
	const u = ease(g, tZap, tZap + 26);
	const baila = g >= tZap + 10 && g < tFin;
	const pasos = baila ? Math.sin((g - tZap) * 0.42) : 0;
	const zx = [-0.2, 0.2];
	const levanta = (i: number) => (baila ? Math.max(0, Math.sin((g - tZap) * 0.42 + i * Math.PI)) * 0.14 : 0);
	const velas = useMemo(() => [[-2.2, 1.5, -10.1], [-1.4, 1.5, -9.8], [1.4, 1.5, -9.8], [2.2, 1.5, -10.1], [0, 1.5, -10.4], [-3, 0, -8], [3.4, 0, -7.4], [-4.2, 0, -5.6], [4.4, 0, -4.8]] as V3[], []);
	return (
		<AbsoluteFill>
			<Escena3D luz={luz} fondo="#0e1230" pose={pose} enfoque={[0, 1, -7.5]} deriva={0.25}>
				<Capilla />
				<pointLight position={[0, 2.6, -9.5]} intensity={26} color="#ffb35a" distance={12} decay={2} />
				<pointLight position={[0, 1.6, -6.4]} intensity={14} color="#ffc27a" distance={9} decay={2} />
				<pointLight position={[-4, 1.2, -5.6]} intensity={9} color="#ff9a4a" distance={8} decay={2} />
				{velas.map((v, i) => <Vela key={i} pos={v} f={f} fase={i * 1.7} alto={v[1] > 0 ? 0.5 : 0.7} />)}
				{/* ofrenda sobre el altar: baja hasta los pies al «ponen zapatos» (zapatos de caricatura) */}
				{[0, 1].map((i) => {
					const a: V3 = [zx[i] * 1.5, 1.55, -10];
					const b: V3 = [zx[i] * 1.15, 0.0, -7.35];
					const p: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + 1.2 * Math.sin(Math.PI * u) + levanta(i), a[2] + (b[2] - a[2]) * u];
					return <ZapatoRojo key={i} pos={p} cam={pos} w={0.62} flip={i === 0} rotZ={u < 1 ? 0.6 * Math.sin(u * 6) : 0} />;
				})}
				<Carta mats={baila || g < tZap ? tro : quieta} idx={baila ? (g - tZap) * 0.21 : 0} pos={[0, 0, -7.6]} cam={pos} s={1.0} inclina={baila ? 0.04 * pasos : 0} />
			</Escena3D>
		</AbsoluteFill>
	);
};

// Tomas con su inicio global (cuadro) y su duración.
export const SHOTS = [
	{id: 1, inicio: INICIO.t1, dur: DUR.t1, C: T1},
	{id: 2, inicio: INICIO.t2, dur: DUR.t2, C: T2},
	{id: 3, inicio: INICIO.t3, dur: DUR.t3, C: T3},
	{id: 4, inicio: INICIO.t4, dur: DUR.t4, C: T4},
	{id: 5, inicio: INICIO.t5, dur: DUR.t5, C: T5},
	{id: 6, inicio: INICIO.t6, dur: DUR.t6, C: T6},
	{id: 7, inicio: INICIO.t7, dur: DUR.t7, C: T7},
];
export const FIN_TOTAL = CORTES.fin;
void Caja; void Cilindro; void Easing; void medico; void musico; void sentado; void textura; void TROFFEA; void AZUL; void ease; void lin; void Vela;
