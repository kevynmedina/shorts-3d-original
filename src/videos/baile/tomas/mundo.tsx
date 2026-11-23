import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Caja, Cilindro} from '../Escena3D';
import {twoTone} from '../../melaza/look/shade';
import {cardShade} from '../../melaza/look/cardshade';
import {geoPersona} from '../../melaza/look/cartas';
import {ctex, facadeHD, planksHD, rep, rng, stoneHD, cobbleHD} from '../../melaza/look/paint';

// Escenarios del baile: casas de entramado, catedral, panadería, mercado de grano, capilla, camión y cartas.
export type V3 = [number, number, number];
const INK = '#241726';

export const lam = (color: string) => twoTone(new THREE.MeshLambertMaterial({color}));
export const lamTex = (t: THREE.Texture) => twoTone(new THREE.MeshLambertMaterial({map: t}));
export const emisivo = (color: string) => new THREE.MeshBasicMaterial({color, toneMapped: false});

// Mezcla de dos presets de luz (todos los números, vectores y colores).
export const mezclarLuz = <T extends Record<string, unknown>>(a: T, b: T, t: number): T => {
	const out: Record<string, unknown> = {};
	for (const k of Object.keys(a)) {
		const va = a[k], vb = b[k];
		if (typeof va === 'number' && typeof vb === 'number') out[k] = va + (vb - va) * t;
		else if (Array.isArray(va) && Array.isArray(vb)) out[k] = va.map((x: number, i: number) => x + (vb[i] - x) * t);
		else if (typeof va === 'string' && typeof vb === 'string' && va.startsWith('#') && vb.startsWith('#'))
			out[k] = new THREE.Color(va).lerp(new THREE.Color(vb), t).getStyle();
		else out[k] = va;
	}
	return out as T;
};
export const mezclarColor = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t).getStyle();

// ---------------- Cartas (personajes planos) ----------------
let GEO: THREE.BufferGeometry | null = null;
const geo = () => (GEO ??= geoPersona());

export const useMats = (texs: THREE.Texture[]) =>
	useMemo(() => texs.map((t) => cardShade(new THREE.MeshLambertMaterial({map: t, alphaTest: 0.5, side: THREE.DoubleSide}))), [texs]);

// Carta billboard (yaw hacia la cámara) con sombra proyectada. Sin mancha de contacto (para multitudes).
export const Carta: React.FC<{mats: THREE.Material[]; idx?: number; pos: V3; cam: V3; s?: number; inclina?: number; sombra?: boolean}> = ({
	mats, idx = 0, pos, cam, s = 1, inclina = 0, sombra = true,
}) => {
	const yaw = Math.atan2(cam[0] - pos[0], cam[2] - pos[2]);
	const mat = mats[((Math.floor(idx) % mats.length) + mats.length) % mats.length];
	return <mesh geometry={geo()} material={mat} position={pos} rotation={[0, yaw, inclina]} scale={[s, s, s]} castShadow={sombra} />;
};

// Mancha de contacto sencilla (óvalo oscuro multiplicado) bajo un personaje principal.
let BLOB: THREE.Texture | null = null;
const blobTex = () => {
	if (BLOB) return BLOB;
	const c = document.createElement('canvas');
	c.width = c.height = 128;
	const g = c.getContext('2d')!;
	const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
	gr.addColorStop(0, 'rgba(30,20,50,0.55)'); gr.addColorStop(0.55, 'rgba(30,20,50,0.3)'); gr.addColorStop(1, 'rgba(30,20,50,0)');
	g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
	BLOB = new THREE.CanvasTexture(c);
	return BLOB;
};
export const Contacto: React.FC<{pos: V3; r?: number}> = ({pos, r = 0.55}) => (
	<mesh position={[pos[0], 0.02, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
		<planeGeometry args={[r * 2.2, r * 1.3]} />
		<meshBasicMaterial map={blobTex()} transparent depthWrite={false} toneMapped={false} />
	</mesh>
);

// ---------------- Multitud ----------------
export type Persona = {
	x: number; z: number; o: number; ph: number; s: number;
	t0: number;              // cuadro (local de quien llama) en que aparece
	x0?: number; y0?: number; z0?: number; // origen de entrada (puerta o ventana)
	tCae?: number;           // cuadro en que cae rendido (undefined = nunca)
};

export const generarMultitud = (n: number, semilla: number, zona: (r: () => number) => [number, number], escala: [number, number] = [0.74, 0.9]): Persona[] => {
	const r = rng(semilla);
	return Array.from({length: n}, (_, i) => {
		const [x, z] = zona(r);
		return {x, z, o: Math.floor(r() * 8), ph: r() * 4, s: escala[0] + r() * (escala[1] - escala[0]), t0: 0, tCae: undefined};
	});
};

type BancoMultitud = {bail: THREE.Material[][]; sit: THREE.Material[][]; fall: THREE.Material[][]};
export const Multitud: React.FC<{
	gente: Persona[]; f: number; cam: V3; bancos: BancoMultitud; ritmo?: number; entrada?: number;
}> = ({gente, f, cam, bancos, ritmo = 1, entrada = 22}) => {
	return (
		<>
			{gente.map((p, i) => {
				if (f < p.t0) return null;
				const e = Math.min(1, (f - p.t0) / entrada); // progreso de entrada
				const ee = e * e * (3 - 2 * e);
				const bx = p.x0 !== undefined ? p.x0 + (p.x - p.x0) * ee : p.x;
				const bz = p.z0 !== undefined ? p.z0 + (p.z - p.z0) * ee : p.z;
				const caido = p.tCae !== undefined && f >= p.tCae;
				const t = f * 0.2 * ritmo + p.ph * 7;
				if (caido) {
					// caído: unos tumbados de lado, otros sentados y vencidos
					const lista = bancos.sit;
					const k = p.o % lista.length;
					const dentro = Math.min(1, (f - (p.tCae as number)) / 14);
					const tumbado = p.o % 3 !== 0;
					const dir = p.o % 2 ? 1 : -1;
					const ang = tumbado ? dir * 1.38 * dentro : dir * 0.25 * dentro;
					return <Carta key={i} mats={lista[k]} pos={[bx, tumbado ? 0.28 * p.s * dentro : 0, bz]} cam={cam} s={p.s} inclina={ang} />;
				}
				const salto = Math.abs(Math.sin(t)) * 0.2 * ritmo;
				const y = (p.y0 ?? 0) * (1 - ee) + salto + (p.y0 ? 0 : 0.12 * Math.sin(Math.PI * e));
				const lista = bancos.bail[p.o % bancos.bail.length];
				return <Carta key={i} mats={lista} idx={t * 1.3} pos={[bx, y, bz]} cam={cam} s={p.s * (0.6 + 0.4 * ee)} inclina={0.06 * Math.sin(t * 0.7 + i)} />;
			})}
		</>
	);
};

// ---------------- Casas de entramado ----------------
const PAREDES = [
	{wall: '#efe3c6', shutter: '#8a2f2a'}, {wall: '#e8d6b0', shutter: '#2f5f4a'},
	{wall: '#f1e6cf', shutter: '#3a4a7a'}, {wall: '#e6cfa6', shutter: '#7a4a24'},
];
const TEJAS = ['#a24a32', '#8a3f2c', '#b0583a', '#7a4a3a'];
const LBLOQUE = 10;

// Techo a dos aguas (prisma) con aristas de tinta. Cumbrera a lo largo de z.
export const Techo: React.FC<{w: number; l: number; alto: number; pos: V3; color: string; rotY?: number}> = ({w, l, alto, pos, color, rotY = 0}) => {
	const g = useMemo(() => {
		const sh = new THREE.Shape();
		sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, alto); sh.closePath();
		const e = new THREE.ExtrudeGeometry(sh, {depth: l, bevelEnabled: false});
		e.translate(0, 0, -l / 2);
		return e;
	}, [w, l, alto]);
	const ar = useMemo(() => new THREE.EdgesGeometry(g, 30), [g]);
	const m = useMemo(() => lam(color), [color]);
	return (
		<group position={pos} rotation={[0, rotY, 0]}>
			<mesh geometry={g} material={m} castShadow receiveShadow />
			<lineSegments geometry={ar}><lineBasicMaterial color={INK} /></lineSegments>
		</group>
	);
};

export const Casas: React.FC<{z0: number; z1: number; mitad?: number; lados?: (-1 | 1)[]; semilla?: number}> = ({z0, z1, mitad = 8, lados = [-1, 1], semilla = 0}) => {
	const datos = useMemo(() => {
		const lado = lam('#e3d4b0');
		const fach: Record<string, THREE.Material> = {};
		const bloques: {s: -1 | 1; z: number; h: number; v: number; mats: THREE.Material[]; tej: string}[] = [];
		for (const s of lados) {
			let z = z0 + LBLOQUE / 2, k = 0;
			while (z < z1) {
				const v = (k * 3 + (s > 0 ? 1 : 0) + semilla) % 4;
				const h = (k + v + semilla) % 3 === 0 ? 5.6 : 8.4;
				const key = `${v}_${h}_${k % 2}`;
				if (!fach[key]) fach[key] = lamTex(facadeHD(`baile${key}`, LBLOQUE, h, {...PAREDES[v], door: k % 2 === 0, timber: true}));
				const f = fach[key];
				bloques.push({s, z, h, v, mats: s < 0 ? [f, lado, lado, lado, lado, lado] : [lado, f, lado, lado, lado, lado], tej: TEJAS[(v + k) % 4]});
				z += LBLOQUE; k++;
			}
		}
		return bloques;
	}, [z0, z1, lados.join(','), semilla]);
	return (
		<>
			{datos.map((b, i) => (
				<group key={i}>
					<Caja size={[8, b.h, LBLOQUE]} pos={[b.s * (mitad + 4), b.h / 2, b.z]} material={b.mats} />
					<Techo w={9} l={LBLOQUE + 0.4} alto={2.8} pos={[b.s * (mitad + 4), b.h, b.z]} color={b.tej} />
					<Caja size={[0.7, 1.8, 0.7]} pos={[b.s * (mitad + 5.5), b.h + 2.2, b.z + 2]} color="#a98a6a" />
				</group>
			))}
		</>
	);
};

// Un frente de casas a lo largo de x que mira a +z (fondo de una plaza). z = posición del frente.
export const FrenteCasas: React.FC<{x0: number; x1: number; zFrente: number; semilla?: number}> = ({x0, x1, zFrente, semilla = 1}) => (
	// grupo girado pi/2: z local -> x mundo; x local (+) -> z mundo (-). Casas del lado +1 miran a -x local = +z mundo.
	<group rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
		<Casas z0={x0} z1={x1} mitad={-zFrente} lados={[1]} semilla={semilla} />
	</group>
);

// ---------------- Catedral (fondo, silueta de piedra rosada con aguja, con calima) ----------------
export const Catedral: React.FC<{pos: V3; escala?: number; calima?: string; calimaK?: number}> = ({pos, escala = 1, calima = '#d9c3b8', calimaK = 0.35}) => {
	const c = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color(calima), calimaK).getStyle();
	const m = useMemo(() => ({piedra: lam(c('#d99a8c')), oscura: lam(c('#c08072')), techo: lam(c('#6a5058'))}), [calima, calimaK]);
	const aguja = useMemo(() => new THREE.ConeGeometry(2.6, 18, 8), []);
	const arAguja = useMemo(() => new THREE.EdgesGeometry(aguja, 20), [aguja]);
	return (
		<group position={pos} scale={[escala, escala, escala]}>
			<Caja size={[16, 11, 42]} pos={[0, 5.5, 22]} material={m.piedra} />
			<Techo w={17} l={42} alto={4} pos={[0, 11, 22]} color={c('#6a5058')} />
			<Caja size={[8, 22, 8]} pos={[0, 11, -2]} material={m.piedra} />
			<Caja size={[8.6, 1.0, 8.6]} pos={[0, 18, -2]} material={m.oscura} />
			<Caja size={[5, 4, 5]} pos={[0, 24, -2]} material={m.oscura} />
			<mesh geometry={aguja} material={m.techo} position={[0, 35, -2]} scale={[1, 0.95, 1]} castShadow />
			<lineSegments geometry={arAguja} position={[0, 35, -2]} scale={[1, 0.95, 1]}><lineBasicMaterial color={INK} /></lineSegments>
			{[-2.2, 2.2].map((x) => <Caja key={x} size={[1.2, 4, 0.3]} pos={[x, 14, 2.2]} color={c('#4a4a6a')} />)}
		</group>
	);
};

// ---------------- Panadería y pizarra de precio ----------------
const pizarraTex = (precio: string) =>
	ctex(`baile_pizarra_${precio}`, 512, 400, (g) => {
		g.fillStyle = '#2d3a34'; g.fillRect(0, 0, 512, 400);
		g.strokeStyle = '#a0723c'; g.lineWidth = 34; g.strokeRect(17, 17, 478, 366);
		g.fillStyle = '#f3ecd8'; g.textAlign = 'center'; g.textBaseline = 'middle';
		g.font = '900 120px Arial Black, Arial, sans-serif'; g.fillText('PAN', 256, 118);
		g.font = '900 150px Arial Black, Arial, sans-serif'; g.fillText(precio, 230, 270);
		g.fillStyle = '#e8584a'; g.beginPath(); g.moveTo(420, 330); g.lineTo(420, 215); g.lineTo(385, 215); g.lineTo(440, 160); g.lineTo(495, 215); g.lineTo(460, 215); g.lineTo(460, 330); g.closePath(); g.fill();
	});
export const PRECIOS = ['2', '4', '8'];

export const Panaderia: React.FC<{pos: V3; precio: number}> = ({pos, precio}) => {
	const mats = useMemo(() => PRECIOS.map((p) => twoTone(new THREE.MeshLambertMaterial({map: pizarraTex(p)}))), []);
	const m = useMemo(() => ({madera: lamTex(planksHD()), pan: lam('#d9a14a'), toldo: lam('#c0453a'), toldo2: lam('#f1e6cf')}), []);
	const p = Math.max(0, Math.min(2, precio));
	return (
		<group position={pos}>
			<Caja size={[1.4, 1.0, 3.4]} pos={[0, 0.5, 0]} material={m.madera} />
			{[-1.2, -0.4, 0.4, 1.2].map((z, i) => (
				<Caja key={i} size={[0.5, 0.2, 0.3]} pos={[0.1, 1.1 + (i % 2) * 0.05, z]} rot={[0, 0.3 * i, 0]} material={m.pan} />
			))}
			{[-1.6, 1.6].map((z) => <Caja key={z} size={[0.12, 2.9, 0.12]} pos={[0.55, 1.45, z]} color="#4a3a2a" />)}
			<Caja size={[1.5, 0.12, 3.6]} pos={[0.1, 2.95, 0]} rot={[0, 0, 0.25]} material={m.toldo} />
			<mesh position={[0.62, 1.95, 0]} rotation={[0, Math.PI / 2 + 0.3, 0]} material={mats[Math.round(p)]}>
				<planeGeometry args={[1.5, 1.17]} />
			</mesh>
			<Caja size={[0.14, 1.4, 0.14]} pos={[0.5, 1.7, 0.2]} color="#4a3a2a" />
		</group>
	);
};

// ---------------- Mercado de grano ----------------
export const Saco: React.FC<{pos: V3; rotY?: number; color?: string; mat?: THREE.Material}> = ({pos, rotY = 0, color = '#c9a66b', mat}) => (
	<group position={pos} rotation={[0, rotY, 0]}>
		<Caja size={[1.15, 0.62, 0.7]} pos={[0, 0.31, 0]} color={color} material={mat} />
		<Caja size={[0.34, 0.2, 0.3]} pos={[0.5, 0.7, 0]} rot={[0, 0, -0.4]} color={color} material={mat} />
	</group>
);
export const PilaSacos: React.FC<{pos: V3; rotY?: number; capas?: number; mat?: THREE.Material}> = ({pos, rotY = 0, capas = 3, mat}) => {
	const sacos = useMemo(() => {
		const o: {p: V3; r: number}[] = [];
		for (let c = 0; c < capas; c++) for (let i = 0; i < capas - c; i++) o.push({p: [(i - (capas - c - 1) / 2) * 1.2, c * 0.62, ((i + c) % 2) * 0.08], r: 0.05 * (i - c)});
		return o;
	}, [capas]);
	return (
		<group position={pos} rotation={[0, rotY, 0]}>
			{sacos.map((s, i) => <Saco key={i} pos={s.p} rotY={s.r} mat={mat} />)}
		</group>
	);
};
export const Barril: React.FC<{pos: V3}> = ({pos}) => (
	<group position={pos}>
		<Cilindro radio={0.45} alto={0.9} pos={[0, 0.45, 0]} color="#8a5a32" segmentos={16} />
		<Cilindro radio={0.47} alto={0.08} pos={[0, 0.25, 0]} color="#3a2a1c" segmentos={16} />
		<Cilindro radio={0.47} alto={0.08} pos={[0, 0.65, 0]} color="#3a2a1c" segmentos={16} />
	</group>
);

export const Tarima: React.FC<{pos: V3; w?: number; d?: number; h?: number; alz?: number}> = ({pos, w = 11, d = 5, h = 1, alz = 1}) => {
	const m = useMemo(() => ({tabla: lamTex(rep(planksHD(), 2, 1)), faldon: lam('#6a4426')}), []);
	if (alz <= 0.02) return null;
	return (
		<group position={pos} scale={[1, alz, 1]}>
			<Caja size={[w, h - 0.18, d - 0.2]} pos={[0, (h - 0.18) / 2, 0]} material={m.faldon} />
			<Caja size={[w, 0.18, d]} pos={[0, h - 0.09, 0]} material={m.tabla} />
			<Caja size={[w * 0.35, 0.45, 0.9]} pos={[0, 0.225, d / 2 + 0.45]} material={m.tabla} />
			<Caja size={[0.16, 3.4, 0.16]} pos={[-w / 2 + 0.2, h + 1.7, -d / 2 + 0.3]} color="#4a3220" />
			<Caja size={[0.16, 3.4, 0.16]} pos={[w / 2 - 0.2, h + 1.7, -d / 2 + 0.3]} color="#4a3220" />
			<Caja size={[w - 0.2, 0.7, 0.05]} pos={[0, h + 3.0, -d / 2 + 0.3]} color="#a0382c" />
			<Caja size={[w - 0.2, 0.18, 0.12]} pos={[0, h + 3.4, -d / 2 + 0.3]} color="#4a3220" />
		</group>
	);
};

export const Adoquines: React.FC<{tam?: number; rep?: number; y?: number}> = ({tam = 300, rep: r = 36, y = 0}) => {
	const m = useMemo(() => twoTone(new THREE.MeshLambertMaterial({map: rep(cobbleHD(), r, r)})), [r]);
	return (
		<mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m} receiveShadow>
			<planeGeometry args={[tam, tam]} />
		</mesh>
	);
};

// ---------------- Zapatos ----------------
// Textura de zapato de perfil (punta a la derecha): suela, talón, empeine, cordones, con tinta. `gastado` añade remiendo y grietas.
export const zapatoTex = (col: string, suela: string, gastado: boolean) =>
	ctex(`baile_zap_${col}_${suela}_${gastado}`, 256, 170, (g) => {
		g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 8;
		g.fillStyle = suela;
		g.beginPath(); g.moveTo(12, 122); g.lineTo(252, 122); g.quadraticCurveTo(262, 144, 244, 148); g.lineTo(18, 148); g.quadraticCurveTo(6, 146, 12, 122); g.closePath(); g.fill(); g.stroke();
		g.beginPath(); g.moveTo(14, 148); g.lineTo(66, 148); g.lineTo(62, 162); g.lineTo(18, 162); g.closePath(); g.fill(); g.stroke();
		g.fillStyle = col;
		g.beginPath(); g.moveTo(22, 124); g.lineTo(20, 30); g.quadraticCurveTo(20, 16, 34, 16); g.lineTo(96, 16); g.quadraticCurveTo(110, 16, 114, 32);
		g.quadraticCurveTo(124, 66, 162, 74); g.quadraticCurveTo(210, 80, 240, 100); g.quadraticCurveTo(256, 112, 250, 124); g.closePath(); g.fill(); g.stroke();
		g.lineWidth = 6;
		g.beginPath(); g.moveTo(196, 84); g.quadraticCurveTo(210, 104, 206, 122); g.stroke();
		g.strokeStyle = '#f1e6cf'; g.lineWidth = 7;
		for (const [x, y] of [[128, 78], [146, 74], [164, 76]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10, y - 16); g.stroke(); }
		g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 8; g.beginPath(); g.moveTo(34, 40); g.lineTo(34, 100); g.stroke();
		if (gastado) {
			g.fillStyle = 'rgba(210,190,150,0.85)'; g.strokeStyle = INK; g.lineWidth = 5;
			g.beginPath(); g.rect(50, 60, 38, 30); g.fill(); g.stroke();
			g.lineWidth = 4; g.beginPath(); g.moveTo(170, 84); g.lineTo(184, 104); g.lineTo(176, 118); g.stroke();
			g.beginPath(); g.moveTo(54, 66); g.lineTo(84, 84); g.stroke();
		}
	});

let GEO_PLANO: THREE.BufferGeometry | null = null;
const geoPlano = () => (GEO_PLANO ??= new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0));
const matSprite = new Map<string, THREE.Material>();
const matDe = (tex: THREE.Texture, tint: string) => {
	const k = tex.uuid + tint;
	let m = matSprite.get(k);
	if (!m) { m = new THREE.MeshBasicMaterial({map: tex, color: tint, alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false}); matSprite.set(k, m); }
	return m;
};
// Plano billboard (yaw hacia la cámara) con el pie en `pos`. Sin iluminación: el color pintado se ve tal cual.
export const Sprite: React.FC<{tex: THREE.Texture; pos: V3; cam: V3; w: number; h?: number; rotZ?: number; flip?: boolean; tint?: string}> = ({
	tex, pos, cam, w, h, rotZ = 0, flip = false, tint = '#ffffff',
}) => {
	const yaw = Math.atan2(cam[0] - pos[0], cam[2] - pos[2]);
	return <mesh geometry={geoPlano()} material={matDe(tex, tint)} position={pos} rotation={[0, yaw, rotZ]} scale={[flip ? -w : w, h ?? w * 0.664, 1]} />;
};

export const ZapatoRojo: React.FC<{pos: V3; cam: V3; w?: number; flip?: boolean; rotZ?: number; tint?: string}> = ({pos, cam, w = 0.6, flip = false, rotZ = 0, tint = '#ffe0d8'}) => (
	<Sprite tex={zapatoTex('#e0242c', '#4a1a14', false)} pos={pos} cam={cam} w={w} flip={flip} rotZ={rotZ} tint={tint} />
);

// Bolsa de monedas con «$» y una mano que la entrega (manga roja + mano), y moneda suelta.
export const bolsaTex = () =>
	ctex('baile_bolsa', 320, 320, (g) => {
		g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 9;
		g.fillStyle = '#8c2a2a'; g.beginPath(); g.moveTo(320, 10); g.lineTo(320, 96); g.lineTo(196, 134); g.lineTo(168, 84); g.closePath(); g.fill(); g.stroke();
		g.fillStyle = '#f2c9a0'; g.beginPath(); g.arc(176, 126, 30, 0, Math.PI * 2); g.fill(); g.stroke();
		g.fillStyle = '#a8742e'; g.beginPath(); g.ellipse(168, 222, 70, 62, 0, 0, Math.PI * 2); g.fill(); g.stroke();
		g.fillStyle = '#a8742e'; g.beginPath(); g.moveTo(148, 164); g.lineTo(190, 164); g.lineTo(200, 150); g.lineTo(140, 150); g.closePath(); g.fill(); g.stroke();
		g.fillStyle = '#ffd34d'; g.strokeStyle = INK; g.lineWidth = 7; g.font = '900 86px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
		g.strokeText('$', 168, 226); g.fillText('$', 168, 226);
	});
export const monedaTex = () =>
	ctex('baile_moneda', 128, 128, (g) => {
		g.fillStyle = '#ffd34d'; g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill(); g.stroke();
		g.fillStyle = '#b8801e'; g.font = '900 70px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 64, 68);
	});

// ---------------- Capilla ----------------
export const Vela: React.FC<{pos: V3; alto?: number; f: number; fase?: number}> = ({pos, alto = 0.5, f, fase = 0}) => {
	const fl = emisivo('#ffd27a');
	const e = 1 + 0.18 * Math.sin(f * 0.55 + fase) + 0.1 * Math.sin(f * 1.3 + fase * 2);
	return (
		<group position={pos}>
			<Cilindro radio={0.07} alto={alto} pos={[0, alto / 2, 0]} color="#f1e6cf" segmentos={10} />
			<mesh position={[0, alto + 0.12, 0]} scale={[0.7, e * 1.5, 0.7]} material={fl}>
				<sphereGeometry args={[0.07, 8, 8]} />
			</mesh>
		</group>
	);
};

export const Capilla: React.FC = () => {
	const m = useMemo(() => ({
		piedra: lamTex(rep(stoneHD('baileCap', ['#a8a4ac', '#9a96a2', '#b4b0b8', '#8e8a98'], '#5a566a'), 4, 2)),
		suelo: lamTex(rep(stoneHD('baileCapSuelo', ['#8a8694', '#7e7a88', '#96929e', '#726e7e'], '#4a4658'), 6, 6)),
		vitral: emisivo('#5a78d8'), agua: emisivo('#7ab4ff'),
	}), []);
	return (
		<>
			<mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.suelo} receiveShadow><planeGeometry args={[40, 40]} /></mesh>
			<Caja size={[0.6, 9, 24]} pos={[-6.5, 4.5, -2]} material={m.piedra} />
			<Caja size={[0.6, 9, 24]} pos={[6.5, 4.5, -2]} material={m.piedra} />
			<Caja size={[13.6, 9, 0.6]} pos={[0, 4.5, -14]} material={m.piedra} />
			<Caja size={[13.6, 0.6, 24]} pos={[0, 9.3, -2]} material={m.piedra} />
			{[-4.5, 4.5].map((z) => <Caja key={z} size={[0.8, 8.4, 0.8]} pos={[-5.8, 4.2, z]} material={m.piedra} />)}
			{[-4.5, 4.5].map((z) => <Caja key={z} size={[0.8, 8.4, 0.8]} pos={[5.8, 4.2, z]} material={m.piedra} />)}
			{/* vitral del fondo */}
			<mesh position={[0, 5.4, -13.65]} material={m.vitral}><planeGeometry args={[2.4, 4.2]} /></mesh>
			<mesh position={[0, 7.5, -13.65]} material={m.vitral}><circleGeometry args={[1.2, 20]} /></mesh>
			<Caja size={[0.12, 4.2, 0.1]} pos={[0, 5.4, -13.6]} color="#241726" />
			<Caja size={[2.4, 0.12, 0.1]} pos={[0, 5.9, -13.6]} color="#241726" />
			{/* cruces rojas pintadas */}
			{[-4, 4].map((x) => (
				<group key={x}>
					<Caja size={[0.5, 2.6, 0.08]} pos={[x, 4.6, -13.6]} color="#b8281f" />
					<Caja size={[1.7, 0.5, 0.08]} pos={[x, 5.2, -13.6]} color="#b8281f" />
				</group>
			))}
			{/* altar */}
			<Caja size={[5, 1.3, 1.6]} pos={[0, 0.65, -10]} material={m.piedra} />
			<Caja size={[5.4, 0.18, 1.9]} pos={[0, 1.4, -10]} material={m.piedra} />
			{/* pila de agua bendita */}
			<Cilindro radio={0.28} alto={1.0} pos={[3.2, 0.5, -5.4]} material={m.piedra} segmentos={12} />
			<Cilindro radio={0.75} alto={0.22} pos={[3.2, 1.1, -5.4]} material={m.piedra} segmentos={20} />
			<mesh position={[3.2, 1.225, -5.4]} rotation={[-Math.PI / 2, 0, 0]} material={m.agua}><circleGeometry args={[0.62, 20]} /></mesh>
		</>
	);
};

// ---------------- Camión urbano de noche ----------------
export const Camion: React.FC<{f: number; z0?: number; z1?: number}> = ({f, z0 = -22, z1 = 16}) => {
	const L = z1 - z0, cz = (z0 + z1) / 2;
	const m = useMemo(() => ({
		suelo: lam('#3a4256'), pared: lam('#7a8aa8'), techo: lam('#b4bccc'), vidrio: emisivo('#1c2a5a'),
		tubo: emisivo('#fff4d0'), f1: emisivo('#ffd27a'), f2: emisivo('#ff9a5a'), asientoA: lam('#e08a3c'), asientoB: lam('#2f7a9a'), poste: lam('#e6c34a'),
	}), []);
	// farolas que pasan por las ventanas (movimiento continuo de fondo)
	const farolas = useMemo(() => Array.from({length: 9}, (_, i) => ({o: i * 4.4, a: i % 3})), []);
	const ciclo = 40;
	return (
		<>
			<Caja size={[4.6, 0.2, L]} pos={[0, -0.1, cz]} material={m.suelo} />
			<Caja size={[0.2, 3.1, L]} pos={[-2.3, 1.55, cz]} material={m.pared} />
			<Caja size={[0.2, 3.1, L]} pos={[2.3, 1.55, cz]} material={m.pared} />
			<Caja size={[4.8, 0.15, L]} pos={[0, 3.1, cz]} material={m.techo} />
			{[-1, 1].map((s) => (
				<group key={s}>
					<mesh position={[s * 2.19, 1.95, cz]} rotation={[0, -s * Math.PI / 2, 0]} material={m.vidrio}><planeGeometry args={[L, 1.1]} /></mesh>
					{farolas.map((fa, i) => {
						const z = z0 + ((((fa.o + f * 0.28 * (1 + 0.1 * fa.a)) % ciclo) + ciclo) % ciclo) * (L / ciclo);
						return (
							<mesh key={i} position={[s * 2.17, 2.2 - 0.25 * fa.a, z]} rotation={[0, -s * Math.PI / 2, 0]} material={fa.a === 1 ? m.f1 : m.f2}>
								<planeGeometry args={[0.7 + 0.25 * fa.a, 0.12]} />
							</mesh>
						);
					})}
					{/* asientos */}
					{Array.from({length: Math.floor(L / 3.2)}, (_, i) => z0 + 2 + i * 3.2).map((z, i) => (
						<group key={z}>
							<Caja size={[1.0, 0.5, 1.7]} pos={[s * 1.6, 0.55, z]} material={(i + (s > 0 ? 1 : 0)) % 2 ? m.asientoA : m.asientoB} />
							<Caja size={[0.16, 1.0, 1.7]} pos={[s * 2.05, 1.2, z]} material={(i + (s > 0 ? 1 : 0)) % 2 ? m.asientoA : m.asientoB} />
						</group>
					))}
				</group>
			))}
			{/* tubos de luz */}
			{Array.from({length: Math.floor(L / 6)}, (_, i) => z0 + 3 + i * 6).map((z) => (
				<mesh key={z} position={[0, 3.0, z]} rotation={[Math.PI / 2, 0, 0]} material={m.tubo}><planeGeometry args={[0.3, 2.0]} /></mesh>
			))}
			{/* postes amarillos */}
			{Array.from({length: Math.floor(L / 6)}, (_, i) => z0 + 5 + i * 6).map((z) => (
				<Cilindro key={z} radio={0.04} alto={3.1} pos={[0.55, 1.55, z]} material={m.poste} segmentos={8} />
			))}
			<Cilindro radio={0.04} alto={L} pos={[0.55, 3.0, cz]} rot={[Math.PI / 2, 0, 0]} material={m.poste} segmentos={8} />
		</>
	);
};
