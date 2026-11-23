import React, {useEffect, useLayoutEffect, useMemo} from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useFrame, useThree} from '@react-three/fiber';
import {EffectComposer} from '@react-three/postprocessing';
import {ToneMappingEffect, ToneMappingMode} from 'postprocessing';
import * as THREE from 'three';
import {LIGHTS, LightPreset} from '../melaza/look/lights';
import {CHAR, TONE, twoTone} from '../melaza/look/shade';
import {blobMaterial, cardShade} from '../melaza/look/cardshade';
import {LensBlur} from '../melaza/look/lensblur';
import {geoCaballo, geoPersona} from '../melaza/look/cartas';

// Base común de las escenas 3D (look de puente): luz de preset por canvas, sombras proyectadas,
// two-tone en el mundo, tarjetas de personaje, y lente (desenfoque) opcional con tone mapping NEUTRAL.

export type Pose = {
	pos: [number, number, number];
	mira: [number, number, number];
	fov?: number;
};
type Vec3 = [number, number, number];
type Mundo = {bounce: [number, number, number]; sat: number};

// Preset nocturno propio (E3): luz de luna azul-violeta; la lámpara cálida es una luz puntual aparte.
export const NOCHE: LightPreset = {
	...LIGHTS.day,
	az: 150, el: 32,
	lit: [0.55, 0.56, 0.9], shade: [0.16, 0.16, 0.36], lift: [0.02, 0.02, 0.07],
	charTint: [0.9, 0.86, 1.0], charShade: 0.72, charGrad: 0.1, bodyGrad: 0.2, sideTint: [0.8, 0.8, 1.0],
	sunCol: '#8f9cff', sunI: 1.0, sky: '#2a3b7a', ground: '#101020', hemiI: 0.45,
	bias: -0.0006, normalBias: 0.03,
};
const MUNDO_NEUTRO: Mundo = {bounce: [0, 0, 0], sat: 1};

// Deriva continua de cámara (no se detiene nunca): vaivén lateral y de altura, sin clamp.
// Velocidad máxima ~0,03 m por cuadro: suficiente para que cada cuadro se mueva en la métrica.
const deriva = (f: number): [number, number, number] => [
	1.2 * Math.sin(f / 40) + 0.6 * Math.sin(f / 17),
	0.3 * Math.sin(f / 23) + 0.15 * Math.cos(f / 11),
	0.4 * Math.sin(f / 57) + 0.2 * Math.cos(f / 13),
];

// BAILE: además de la deriva de posición, la cámara hace un barrido de ROTACIÓN pura (yaw y pitch) y una respiración de
// FOV. La rotación mueve toda la imagen de forma uniforme (da igual la profundidad), así que el movimiento de cámara
// domina sobre elementos estáticos (subtítulos) en la medición. Nunca se detiene: yaw y pitch tienen periodos distintos.
// AMP_BARRIDO = 0: sin barrido (cámara original). Subir solo si la medición sin rótulos lo exige.
const AMP_BARRIDO = 0;
export const barrido = (f: number) => {
	const yaw = 1.5 * Math.sin((2 * Math.PI * f) / 96 + 0.7) + 0.6 * Math.sin((2 * Math.PI * f) / 41);
	const pitch = 0.8 * Math.sin((2 * Math.PI * f) / 131 + 1.9) + 0.35 * Math.sin((2 * Math.PI * f) / 53);
	const fov = 1 + 0.035 * Math.sin((2 * Math.PI * f) / 150 + 0.3) + 0.015 * Math.sin((2 * Math.PI * f) / 61);
	return {yaw: (AMP_BARRIDO * yaw * Math.PI) / 180, pitch: (AMP_BARRIDO * pitch * Math.PI) / 180, fov: 1 + AMP_BARRIDO * (fov - 1)};
};

const Camara: React.FC<{pose: Pose; escala: number}> = ({pose, escala}) => {
	const camara = useThree((s) => s.camera) as THREE.PerspectiveCamera;
	const f = useCurrentFrame();
	const d = deriva(f).map((v) => v * escala);
	const bar = barrido(f);
	useLayoutEffect(() => {
		const pos = new THREE.Vector3(pose.pos[0] + d[0], pose.pos[1] + d[1], pose.pos[2] + d[2]);
		const mira = new THREE.Vector3(pose.mira[0] + d[0], pose.mira[1] + d[1], pose.mira[2] + d[2]);
		const fwd = mira.clone().sub(pos);
		const dist = fwd.length();
		fwd.normalize();
		const der = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
		const arr = new THREE.Vector3().crossVectors(der, fwd).normalize();
		mira.addScaledVector(der, dist * Math.tan(bar.yaw)).addScaledVector(arr, dist * Math.tan(bar.pitch));
		camara.position.copy(pos);
		camara.lookAt(mira);
		camara.fov = (pose.fov ?? 50) * bar.fov;
		camara.updateProjectionMatrix();
		camara.updateMatrixWorld();
	});
	return null;
};

// Escribe TODOS los uniformes de two-tone (mundo) y de tarjetas (CHAR) con el preset de esta escena.
// Se llama con prioridad -1 en cada canvas, justo antes de su propio render.
export const aplicarLuz = (luz: LightPreset, mundo: Mundo) => {
	TONE.uLitCol.value.set(...luz.lit);
	TONE.uShadeCol.value.set(...luz.shade);
	TONE.uShadeLift.value.set(...luz.lift);
	TONE.uLambert.value = luz.lambert;
	TONE.uSideK.value = luz.sideK;
	TONE.uTerm.value = luz.term;
	TONE.uBounce.value.set(...mundo.bounce);
	TONE.uSat.value = mundo.sat;
	CHAR.uCharTint.value.set(...luz.charTint);
	CHAR.uCharShade.value = luz.charShade;
	CHAR.uGrad.value = luz.charGrad;
	CHAR.uBodyGrad.value = luz.bodyGrad;
	CHAR.uSideTint.value.set(...luz.sideTint);
};

const Luces: React.FC<{luz: LightPreset; mundo: Mundo}> = ({luz, mundo}) => {
	useFrame(() => aplicarLuz(luz, mundo), -1);
	return null;
};

// Sol direccional (única fuente que proyecta sombras): posición relativa a la cámara, como en puente.
const Sol: React.FC<{luz: LightPreset; pose: Pose; enfoque: Vec3}> = ({luz, pose, enfoque}) => {
	const sol = useMemo(() => {
		const s = new THREE.DirectionalLight();
		s.castShadow = true;
		s.shadow.mapSize.set(4096, 4096);
		return s;
	}, []);
	useLayoutEffect(() => {
		const pos = new THREE.Vector3(...pose.pos), mira = new THREE.Vector3(...pose.mira), foco = new THREE.Vector3(...enfoque);
		const fwd = mira.clone().sub(pos).normalize();
		const fH = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
		const der = new THREE.Vector3(-fH.z, 0, fH.x);
		const az = THREE.MathUtils.degToRad(luz.az), el = THREE.MathUtils.degToRad(luz.el);
		const dir = fH.clone().multiplyScalar(Math.cos(az)).addScaledVector(der, Math.sin(az)).multiplyScalar(Math.cos(el));
		dir.y += Math.sin(el);
		sol.target.position.copy(foco);
		sol.position.copy(foco).addScaledVector(dir, 220);
		sol.target.updateMatrixWorld();
		sol.color.set(luz.sunCol);
		sol.intensity = luz.sunI;
		const dist = pos.distanceTo(foco);
		let R = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
		if (luz.sunCol === LIGHTS.golden.sunCol) R = Math.max(R, 30);
		const sc = sol.shadow.camera as THREE.OrthographicCamera;
		sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 20; sc.far = 480;
		sc.updateProjectionMatrix();
		sol.shadow.bias = luz.bias;
		sol.shadow.normalBias = luz.normalBias * (R / 12);
	});
	return (
		<>
			<primitive object={sol} />
			<primitive object={sol.target} />
		</>
	);
};

// Redibuja el canvas dentro del composer: lo monta solo cuando el composer ya existe.
// Retiene el delayRender hasta que advance() ha dibujado el cuadro con las pasadas.
const Redibujar: React.FC = () => {
	const advance = useThree((s) => s.advance);
	const frame = useCurrentFrame();
	useEffect(() => {
		const h = delayRender('composer listo');
		const id = requestAnimationFrame(() => {
			advance(performance.now());
			continueRender(h);
		});
		return () => {
			cancelAnimationFrame(id);
			continueRender(h);
		};
	}, [frame, advance]);
	return null;
};

// Lente (pre + main) y tone mapping NEUTRAL, con el foco en el sujeto de cada cuadro.
const Post: React.FC<{enfoque: Vec3; cInf: number}> = ({enfoque, cInf}) => {
	const camara = useThree((s) => s.camera);
	const lente = useMemo(() => new LensBlur({maxCoC: 24, nearScale: 1.2}), []);
	const tono = useMemo(() => new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL}), []);
	useLayoutEffect(() => {
		const fwd = camara.getWorldDirection(new THREE.Vector3());
		const foco = new THREE.Vector3(...enfoque);
		lente.focus = Math.max(0.3, foco.clone().sub(camara.position).dot(fwd));
		lente.cInf = cInf;
	});
	return (
		<>
			<EffectComposer multisampling={4}>
				<primitive object={lente.pre} dispose={null} />
				<primitive object={lente.main} dispose={null} />
				<primitive object={tono} dispose={null} />
			</EffectComposer>
			<Redibujar />
		</>
	);
};

export const Escena3D: React.FC<{
	luz: LightPreset;
	mundo?: Mundo;
	fondo: string;
	pose: Pose;
	enfoque: Vec3;
	lente?: {cInf: number};
	/** escala de la deriva continua de cámara (1 = completa) */
	deriva?: number;
	children: React.ReactNode;
}> = ({luz, mundo = MUNDO_NEUTRO, fondo, pose, enfoque, lente, deriva: escDeriva = 1, children}) => {
	const conLente = lente !== undefined;
	return (
		<AbsoluteFill>
			<ThreeCanvas
				width={1080}
				height={1920}
				shadows
				camera={{fov: pose.fov ?? 50, position: pose.pos, near: 0.1, far: 900}}
				gl={{
					antialias: !conLente,
					stencil: false,
					toneMapping: conLente ? THREE.NoToneMapping : THREE.NeutralToneMapping,
				}}
			>
				<color attach="background" args={[fondo]} />
				<Camara pose={pose} escala={escDeriva} />
				<Luces luz={luz} mundo={mundo} />
				<hemisphereLight args={[luz.sky, luz.ground, luz.hemiI]} />
				<Sol luz={luz} pose={pose} enfoque={enfoque} />
				{children}
				{conLente && <Post enfoque={enfoque} cInf={lente!.cInf} />}
			</ThreeCanvas>
		</AbsoluteFill>
	);
};


// Material de mundo: Lambert con two-tone (la sombra sale azul-violeta), contorno #241726.
const INK_MUNDO = '#241726';
const matMundo = (color: string) => twoTone(new THREE.MeshLambertMaterial({color}));

// Caja con contorno de tinta en sus aristas. `material` opcional para caras con textura.
export const Caja: React.FC<{
	size: Vec3;
	pos?: Vec3;
	rot?: Vec3;
	color?: string;
	material?: THREE.Material | THREE.Material[];
	opacidad?: number;
}> = ({size, pos = [0, 0, 0], rot = [0, 0, 0], color = '#888888', material, opacidad = 1}) => {
	const geo = useMemo(() => new THREE.BoxGeometry(...size), [size[0], size[1], size[2]]);
	const aristas = useMemo(() => new THREE.EdgesGeometry(geo, 30), [geo]);
	const mat = useMemo(() => material ?? matMundo(color), [material, color]);
	return (
		<group position={pos} rotation={rot}>
			<mesh geometry={geo} material={mat} castShadow receiveShadow />
			<lineSegments geometry={aristas}>
				<lineBasicMaterial color={INK_MUNDO} transparent={opacidad < 1} opacity={opacidad} />
			</lineSegments>
		</group>
	);
};

// Cilindro con contorno de tinta en sus bordes.
export const Cilindro: React.FC<{
	radio: number;
	alto: number;
	pos?: Vec3;
	rot?: Vec3;
	color?: string;
	segmentos?: number;
	opacidad?: number;
	material?: THREE.Material;
}> = ({radio, alto, pos = [0, 0, 0], rot = [0, 0, 0], color = '#888888', segmentos = 40, opacidad = 1, material}) => {
	const geo = useMemo(() => new THREE.CylinderGeometry(radio, radio, alto, segmentos), [radio, alto, segmentos]);
	const aristas = useMemo(() => new THREE.EdgesGeometry(geo, 35), [geo]);
	const mat = useMemo(() => material ?? matMundo(color), [material, color]);
	const transparente = opacidad < 1;
	return (
		<group position={pos} rotation={rot}>
			<mesh geometry={geo} material={mat} castShadow receiveShadow />
			<lineSegments geometry={aristas}>
				<lineBasicMaterial color={INK_MUNDO} transparent={transparente} opacity={opacidad} />
			</lineSegments>
		</group>
	);
};

// Plano de suelo que recibe sombras.
export const Suelo: React.FC<{y?: number; color?: string; material?: THREE.Material; tam?: number}> = ({
	y = 0, color = '#888888', material, tam = 300,
}) => {
	const mat = useMemo(() => material ?? matMundo(color), [material, color]);
	return (
		<mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
			<planeGeometry args={[tam, tam]} />
		</mesh>
	);
};

// Tarjeta de personaje (toon.ts) con billboard de yaw hacia la cámara y sombra de contacto.
// `tex` puede ser una lista de cuadros de animación; `idx` elige el cuadro (materiales creados una sola vez).
export const Tarjeta: React.FC<{
	tex: THREE.Texture | THREE.Texture[];
	idx?: number;
	pos: Vec3;
	camara: Vec3;
	escala?: number;
	caballo?: boolean;
	contacto?: THREE.Texture;
	inclina?: number;
}> = ({tex, idx = 0, pos, camara, escala = 1, caballo = false, contacto, inclina = 0}) => {
	const yaw = Math.atan2(camara[0] - pos[0], camara[2] - pos[2]);
	const geo = useMemo(() => (caballo ? geoCaballo() : geoPersona()), [caballo]);
	const lista = Array.isArray(tex) ? tex : [tex];
	const mats = useMemo(
		() => lista.map((t) => cardShade(new THREE.MeshLambertMaterial({map: t, alphaTest: 0.5, side: THREE.DoubleSide}))),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tex],
	);
	const mat = mats[((idx % mats.length) + mats.length) % mats.length];
	const sombra = useMemo(() => (contacto ? blobMaterial(contacto) : null), [contacto]);
	return (
		<group position={pos} rotation={[0, yaw, 0]} scale={[escala, escala, escala]}>
			<mesh geometry={geo} material={mat} castShadow rotation={[0, 0, inclina]} />
			{sombra && (
				<mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} material={sombra}>
					<planeGeometry args={[caballo ? 1.5 : 1.0, caballo ? 0.7 : 0.45]} />
				</mesh>
			)}
		</group>
	);
};

