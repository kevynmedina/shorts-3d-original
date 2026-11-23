import React, {useMemo} from 'react';
import * as THREE from 'three';
import {Caja} from '../Escena3D';
import {brick, rep} from '../look/paint';
import {twoTone} from '../look/shade';

// Ola de melaza (T4 y T5) y calle Commercial.
// La ola es una lámina con perfil de rompiente (cola baja que cubre la calle -> lomo -> cresta -> labio que se enrolla
// -> cara frontal cóncava -> pie que se extiende por el suelo), extruida a lo ancho de la calle. Shader propio
// (no twoTone): cuerpo café oscuro, brillo especular, borde fresnel ámbar, labio ámbar con espuma clara, vetas que
// fluyen y contorno de tinta en la silueta. Sin sombras recibidas: no hay acné ni dientes de sierra.

// Perfil (z hacia delante = dirección de avance, y arriba) para una ola de 9,5 m.
const PERFIL: [number, number][] = [
	[-80, 0.55], [-50, 0.7], [-28, 1.0], [-17, 1.9], [-11, 3.8], [-7.5, 6.2], [-4.8, 8.2], [-2.4, 9.3], [-0.2, 9.6],
	[1.8, 9.25], [3.3, 8.3], [4.1, 7.0], [3.9, 6.1], [3.2, 5.75], [2.1, 5.85], [1.5, 5.3], [1.2, 4.0], [1.4, 2.6],
	[2.1, 1.35], [3.3, 0.5], [5.0, 0.16], [7.5, 0.07], [11, 0.05],
];
const NS = 150; // muestras a lo largo del perfil
const NX = 56;  // muestras a lo ancho

type Muestra = {z: number; y: number; s: number; labio: number; espuma: number};
const muestrasPerfil = (): Muestra[] => {
	const curva = new THREE.CatmullRomCurve3(PERFIL.map(([z, y]) => new THREE.Vector3(0, y, z)), false, 'centripetal');
	const pts = curva.getSpacedPoints(NS - 1);
	const punta = new THREE.Vector3(0, 6.6, 4.05);
	return pts.map((p, i) => {
		const s = i / (NS - 1);
		const labio = THREE.MathUtils.smoothstep(p.y, 7.0, 9.0) * (p.z > -3 ? 1 : THREE.MathUtils.smoothstep(p.z, -5, -3));
		const espuma = Math.max(0, 1 - p.distanceTo(punta) / 0.55);
		return {z: p.z, y: p.y, s, labio, espuma: Math.min(1, espuma)};
	});
};

export const crearOla = (ancho: number) => {
	const perfil = muestrasPerfil();
	const n = NS * NX;
	const pos = new Float32Array(n * 3);
	const aS = new Float32Array(n);
	const aLabio = new Float32Array(n);
	const aEspuma = new Float32Array(n);
	const idx: number[] = [];
	for (let i = 0; i < NX; i++) for (let j = 0; j < NS; j++) {
		const k = i * NS + j;
		aS[k] = perfil[j].s;
		aLabio[k] = perfil[j].labio;
		aEspuma[k] = perfil[j].espuma;
	}
	for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NS - 1; j++) {
		const a = i * NS + j, b = a + 1, c = a + NS, d = c + 1;
		idx.push(a, c, b, b, c, d);
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	geo.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
	geo.setAttribute('aLabio', new THREE.BufferAttribute(aLabio, 1));
	geo.setAttribute('aEspuma', new THREE.BufferAttribute(aEspuma, 1));
	geo.setIndex(idx);
	geo.userData = {perfil, ancho};
	actualizarOla(geo, 0);
	return geo;
};

// Anima la forma: altura y avance del labio varían a lo ancho y en el tiempo (t en segundos).
export const actualizarOla = (geo: THREE.BufferGeometry, t: number) => {
	const {perfil, ancho} = geo.userData as {perfil: Muestra[]; ancho: number};
	const pos = geo.getAttribute('position') as THREE.BufferAttribute;
	for (let i = 0; i < NX; i++) {
		const u = i / (NX - 1);
		const x = (u - 0.5) * ancho;
		// los extremos (dentro de las manzanas de edificios) bajan hasta casi el suelo: nunca se ve un corte
		const borde = 1 - 0.93 * THREE.MathUtils.smoothstep(Math.abs(x), 7.5, ancho / 2);
		const alto = (1 + 0.07 * Math.sin(0.45 * x + t * 1.3) + 0.04 * Math.sin(1.3 * x - t * 2.1)) * borde;
		const curl = 0.5 * Math.sin(0.5 * x + t * 2.2) + 0.25 * Math.sin(1.1 * x - t * 1.7);
		const frente = -0.012 * x * x; // centro un poco adelantado (frente curvo en planta)
		for (let j = 0; j < NS; j++) {
			const m = perfil[j];
			const k = i * NS + j;
			const y = m.y * alto;
			const z = m.z + frente + curl * m.labio + 0.25 * Math.sin(m.s * 40 - t * 3 + x * 0.4) * (1 - m.labio) * Math.min(1, m.y / 3);
			pos.setXYZ(k, x, y, z);
		}
	}
	pos.needsUpdate = true;
	geo.computeVertexNormals();
	geo.computeBoundingSphere();
};

const VS = /* glsl */ `
attribute float aS; attribute float aLabio; attribute float aEspuma;
varying vec3 vN; varying vec3 vW; varying float vS; varying float vLabio; varying float vEspuma;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vW = wp.xyz;
  vN = normalize( mat3( modelMatrix ) * normal );
  vS = aS; vLabio = aLabio; vEspuma = aEspuma;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`;

const FS = /* glsl */ `
uniform float uT; uniform vec3 uSol; uniform vec3 uCielo; uniform float uTinta;
varying vec3 vN; varying vec3 vW; varying float vS; varying float vLabio; varying float vEspuma;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  vec3 n = normalize( vN );
  vec3 v = normalize( cameraPosition - vW );
  if ( !gl_FrontFacing ) n = -n;
  if ( dot( n, v ) < 0.0 ) n = -n;
  float ndl = max( dot( n, uSol ), 0.0 );
  vec3 oscuro = vec3( 0.012, 0.004, 0.001 );
  vec3 medio = vec3( 0.055, 0.019, 0.004 );
  vec3 col = mix( oscuro, medio, smoothstep( 0.0, 0.9, ndl ) );
  col += vec3( 0.03, 0.02, 0.03 ) * max( n.y, 0.0 );                        // cielo
  // vetas que fluyen hacia la cresta y por la cara
  float veta = sin( vS * 90.0 - uT * 4.0 + sin( vW.x * 0.8 + vS * 6.0 ) * 2.5 );
  col *= 0.88 + 0.2 * smoothstep( -0.2, 1.0, veta );
  // labio ámbar (luz que atraviesa la melaza fina)
  col = mix( col, vec3( 0.75, 0.3, 0.04 ), vLabio * 0.6 );
  // brillo especular (fino y fuerte: melaza mojada)
  vec3 h = normalize( uSol + v );
  float sp = pow( max( dot( n, h ), 0.0 ), 220.0 );
  col += vec3( 1.0, 0.85, 0.6 ) * sp * 0.9 * ( 0.4 + 0.6 * smoothstep( 0.2, 0.9, veta ) );
  // reflejo del cielo en la capa del suelo (pie y cola casi planos)
  float plano = smoothstep( 0.85, 0.98, n.y ) * ( 1.0 - vLabio );
  col += vec3( 0.1, 0.07, 0.05 ) * plano * pow( 1.0 - max( dot( n, v ), 0.0 ), 2.0 );
  // borde fresnel ámbar
  float fr = pow( 1.0 - max( dot( n, v ), 0.0 ), 3.0 );
  col += vec3( 0.9, 0.45, 0.08 ) * fr * ( 0.35 + 0.7 * vLabio ) * ( 1.0 - plano );
  // espuma clara en el labio (borde que se enrolla)
  float esp = smoothstep( 0.35, 0.8, vEspuma ) * ( 0.7 + 0.3 * sin( vW.x * 3.1 + uT * 6.0 ) );
  col = mix( col, vec3( 1.0, 0.8, 0.5 ), esp * 0.9 );
  // contorno de tinta en la silueta
  float sil = 1.0 - abs( dot( n, v ) );
  col = mix( col, vec3( 0.017, 0.009, 0.02 ), smoothstep( 0.965, 0.995, sil ) * uTinta );
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const olaMaterial = () =>
	new THREE.ShaderMaterial({
		uniforms: {uT: {value: 0}, uSol: {value: new THREE.Vector3(0.3, 0.8, 0.5).normalize()}, uCielo: {value: new THREE.Color('#ffffff')}, uTinta: {value: 1}},
		vertexShader: VS,
		fragmentShader: FS,
		side: THREE.DoubleSide,
	});

// Material brillante de melaza para gotas, chorros y salpicaduras (mismo shader, sin vetas de perfil).
const FS_GOTA = /* glsl */ `
uniform vec3 uSol; uniform vec3 uBase; uniform float uBrillo; uniform float uFres;
varying vec3 vN; varying vec3 vW;
void main() {
  vec3 n = normalize( vN );
  vec3 v = normalize( cameraPosition - vW );
  if ( dot( n, v ) < 0.0 ) n = -n;
  float ndl = max( dot( n, uSol ), 0.0 );
  vec3 col = uBase * ( 0.35 + 0.9 * ndl );
  vec3 h = normalize( uSol + v );
  col += vec3( 1.0, 0.88, 0.65 ) * pow( max( dot( n, h ), 0.0 ), 50.0 ) * 1.4 * uBrillo;
  float fr = pow( 1.0 - max( dot( n, v ), 0.0 ), 2.5 );
  col += vec3( 0.95, 0.5, 0.12 ) * fr * uFres;
  col = mix( col, vec3( 0.02, 0.01, 0.02 ), smoothstep( 0.9, 0.99, 1.0 - abs( dot( n, v ) ) ) );
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const VS_GOTA = /* glsl */ `
varying vec3 vN; varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vW = wp.xyz; vN = normalize( mat3( modelMatrix ) * normal );
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const gotaMaterial = (base = '#4a1c04', brillo = 1, sol: [number, number, number] = [0.4, 0.8, 0.5], fres = 0.8) =>
	new THREE.ShaderMaterial({
		uniforms: {uSol: {value: new THREE.Vector3(...sol).normalize()}, uBase: {value: new THREE.Color(base)}, uBrillo: {value: brillo}, uFres: {value: fres}},
		vertexShader: VS_GOTA,
		fragmentShader: FS_GOTA,
	});

// Ola completa: posición del pie (zFrente), altura (alto) y ancho. Avanza en +z del grupo (rotY para orientarla).
export const Ola: React.FC<{f: number; zFrente: number; alto?: number; ancho?: number; x?: number; rotY?: number; sol?: [number, number, number]; gotas?: boolean}> = ({
	f, zFrente, alto = 9.5, ancho = 18, x = 0, rotY = 0, sol = [0.3, 0.8, 0.5], gotas = true,
}) => {
	const geo = useMemo(() => crearOla(ancho), [ancho]);
	const mat = useMemo(olaMaterial, []);
	const matGota = useMemo(() => gotaMaterial('#3a1604', 1, sol), [sol[0], sol[1], sol[2]]);
	actualizarOla(geo, f / 30);
	mat.uniforms.uT.value = f / 30;
	(mat.uniforms.uSol.value as THREE.Vector3).set(...sol).normalize();
	const k = alto / 9.5;
	const salp = useMemo(() => Array.from({length: 16}, (_, i) => ({x: ((i * 37) % 23 - 11) / 23, ph: (i * 0.137) % 1, v: 3 + (i % 5) * 0.8, s: 0.08 + (i % 4) * 0.04})), []);
	return (
		<group position={[x, 0, zFrente]} rotation={[0, rotY, 0]} scale={[1, k, k]}>
			<mesh geometry={geo} material={mat} castShadow frustumCulled={false} />
			{gotas && salp.map((p, i) => {
				// gotas que saltan del labio y caen delante de la ola (ciclo de 1,2 s)
				const c = ((f / 36 + p.ph) % 1);
				const tt = c * 1.2;
				const y = 8.2 + p.v * tt - 4.9 * tt * tt * 1.6;
				const z = 4.2 + tt * 2.6;
				const vis = y > 0.4;
				return (
					<mesh key={i} visible={vis} position={[p.x * 13, y, z]} scale={[p.s / k, (p.s * 1.25) / k, p.s / k]} material={matGota}>
						<sphereGeometry args={[1, 10, 8]} />
					</mesh>
				);
			})}
		</group>
	);
};

// Calle Commercial: hileras de edificios de ladrillo bajos (6-8 m) a ambos lados de una calle de 14 m.
export const Edificios: React.FC<{z0: number; z1: number; mitad?: number}> = ({z0, z1, mitad = 7}) => {
	const mats = useMemo(() => {
		const b = twoTone(new THREE.MeshLambertMaterial({map: rep(brick(), 2, 2)}));
		const v = twoTone(new THREE.MeshLambertMaterial({color: '#2b2f4a'}));
		const cornisa = twoTone(new THREE.MeshLambertMaterial({color: '#d9c7a0'}));
		return {b, v, cornisa};
	}, []);
	const bloques = useMemo(() => {
		const out: {s: number; z: number; l: number; h: number}[] = [];
		for (const s of [-1, 1]) {
			let z = z0;
			let k = 0;
			while (z < z1) {
				const l = 9 + ((k * 7 + (s > 0 ? 3 : 0)) % 5);
				out.push({s, z: z + l / 2, l, h: 6 + ((k * 3 + (s > 0 ? 1 : 0)) % 3)});
				z += l + 0.4;
				k++;
			}
		}
		return out;
	}, [z0, z1]);
	return (
		<>
			{bloques.map((b, i) => (
				<group key={i}>
					<Caja size={[8, b.h, b.l]} pos={[b.s * (mitad + 4), b.h / 2, b.z]} material={mats.b} />
					<Caja size={[8.3, 0.35, b.l + 0.2]} pos={[b.s * (mitad + 4), b.h + 0.17, b.z]} material={mats.cornisa} />
					{[-0.3, 0.05, 0.4].map((dz, w) => [2.2, 4.6].filter((y) => y < b.h - 1).map((y) => (
						<Caja key={`${w}${y}`} size={[0.12, 1.2, 0.9]} pos={[b.s * (mitad + 0.01), y, b.z + dz * b.l * 0.8]} material={mats.v} />
					)))}
				</group>
			))}
		</>
	);
};
