import palabrasJson from '../palabras.json';

// Cortes y disparadores CALCULADOS desde palabras.json (no cuadros fijos).
// Si cambia la voz, se regenera palabras.json y todo se recalcula con las mismas anclas de palabra.

type Palabra = {palabra: string; inicio: number; fin: number};
const PALABRAS = palabrasJson as Palabra[];
export const FPS = 30;
export const DURACION_VOZ = PALABRAS[PALABRAS.length - 1].fin;

const norm = (s: string) =>
	s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();

// Índice de la n-ésima aparición de una palabra (sin acentos ni puntuación).
const indice = (palabra: string, n = 0): number => {
	const objetivo = norm(palabra);
	let cuenta = -1;
	for (let i = 0; i < PALABRAS.length; i++) {
		if (norm(PALABRAS[i].palabra) === objetivo) {
			cuenta++;
			if (cuenta === n) return i;
		}
	}
	throw new Error(`palabra no encontrada en palabras.json: ${palabra} (#${n})`);
};

export const inicioF = (palabra: string, n = 0) => Math.round(PALABRAS[indice(palabra, n)].inicio * FPS);
export const finF = (palabra: string, n = 0) => Math.round(PALABRAS[indice(palabra, n)].fin * FPS);

// Anclas de corte (palabra de inicio de cada toma, con su desplazamiento en cuadros).
export const XF = 6; // XFADE: la toma entrante empieza XF cuadros antes del corte
export const CORTES = {
	c1: inicioF('Un') - 1,                // 1 -> 2: «Un tanque de quince metros…»
	c2: finF('pintura') + 2,              // 2 -> 3: tras «…tapa con pintura»
	c3: inicioF('ola') - 6,               // 3 -> 4: «y una ola café…»
	c4: inicioF('se', 1) - 1,           // 4 -> 5: «Se rompe la pared…» (2.ª aparición de «se»)
	c5: inicioF('Fijate') - 1,            // 5 -> 6: «Fíjate…»
	c6: inicioF('empresa') - 6,           // 6 -> 7: «…la empresa…»
	fin: Math.ceil((DURACION_VOZ + 1.1) * FPS), // última palabra + 1,1 s (voz completa ≈ 47,9 s + cola ≈ 0,5 s)
};

// Inicio de cada toma (la entrante arranca XF cuadros antes de su corte).
export const INICIO = {
	t1: 0,
	t2: CORTES.c1 - XF,
	t3: CORTES.c2 - XF,
	t4: CORTES.c3 - XF,
	t5: CORTES.c4 - XF,
	t6: CORTES.c5 - XF,
	t7: CORTES.c6 - XF,
};

// Disparadores (cuadros globales) desde las palabras.
export const EV = {
	veintiuna: inicioF('veintiuna', 0),
	goteras: inicioF('goteras'),
	pintura: inicioF('pintura'),
	las: inicioF('las', 1),               // «…alguien LAS tapa con pintura» (1.ª es «de las doce»)
	remaches: inicioF('remaches'),
	bromean: inicioF('bromean'),
	cede: inicioF('cede'),
	ola: inicioF('ola', 0),
	caballos: inicioF('caballos'),
	pared: inicioF('pared', 0),
	ciento: inicioF('ciento'),
	fermento: inicioF('fermentacion'),
	revento: inicioF('reventó', 0),
	tapa: inicioF('tapa', 1),
	anarquistas: inicioF('anarquistas'),
	desgracia: inicioF('desgracia'),
};

// Locales dentro de una toma: evento global - inicio de la toma.
export const loc = (ev: number, inicioToma: number) => ev - inicioToma;

// Duración de cada toma (hasta su corte siguiente).
export const DUR = {
	t1: CORTES.c1 - INICIO.t1,
	t2: CORTES.c2 - INICIO.t2,
	t3: CORTES.c3 - INICIO.t3,
	t4: CORTES.c4 - INICIO.t4,
	t5: CORTES.c5 - INICIO.t5,
	t6: CORTES.c6 - INICIO.t6,
	t7: CORTES.fin - INICIO.t7,
};
