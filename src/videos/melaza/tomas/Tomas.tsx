import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Caja, Cilindro, Escena3D, NOCHE, Pose, Suelo, Tarjeta} from '../Escena3D';
import {LIGHTS, LOOK} from '../look/lights';
import {texturaContacto, texturaPersona, texturasCaballoGalope, texturasCorredor} from '../look/cartas';
import {cobbleHD, planksHD, rep} from '../look/paint';
import {twoTone} from '../look/shade';
import {melazaBordeMat, metalHD, parcheBrochazos} from '../look/materiales';
import {ABRIGO, CORREDOR_A, CORREDOR_B, Cifra, EMPRESARIO, OBRERO, Tanque, VECINA, clamp} from './comun';
import {CORTES, DUR, EV, INICIO, loc} from './cortes';
import {Edificios, Ola, gotaMaterial} from './ola';

// Siete tomas con cámara propia. Todos los tiempos salen de cortes.ts (calculados desde palabras.json).
// Cada componente recibe cuadros LOCALES de su toma (useCurrentFrame dentro de su Sequence).
// Encuadres pensados con la franja de subtítulos de cada toma (Subtitulos.tsx): caras y cuerpos nunca debajo de
// ella, y ningún personaje en el 20 % inferior.

const SOL = {...LIGHTS.day, az: 130, el: 40};
const DORADA = {...LIGHTS.golden, az: 150, el: 14};
const ANG = -0.6; // ángulo de la pared del tanque hacia la cámara (T2, T3)
const punto = (y: number, sep = 0, ang = ANG): [number, number, number] => [(5 + sep) * Math.sin(ang), y, (5 + sep) * Math.cos(ang)];
const suave = Easing.inOut(Easing.cubic);

const cobble = () => twoTone(new THREE.MeshLambertMaterial({map: rep(cobbleHD(), 40, 40)}));
const madera = () => twoTone(new THREE.MeshLambertMaterial({map: planksHD()}));

// T1 (gancho): personajes de pie frente al tanque gigante (centro-bajo, enteros); la cámara sube por el tanque
// girando alrededor, y los personajes salen por el lado. «21 MUERTOS» desde «veintiuna».
export const T1: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t1;
	// 0-62: personajes enteros en el centro; 62-112: travelling lateral (salen por la izquierda);
	// 100-fin: grúa rápida por el tanque hasta la tapa.
	const k = (xs: number[], ys: number[]) => interpolate(f, xs, ys, {...clamp, easing: suave});
	const pose: Pose = {
		pos: [k([0, 62, 112, L], [-1.0, -0.3, 5.5, 9]), k([0, 112, L], [2.0, 2.05, 15.5]), k([0, 62, 112, L], [17.4, 17.1, 16.8, 15])],
		mira: [k([0, 62, 112, L], [-0.6, -0.55, 5.0, 0.5]), k([0, 112, L], [1.95, 2.0, 16.2]), k([0, 112, L], [8.5, 8.3, 0])],
		fov: 52,
	};
	const tex = useMemo(() => [texturaPersona(ABRIGO, {mode: 'stand', expr: 'stern', seed: 3}), texturaPersona(OBRERO, {mode: 'stand', expr: 'shock', seed: 8})], []);
	const contacto = useMemo(() => texturaContacto('#3a2a1a'), []);
	const suelo = useMemo(cobble, []);
	const cam = pose.pos;
	return (
		<AbsoluteFill>
			<Escena3D luz={SOL} mundo={LOOK.day} fondo="#9cc6ec" pose={pose} enfoque={[0, 8, 0]} deriva={0.45}>
				<Suelo material={suelo} tam={400} />
				<Tanque />
				<Edificios z0={-60} z1={-12} mitad={9} />
				<Tarjeta tex={tex[0]} pos={[-1.75, 0, 9.0]} camara={cam} contacto={contacto} escala={1.1} />
				<Tarjeta tex={tex[1]} pos={[0.35, 0, 9.5]} camara={cam} contacto={contacto} escala={1.1} />
			</Escena3D>
			<Cifra texto="21 MUERTOS" inicio={loc(EV.veintiuna, INICIO.t1)} color="#ff5a3c" />
		</AbsoluteFill>
	);
};

// Chorro de melaza que baja por la pared: perfil de torno (grueso arriba, se afina, con abultamientos) + gota en
// la punta + gotas que caen al suelo. `largo` en metros (0 = no se ve).
const perfilChorro = new THREE.LatheGeometry(
	[[0, 0.03], [0.13, 0], [0.12, -0.08], [0.085, -0.25], [0.1, -0.42], [0.07, -0.62], [0.078, -0.78], [0.055, -0.95], [0.0, -1]].map(([x, y]) => new THREE.Vector2(x, y)),
	14,
);
const Chorro: React.FC<{base: [number, number, number]; largo: number; grosor?: number; f: number; fase: number; mat: THREE.Material; caen: boolean}> = ({base, largo, grosor = 1, f, fase, mat, caen}) => {
	if (largo < 0.02) return null;
	const punta = base[1] - largo;
	const gotas = caen ? [0, 1, 2] : [];
	return (
		<group>
			<mesh geometry={perfilChorro} material={mat} position={base} scale={[grosor, largo, grosor * 0.6]} />
			<mesh material={mat} position={[base[0], punta - 0.02, base[2]]} scale={[0.1 * grosor, 0.14 * grosor, 0.08 * grosor]}>
				<sphereGeometry args={[1, 12, 10]} />
			</mesh>
			{gotas.map((k) => {
				// gota que se desprende de la punta y cae (ciclo de 22 cuadros)
				const c = ((f + fase * 22 + k * 7.3) % 22) / 22;
				const tt = c * 0.73;
				const y = punta - 0.1 - 4.9 * tt * tt * 2.2;
				if (y < 0.1) return null;
				return (
					<mesh key={k} material={mat} position={[base[0] + 0.12 * Math.sin(-0.6), y, base[2] + 0.12 * Math.cos(-0.6) + tt * 0.3]} scale={[0.07 * grosor, 0.12 * grosor, 0.07 * grosor]}>
						<sphereGeometry args={[1, 10, 8]} />
					</mesh>
				);
			})}
		</group>
	);
};

// Parche gris pintado a brochazos sobre la pared curva: aparece brochazo a brochazo (progreso 0..1).
const ParcheBrochazos: React.FC<{ang: number; y: number; ancho: number; alto: number; progreso: number}> = ({ang, y, ancho, alto, progreso}) => {
	const mat = useMemo(() => {
		const t = parcheBrochazos();
		return twoTone(new THREE.MeshLambertMaterial({map: t.color, alphaMap: t.orden, alphaTest: 0.99, side: THREE.FrontSide}));
	}, []);
	const r = 5.07;
	const geo = useMemo(() => new THREE.CylinderGeometry(r, r, alto, 40, 1, true, ang - ancho / r / 2, ancho / r), [ang, ancho, alto]);
	mat.alphaTest = Math.max(0.02, 1 - progreso);
	return <mesh geometry={geo} material={mat} position={[0, y, 0]} visible={progreso > 0.01} />;
};

// T2 (goteras): plano abierto del tanque (placas, filas de remaches) que se acerca SIN detenerse; desde
// «goteras» bajan chorros de melaza brillante por la pared y caen gotas; en «las tapa con pintura» un parche gris se
// extiende a brochazos y tapa el origen de las goteras.
export const T2: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t2;
	const t0 = loc(EV.goteras, INICIO.t2);
	const tp = loc(inicioLas(), INICIO.t2);
	const tFin = L - 2;
	// distancia a la pared: 27 m -> 10 m (rápido al principio, sin tramo quieto) -> 8,6 m
	const dist = interpolate(f, [0, 150, L], [27, 10.5, 8.6], {...clamp, easing: Easing.out(Easing.quad)});
	const a = interpolate(f, [0, L], [ANG + 0.55, ANG + 0.16], clamp);
	const yc = interpolate(f, [0, 150, L], [7.5, 9.2, 9.6], clamp);
	const pose: Pose = {
		pos: [(5 + dist) * Math.sin(a), yc, (5 + dist) * Math.cos(a)],
		mira: [punto(0, 0, ANG + 0.06)[0] * 1.0, interpolate(f, [0, 150, L], [7.6, 9.0, 9.2], clamp), punto(0, 0, ANG + 0.06)[2]],
		fov: 46,
	};
	const mat = useMemo(() => gotaMaterial('#2c1002', 1.5, [0.2, 0.7, 0.7], 0.35), []);
	const chorros = useMemo(() => [
		{da: -0.17, y0: 10.85, l: 3.6, g: 1.9, d: 0},
		{da: -0.075, y0: 10.85, l: 2.2, g: 1.4, d: 5},
		{da: 0.0, y0: 10.85, l: 4.4, g: 2.2, d: 2},
		{da: 0.085, y0: 10.85, l: 2.8, g: 1.6, d: 9},
		{da: 0.165, y0: 10.85, l: 3.3, g: 1.85, d: 4},
		{da: 0.245, y0: 10.85, l: 1.6, g: 1.3, d: 12},
	], []);
	const suelo = useMemo(cobble, []);
	const parche = interpolate(f, [tp - 3, tFin], [0, 1], clamp);
	return (
		<AbsoluteFill>
			<Escena3D luz={SOL} mundo={LOOK.day} fondo="#9cc6ec" pose={pose} enfoque={punto(9.5)}>
				<Suelo material={suelo} tam={300} />
				<Tanque />
				<Edificios z0={-70} z1={-14} mitad={10} />
				{chorros.map((c, i) => {
					const ang = ANG + 0.06 + c.da;
					const crece = interpolate(f, [t0 + c.d, t0 + c.d + 40], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
					const largo = c.l * crece * (1 + 0.04 * Math.sin(f / 9 + i));
					const b = punto(c.y0, 0.07, ang);
					return <Chorro key={i} base={b} largo={largo} grosor={c.g} f={f} fase={i * 0.37} mat={mat} caen={crece > 0.6} />;
				})}
				<ParcheBrochazos ang={ANG + 0.1} y={10.9} ancho={3.1} alto={2.0} progreso={parche} />
			</Escena3D>
		</AbsoluteFill>
	);
};
// «las» (de «las tapa con pintura»): 1.ª aparición de «las» después de «alguien»
const inicioLas = () => EV.las;

// T3 (vecinos): tres vecinos de época JUNTOS riéndose (enteros, centro-bajo); zoom brusco a los remaches en «cede».
export const T3: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t3;
	const cede = loc(EV.cede, INICIO.t3);
	const zoom = interpolate(f, [cede - 17, cede - 1], [0, 1], clamp);
	const lento = interpolate(f, [0, cede - 17], [0, 1], clamp);
	const pose: Pose = {
		pos: [interpolate(zoom, [0, 1], [-1.3 + 0.5 * lento, -2.6]), interpolate(zoom, [0, 1], [1.7, 8.5]), interpolate(zoom, [0, 1], [29.6 - 1.2 * lento, 9.2])],
		mira: [interpolate(zoom, [0, 1], [-1.0 + 0.25 * lento, -2.8]), interpolate(zoom, [0, 1], [1.5, 8.5]), interpolate(zoom, [0, 1], [18, 4.1])],
		fov: interpolate(zoom, [0, 1], [38, 50], clamp),
	};
	const grieta = interpolate(f, [cede - 6, cede + 13], [0, 1], clamp);
	const tex = useMemo(() => [
		texturaPersona(OBRERO, {mode: 'stand', expr: 'laugh', seed: 2}),
		texturaPersona(VECINA, {mode: 'stand', expr: 'grin', seed: 11}),
		texturaPersona(ABRIGO, {mode: 'stand', expr: 'laugh', seed: 6}),
	], []);
	const contacto = useMemo(() => texturaContacto('#3a2a1a'), []);
	const cam = pose.pos as [number, number, number];
	const salto = interpolate(f, [cede, Math.min(L, cede + 14)], [0, 1], clamp);
	const remaches = useMemo(() => Array.from({length: 8}, (_, k) => ({a: k * 0.8, s: 0.08 + (k % 3) * 0.04})), []);
	const suelo = useMemo(cobble, []);
	const vecinos: {x: number; z: number; ph: number}[] = [{x: -2.05, z: 18.2, ph: 0}, {x: -0.95, z: 17.8, ph: 1.7}, {x: 0.12, z: 18.3, ph: 3.1}];
	return (
		<AbsoluteFill>
			<Escena3D luz={SOL} mundo={LOOK.day} fondo="#9cc6ec" pose={pose} enfoque={[-2.8, 8.5, 4.1]} deriva={0.35}>
				<Suelo material={suelo} tam={300} />
				<Tanque />
				<Edificios z0={-70} z1={-14} mitad={10} />
				<Caja size={[0.5 + 1.2 * grieta, 3.2 * grieta + 0.05, 0.08]} pos={punto(12.4, 0.07)} rot={[0, ANG, 0]} color="#120a02" />
				{remaches.map((r, k) => {
					const d = salto * 2;
					return (
						<mesh key={k} visible={salto > 0.01}
							position={[punto(6 + k * 0.6 + d, 0.4 + d)[0] + Math.cos(r.a) * d, 6 + k * 0.6 + d, punto(6, 0.4 + d)[2] + Math.sin(r.a) * d]}>
							<sphereGeometry args={[r.s, 8, 6]} />
							<meshBasicMaterial color="#c9b58a" />
						</mesh>
					);
				})}
				{vecinos.map((v, i) => {
					// risa: rebote corto y balanceo
					const risa = Math.abs(Math.sin(f * 0.42 + v.ph));
					return (
						<Tarjeta key={i} tex={tex[i]} pos={[v.x, 0.05 * risa, v.z]} camara={cam} contacto={contacto} escala={1.1}
							inclina={0.05 * Math.sin(f * 0.21 + v.ph)} />
					);
				})}
			</Escena3D>
		</AbsoluteFill>
	);
};

// T4 (ola): calle Commercial al atardecer; la ola de melaza (9,5 m, cresta que se enrolla) avanza por la calle;
// delante, un caballo galopando y dos personas corriendo HACIA CÁMARA (la cámara retrocede con ellos).
export const T4: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t4;
	const t = f / L;
	const camZ = interpolate(f, [0, L], [14, 27]);
	const camX = 0.35 * Math.sin(f / 37);
	const pose: Pose = {
		pos: [camX, 2.2, camZ],
		mira: [camX * 0.5 + 0.1, 1.85, camZ - 20],
		fov: 52,
	};
	const cielo = new THREE.Color('#ffc47c').lerp(new THREE.Color('#c4848e'), t).getStyle();
	const zFrente = interpolate(f, [0, L], [-62, -2]);
	const suelo = useMemo(cobble, []);
	const caballo = useMemo(() => texturasCaballoGalope(6), []);
	const corrA = useMemo(() => texturasCorredor(CORREDOR_A, 5, 6), []);
	const corrB = useMemo(() => texturasCorredor(CORREDOR_B, 9, 6), []);
	const contacto = useMemo(() => texturaContacto('#2a1a10'), []);
	const cam = pose.pos as [number, number, number];
	const ca = loc(EV.caballos, INICIO.t4);
	// distancia a cámara: personas ~9 m; el caballo llega desde atrás y se pone a ~10 m en «caballos»
	const dCab = interpolate(f, [0, ca + 20], [17, 10.2], {...clamp, easing: Easing.out(Easing.quad)});
	const ciclo = (vel: number, of = 0) => Math.floor(f / vel + of);
	return (
		<AbsoluteFill>
			<Escena3D luz={DORADA} mundo={LOOK.golden} fondo={cielo} pose={pose} enfoque={[0, 2, camZ - 9]} deriva={0.3}>
				<Suelo material={suelo} tam={400} />
				<Edificios z0={-110} z1={70} />
				<Ola f={f} zFrente={zFrente} ancho={30} sol={[0.48, 0.3, 0.82]} />
				<Tarjeta tex={caballo} idx={ciclo(2)} caballo pos={[0.75 + 0.2 * Math.sin(f / 23), 0.06 * Math.abs(Math.sin(f * 0.8)), camZ - dCab]} camara={cam} escala={2.9} contacto={contacto} />
				<Tarjeta tex={corrA} idx={ciclo(2.5)} pos={[-1.15, 0, camZ - 8.6 + 0.4 * Math.sin(f / 31)]} camara={cam} escala={1.18} contacto={contacto} />
				<Tarjeta tex={corrB} idx={ciclo(2.5, 3)} pos={[1.85, 0, camZ - 9.4 + 0.4 * Math.cos(f / 29)]} camara={cam} escala={1.18} contacto={contacto} />
			</Escena3D>
		</AbsoluteFill>
	);
};

// T5 (pared): la pared del tanque se rompe en «pared» (placas y remaches que saltan) y la ola sale y avanza por la
// calle hacia cámara, cubriendo los adoquines con una capa de melaza. «150 HERIDOS» arriba desde «ciento».
export const T5: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t5;
	const pared = loc(EV.pared, INICIO.t5);
	const e = interpolate(f, [0, L], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
	const pose: Pose = {
		pos: [interpolate(e, [0, 1], [5, 2.5]), interpolate(e, [0, 1], [13, 11.5]), interpolate(e, [0, 1], [42, 64])],
		mira: [0, interpolate(e, [0, 1], [5.5, 3.2]), interpolate(e, [0, 1], [0, 21])],
		fov: 50,
	};
	const grieta = interpolate(f, [pared, pared + 10], [0, 1], clamp);
	const sale = f >= pared + 3;
	const alto = interpolate(f, [pared + 3, pared + 30], [3, 9.5], {...clamp, easing: Easing.out(Easing.quad)});
	const zFrente = interpolate(f, [pared + 3, L], [-1.5, 31], {...clamp, easing: Easing.out(Easing.sin)});
	const suelo = useMemo(cobble, []);
	const acero = useMemo(() => twoTone(new THREE.MeshLambertMaterial({map: metalHD()})), []);
	const placas = useMemo(() => Array.from({length: 7}, (_, k) => ({vx: (k - 3) * 1.6, vy: 7 + (k % 3) * 2.5, vz: 6 + (k % 2) * 3, rot: k * 0.9, w: 1.2 + (k % 3) * 0.5})), []);
	const remaches = useMemo(() => Array.from({length: 14}, (_, k) => ({vx: ((k * 7) % 13 - 6) * 0.9, vy: 6 + (k % 4) * 2, vz: 7 + (k % 3) * 2})), []);
	return (
		<AbsoluteFill>
			<Escena3D luz={SOL} mundo={LOOK.day} fondo="#a9c4e8" pose={pose} enfoque={[0, 4, 14]} deriva={0.6}>
				<Suelo material={suelo} tam={400} />
				<Tanque />
				<Edificios z0={-60} z1={-9} mitad={8} />
				<Edificios z0={8} z1={90} />
				<Caja size={[0.6 + 3.4 * grieta, 0.2 + 5.5 * grieta, 0.12]} pos={[0, 4.2, 5.02]} color="#120a02" />
				{placas.map((p, k) => {
					const tt = Math.max(0, f - pared) / 30;
					if (f < pared) return null;
					const y = Math.max(0.15, 4.5 + p.vy * tt - 4.9 * tt * tt);
					return <Caja key={k} size={[p.w, p.w * 0.7, 0.12]} pos={[p.vx * tt, y, 5.2 + p.vz * tt]} rot={[p.rot * tt * 3, p.rot * tt * 2, p.rot]} material={acero} />;
				})}
				{remaches.map((p, k) => {
					const tt = Math.max(0, f - pared) / 30;
					if (f < pared) return null;
					const y = 4.5 + p.vy * tt - 4.9 * tt * tt;
					if (y < 0.1) return null;
					return (
						<mesh key={k} position={[p.vx * tt, y, 5.2 + p.vz * tt]}>
							<sphereGeometry args={[0.12, 8, 6]} />
							<meshBasicMaterial color="#3a2212" />
						</mesh>
					);
				})}
				{sale && <Ola f={f} zFrente={zFrente} alto={alto} ancho={30} sol={[0.45, 0.7, 0.55]} />}
			</Escena3D>
			<Cifra texto="150 HERIDOS" inicio={loc(EV.ciento, INICIO.t5)} color="#ffd34d" />
		</AbsoluteFill>
	);
};

// Hilo de miel: perfil de torno que se afina (grueso arriba, cintura fina, gota abajo).
const perfilHilo = new THREE.LatheGeometry(
	[[0, 0.02], [0.16, 0], [0.12, -0.12], [0.075, -0.35], [0.05, -0.6], [0.035, -0.85], [0.03, -0.97], [0, -1]].map(([x, y]) => new THREE.Vector2(x, y)),
	14,
);

// T6 (frasco): frasco de miel con burbujas que suben y crecen (desde «fermentación»), tapa que se levanta y vibra
// en «reventó», remaches de la tapa que saltan en «remaches», hilos de miel brillantes que se afinan y gotean, y
// charco en la mesa. Acercamiento lento continuo.
export const T6: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t6;
	const bub0 = loc(EV.fermento, INICIO.t6);
	const rev0 = loc(EV.revento, INICIO.t6);
	const rem0 = loc(EV.remaches, INICIO.t6);
	const pose: Pose = {
		pos: [interpolate(f, [0, L], [-0.3, 0.3], clamp), interpolate(f, [0, L], [6.6, 7.0], clamp), interpolate(f, [0, L], [13.5, 10.6], clamp)],
		mira: [0, 5.8, 0],
		fov: 44,
	};
	const tapa = interpolate(f, [rev0, rev0 + 17], [0, 1.25], clamp) + 0.05 * Math.sin(f * 1.7) * interpolate(f, [rev0, rev0 + 30], [0, 1], clamp);
	const avance = interpolate(f, [rev0 + 4, rev0 + 70], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
	const charco = interpolate(f, [rev0 + 40, L], [0.3, 2.0], clamp);
	const burbujas = useMemo(() => Array.from({length: 16}, (_, k) => ({
		a: Math.PI / 2 + ((k * 0.61) % 1.8) - 0.9, r: 1.15 + (k % 3) * 0.035, s: 0.06 + (k % 4) * 0.025, off: (k * 23) % 90, vel: 70 + (k % 5) * 12,
	})), []);
	const hilos = useMemo(() => [
		{a: Math.PI / 2 - 0.95, l: 1.0, g: 1.0}, {a: Math.PI / 2 - 0.55, l: 0.55, g: 0.8}, {a: Math.PI / 2 - 0.2, l: 0.85, g: 1.15},
		{a: Math.PI / 2 + 0.15, l: 0.42, g: 0.75}, {a: Math.PI / 2 + 0.5, l: 1.0, g: 1.05}, {a: Math.PI / 2 + 0.85, l: 0.66, g: 0.9},
		{a: Math.PI / 2 + 1.25, l: 0.5, g: 0.8},
	], []);
	const mats = useMemo(() => ({
		madera: madera(),
		vidrio: twoTone(new THREE.MeshPhongMaterial({color: '#bfe9ff', transparent: true, opacity: 0.2, depthWrite: false, specular: new THREE.Color('#ffffff'), shininess: 140})),
		miel: gotaMaterial('#d88608', 1.1, [0.4, 0.75, 0.55]),
		mielCuerpo: twoTone(new THREE.MeshPhongMaterial({color: '#f2a20a', specular: new THREE.Color('#fff0b0'), shininess: 60, emissive: new THREE.Color('#5a2e00')})),
		burb: gotaMaterial('#ffe2a0', 1.4, [0.3, 0.8, 0.6]),
		tapa: twoTone(new THREE.MeshPhongMaterial({color: '#a8a8ad', specular: new THREE.Color('#ffffff'), shininess: 80})),
		remache: gotaMaterial('#8a8a92', 1.5, [0.3, 0.8, 0.6]),
		etiqueta: twoTone(new THREE.MeshLambertMaterial({color: '#f4ead2'})),
	}), []);
	const ramMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#fff6c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false}), []);
	const destello = interpolate(f, [rem0, rem0 + 8], [0, 1], clamp);
	ramMat.opacity = f >= rem0 ? 0.9 * (1 - destello) : 0;
	const yTapa = 7.25 + tapa;
	return (
		<AbsoluteFill>
			<Escena3D luz={NOCHE} fondo="#2a1a10" pose={pose} enfoque={[0, 6, 0]} deriva={0.3}>
				<pointLight position={[2.5, 9, 3]} intensity={180} color="#ffb35a" distance={40} decay={2} />
				<Suelo color="#141a2e" tam={120} />
				<Caja size={[10, 0.8, 6]} pos={[0, 3.6, 0]} material={mats.madera} />
				<Caja size={[30, 22, 0.6]} pos={[0, 9, -8.6]} color="#2b2f4a" />
				<mesh position={[0, 5.3, 0]} material={mats.mielCuerpo}>
					<cylinderGeometry args={[1.12, 1.12, 2.6, 32]} />
				</mesh>
				{burbujas.map((b, k) => {
					const activo = f >= bub0;
					const vel = activo ? b.vel * 0.55 : b.vel * 1.6;
					const p = (((f + b.off) % vel) + vel) % vel / vel;
					const y = 4.15 + p * 2.35;
					const crece = (activo ? interpolate(f, [bub0, bub0 + 40], [1, 1.9], clamp) : (k % 4 === 0 ? 0.8 : 0)) * interpolate(p, [0, 0.15, 0.9, 1], [0.3, 1, 1.15, 0.2], clamp);
					return (
						<mesh key={k} position={[Math.cos(b.a) * b.r, y, Math.sin(b.a) * b.r]} scale={[crece, crece, crece]} material={mats.burb} visible={crece > 0.02}>
							<sphereGeometry args={[b.s, 12, 10]} />
						</mesh>
					);
				})}
				<Cilindro radio={1.3} alto={3} pos={[0, 5.5, 0]} material={mats.vidrio} />
				<mesh position={[-0.7, 5.5, 1.1]} rotation={[0, 0.6, 0]}>
					<boxGeometry args={[0.08, 2.3, 0.02]} />
					<meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
				</mesh>
				<Cilindro radio={1.31} alto={0.7} pos={[0, 4.55, 0]} material={mats.etiqueta} segmentos={48} />
				<group position={[0, yTapa, 0]}>
					<mesh material={mats.tapa}><cylinderGeometry args={[1.36, 1.36, 0.5, 40]} /></mesh>
					{[0.1, 0.22, 0.34].map((yy, k) => (
						<mesh key={k} position={[0, -0.2 - yy, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.tapa}>
							<torusGeometry args={[1.32, 0.05, 8, 40]} />
						</mesh>
					))}
				</group>
				{Array.from({length: 10}, (_, k) => {
					// remaches de la tapa: saltan hacia fuera en «remaches» (con giro y gravedad)
					const a = Math.PI / 2 + (k - 4.5) * 0.36;
					const tt = Math.max(0, f - rem0) / 30;
					const rr = 1.4 + 3.2 * tt;
					const y = yTapa + 2.2 * tt * (f >= rem0 ? 1 : 0) - 4.9 * tt * tt;
					return (
						<mesh key={k} material={mats.remache} position={[Math.cos(a) * rr, y, Math.sin(a) * rr]} scale={[1, 0.7, 1]} visible={y > 3.9 && tt < 0.6}>
							<sphereGeometry args={[0.11, 10, 8]} />
						</mesh>
					);
				})}
				{f >= rem0 && destello < 1 && Array.from({length: 10}, (_, k) => {
					// chispazos del salto de cada remache (rayas que salen hacia fuera)
					const a = Math.PI / 2 + (k - 4.5) * 0.36;
					const r0 = 1.45 + 0.8 * destello;
					return (
						<mesh key={k} material={ramMat} position={[Math.cos(a) * (r0 + 0.25), yTapa + 0.05, Math.sin(a) * (r0 + 0.25)]} rotation={[0, -a, Math.PI / 2]}>
							<cylinderGeometry args={[0.025, 0.06, 0.5 + 0.4 * destello, 6]} />
						</mesh>
					);
				})}
				{f > rev0 && (
					<mesh position={[0, 6.98, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.miel} scale={[1, 1, 0.6 + 0.4 * avance]}>
						<torusGeometry args={[1.3, 0.13 * Math.min(1, avance * 3), 10, 40]} />
					</mesh>
				)}
				{f > rev0 && hilos.map((h, k) => {
					const largo = Math.max(0.03, 2.95 * h.l * avance * (1 + 0.03 * Math.sin(f / 7 + k)));
					const x = Math.cos(h.a) * 1.36, z = Math.sin(h.a) * 1.36;
					const punta = 6.98 - largo;
					const gotea = h.l < 0.99 && avance > 0.5;
					const c = ((f + k * 9) % 26) / 26;
					const yg = punta - 0.1 - 4.9 * Math.pow(c * 0.85, 2) * 2;
					return (
						<group key={k}>
							<mesh geometry={perfilHilo} material={mats.miel} position={[x, 6.98, z]} scale={[h.g, largo, h.g]} />
							{h.l < 0.99 && (
								<mesh material={mats.miel} position={[x, punta - 0.03, z]} scale={[0.09 * h.g, 0.13 * h.g, 0.09 * h.g]}>
									<sphereGeometry args={[1, 12, 10]} />
								</mesh>
							)}
							{gotea && yg > 4.05 && (
								<mesh material={mats.miel} position={[x + Math.cos(h.a) * 0.05, yg, z + Math.sin(h.a) * 0.05]} scale={[0.06, 0.1, 0.06]}>
									<sphereGeometry args={[1, 10, 8]} />
								</mesh>
							)}
						</group>
					);
				})}
				<mesh position={[0, 4.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[charco, charco, 1]} visible={f > rev0 + 40} material={mats.miel}>
					<circleGeometry args={[1.6, 40]} />
				</mesh>
			</Escena3D>
		</AbsoluteFill>
	);
};

// Cartel «ANARQUISTAS» (lienzo con borde de tinta); el texto se ajusta al ancho para verse completo.
const texturaCartel = (texto: string) => {
	const c = document.createElement('canvas');
	c.width = 1600;
	c.height = 520;
	const g = c.getContext('2d')!;
	g.fillStyle = '#f2e6c8';
	g.fillRect(0, 0, 1600, 520);
	g.lineWidth = 36;
	g.strokeStyle = '#241726';
	g.strokeRect(18, 18, 1564, 484);
	g.fillStyle = '#b5201c';
	let px = 220;
	g.font = `900 ${px}px Arial Black, Arial, sans-serif`;
	while (g.measureText(texto).width > 1380 && px > 40) {
		px -= 6;
		g.font = `900 ${px}px Arial Black, Arial, sans-serif`;
	}
	g.textAlign = 'center';
	g.textBaseline = 'middle';
	g.fillText(texto, 800, 270);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
};

// T7 (remate): empresario de 1919 entero y centrado; el cartel «ANARQUISTAS» aparece completo sobre él en
// «anarquistas». Cámara en movimiento hasta el último cuadro.
export const T7: React.FC = () => {
	const f = useCurrentFrame();
	const L = DUR.t7;
	const pose: Pose = {
		pos: [interpolate(f, [0, L], [0.7, -0.5], clamp), interpolate(f, [0, L], [2.3, 2.45], clamp), interpolate(f, [0, L], [13.4, 12.3], clamp)],
		mira: [interpolate(f, [0, L], [0.15, 0.0], clamp), 1.25, 2],
		fov: 40,
	};
	const tex = useMemo(() => texturaPersona(EMPRESARIO, {mode: 'stand', expr: 'stern', seed: 4}), []);
	const cartel = useMemo(() => texturaCartel('ANARQUISTAS'), []);
	const contacto = useMemo(() => texturaContacto('#3a2a1a'), []);
	const cam = pose.pos as [number, number, number];
	const a0 = loc(EV.anarquistas, INICIO.t7);
	const escCartel = interpolate(f, [a0, a0 + 6, a0 + 10], [0, 1.08, 1], clamp);
	const mats = useMemo(() => ({madera: madera(), suelo: cobble()}), []);
	return (
		<AbsoluteFill>
			<Escena3D luz={LIGHTS.day} mundo={LOOK.day} fondo="#d9c79a" pose={pose} enfoque={[0, 1.5, 4]} deriva={0.3}>
				<Suelo material={mats.suelo} tam={60} />
				<Caja size={[24, 14, 0.6]} pos={[0, 7, -2]} material={mats.madera} />
				<Tarjeta tex={tex} pos={[0.05, 0, 4]} camara={cam} contacto={contacto} escala={1.15} />
				<mesh position={[0.1, 3.05, -1.62]} scale={[escCartel, escCartel, 1]} visible={escCartel > 0.01}>
					<planeGeometry args={[4.0, 1.3]} />
					<meshBasicMaterial map={cartel} toneMapped={false} />
				</mesh>
			</Escena3D>
		</AbsoluteFill>
	);
};

// Tomas con su inicio global (cuadro) y su duración. El corte siguiente lo marca CORTES.
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
export {melazaBordeMat};
