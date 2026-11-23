import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {Caja, Cilindro} from '../Escena3D';
import {metalHD, melazaBordeMat, melazaMat} from '../look/materiales';
import {twoTone} from '../look/shade';
import {Outfit} from '../look/toon';
import {parcheTex} from '../look/materiales';
import {rep} from '../look/paint';

// Bloques compartidos por las 7 tomas: ola, tanque, materiales y cifras en pantalla.
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const ABRIGO: Outfit = {jacket: '#5a4632', pants: '#3b3f52', boots: '#2a1d14', hat: 'cap', cap: '#4b3a2b', skin: '#f2c9a0', build: 'adult'};
export const OBRERO: Outfit = {jacket: '#2f5d8a', pants: '#4a4234', boots: '#2a1d14', hat: 'cap', cap: '#7a5a2a', skin: '#c99067', build: 'adult'};
export const CORREDOR_A: Outfit = {jacket: '#8c3b4a', pants: '#3b3f52', boots: '#4a3426', hat: 'cap', cap: '#d9a441', skin: '#f2c9a0', build: 'adult'};
export const CORREDOR_B: Outfit = {jacket: '#2f5f6a', pants: '#3b3f52', boots: '#4a3426', hat: 'tophat', skin: '#c99067', build: 'adult'};
export const VECINA: Outfit = {jacket: '#7b5ac9', pants: '#3b3f52', boots: '#4a3426', hat: 'bonnet', dress: '#c25a7a', skin: '#ecd0b6', build: 'adult'};
export const EMPRESARIO: Outfit = {jacket: '#2b2b33', pants: '#2b2b33', boots: '#1a1a1a', hat: 'tophat', skin: '#f2c9a0', moustache: '#4a3020', build: 'stout'};

// Ola de melaza: cresta enrollada hacia la cámara (+z). Misma malla que E2.
export const ondaGeometria = (ancho = 30, alto = 12): THREE.BufferGeometry => {
	const nx = 40, ny = 28;
	const posiciones: number[] = [];
	const indices: number[] = [];
	for (let j = 0; j <= ny; j++) {
		for (let i = 0; i <= nx; i++) {
			const u = i / nx, v = j / ny;
			const x = (u - 0.5) * ancho;
			const y = v * alto - (alto * 0.67) * Math.pow(v, 3);
			const z = 18 * Math.pow(v, 2.4) * (1 - Math.abs(u - 0.5) * 0.5) + 0.9 * Math.sin(u * Math.PI * 10 + v * 4) * v;
			posiciones.push(x, y, z);
		}
	}
	for (let j = 0; j < ny; j++) {
		for (let i = 0; i < nx; i++) {
			const a = j * (nx + 1) + i, b = a + 1, c = a + (nx + 1), d = c + 1;
			indices.push(a, b, c, b, d, c);
		}
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
	geo.setIndex(indices);
	geo.computeVertexNormals();
	return geo;
};

// Materiales de la ola (café espeso con brillo y estela translúcida).
export const useOndaMats = () =>
	useMemo(() => ({melaza: melazaMat(), borde: melazaBordeMat()}), []);

// Tanque de melaza: cuerpo de acero con remaches, domo y aros.
export const Tanque: React.FC<{y?: number}> = ({y = 0}) => {
	const mats = useMemo(() => {
		const acero = twoTone(new THREE.MeshLambertMaterial({map: rep(metalHD(), 2, 1)}));
		const aros = twoTone(new THREE.MeshLambertMaterial({color: '#3d2a1a'}));
		return {acero, aros};
	}, []);
	return (
		<group position={[0, y, 0]}>
			<Cilindro radio={5} alto={15} pos={[0, 7.5, 0]} segmentos={48} material={mats.acero} />
			<Cilindro radio={4} alto={1.2} pos={[0, 15.6, 0]} segmentos={48} material={mats.acero} />
			{[3, 7.5, 12].map((yy) => (
				<Cilindro key={yy} radio={5.12} alto={0.5} pos={[0, yy, 0]} segmentos={48} material={mats.aros} />
			))}
		</group>
	);
};

// Parche de pintura (brochazos) con alpha, sobre la pared del tanque en el ángulo dado.
export const ParchePintura: React.FC<{ang: number; y: number; escala?: number}> = ({ang, y, escala = 1}) => {
	const mat = useMemo(() => twoTone(new THREE.MeshLambertMaterial({map: parcheTex(), alphaTest: 0.5, side: THREE.DoubleSide})), []);
	return (
		<mesh position={[5.05 * Math.sin(ang), y, 5.05 * Math.cos(ang)]} rotation={[0, ang, 0]} scale={[escala, escala, 1]} material={mat} castShadow>
			<planeGeometry args={[2.4, 2.1]} />
		</mesh>
	);
};

// Cifra discreta arriba del cuadro (zona superior, sin tapar personajes ni subtítulos).
export const Cifra: React.FC<{texto: string; inicio: number; fin?: number; color?: string}> = ({
	texto, inicio, fin = 100000, color = '#ffd34d',
}) => {
	const f = useCurrentFrame();
	const op = interpolate(f, [inicio, inicio + 6, fin - 6, fin], [0, 1, 1, 0], clamp);
	if (op <= 0.01) return null;
	return (
		<div
			style={{
				position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', opacity: op,
				fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, fontSize: 96, color,
				WebkitTextStroke: '14px #241726', paintOrder: 'stroke fill', letterSpacing: 2,
			}}
		>
			{texto}
		</div>
	);
};

// Caja de acero con remaches (rasgadura en la pared): se abre con `grieta` 0..1.
export const Grieta: React.FC<{ang: number; y: number; grieta: number}> = ({ang, y, grieta}) => (
	<Caja size={[0.5 + 1.2 * grieta, 3.2 * grieta + 0.05, 0.08]} pos={[5.1 * Math.sin(ang), y, 5.1 * Math.cos(ang)]} rot={[0, ang, 0]} color="#120a02" />
);

export const yawHacia = (pos: [number, number, number], cam: [number, number, number]) =>
	Math.atan2(cam[0] - pos[0], cam[2] - pos[2]);

export const useF = () => useCurrentFrame();

export {interpolate};
