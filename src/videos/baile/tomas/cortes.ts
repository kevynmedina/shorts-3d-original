import palabrasJson from '../palabras.json';

// Cortes y disparadores CALCULADOS desde palabras.json (no cuadros fijos).
// Si cambia la voz se regenera palabras.json y todo se recalcula con las mismas anclas de frase.

type Palabra = {palabra: string; inicio: number; fin: number};
const PALABRAS = palabrasJson as Palabra[];
export const FPS = 30;
export const DURACION_VOZ = PALABRAS[PALABRAS.length - 1].fin;

const norm = (s: string) =>
	s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();

// Índice de la n-ésima aparición de una secuencia de palabras consecutivas («Los médicos»).
const indice = (frase: string, n = 0): number => {
	const ws = frase.split(' ').map(norm);
	let cuenta = -1;
	for (let i = 0; i + ws.length <= PALABRAS.length; i++) {
		if (ws.every((w, k) => norm(PALABRAS[i + k].palabra) === w)) {
			cuenta++;
			if (cuenta === n) return i;
		}
	}
	throw new Error(`frase no encontrada en palabras.json: ${frase} (#${n})`);
};

export const inicioF = (frase: string, n = 0) => Math.round(PALABRAS[indice(frase, n)].inicio * FPS);
export const finF = (frase: string, n = 0) => {
	const k = frase.split(' ').length;
	return Math.round(PALABRAS[indice(frase, n) + k - 1].fin * FPS);
};

export const XF = 6; // XFADE: la toma entrante empieza XF cuadros antes de su corte
export const CORTES = {
	c1: inicioF('Es julio') - 1,          // T1 -> T2: «Es julio…»
	c2: inicioF('Baila de cuatro') - 1,   // T2 -> T3: «Baila de cuatro a seis días…»
	c3: inicioF('Los medicos') - 1,       // T3 -> T4: «Los médicos dicen…»
	c4: inicioF('Y entonces') - 1,        // T4 -> T5: «Y entonces se rompe…»
	c5: inicioF('Fijate') - 1,            // T5 -> T6: «Fíjate…»
	c6: inicioF('Al final') - 1,          // T6 -> T7: «Al final los llevan…»
	fin: Math.ceil((DURACION_VOZ + 1.0) * FPS), // fin de la voz + 1 s
};

export const INICIO = {
	t1: 0,
	t2: CORTES.c1 - XF,
	t3: CORTES.c2 - XF,
	t4: CORTES.c3 - XF,
	t5: CORTES.c4 - XF,
	t6: CORTES.c5 - XF,
	t7: CORTES.c6 - XF,
};

// Disparadores (cuadros GLOBALES) desde las frases.
export const EV = {
	monedas: inicioF('contrato'),
	pan: inicioF('El pan'),
	hambre: inicioF('hay hambre'),
	troffea: inicioF('Troffea'),
	sale: inicioF('sale a la calle'),
	sinMusica: inicioF('Sin musica'),
	seis: inicioF('seis dias'),
	miran: inicioF('la miran'),
	unen: inicioF('se unen'),
	treinta: inicioF('treinta'),
	cuatrocientos: inicioF('cuatrocientos'),
	medicos: inicioF('Los medicos'),
	sangre: inicioF('sangre caliente'),
	bailarMas: inicioF('Bailar mas'),
	vacia: inicioF('vacia el mercado'),
	tarima: inicioF('tarima'),
	orquesta: inicioF('orquesta'),
	espera: inicioF('Espera'),
	rompe: inicioF('se rompe'),
	cae: inicioF('cae rendida'),
	muertos: inicioF('muertos'),
	suerte: inicioF('Por suerte'),
	desgracia: inicioF('Por desgracia'),
	prohibir: inicioF('prohibir'),
	musica: inicioF('toda la musica'),
	fijate: inicioF('Fijate'),
	contagia: inicioF('contagia'),
	bostezo: inicioF('bostezo'),
	alFinal: inicioF('Al final'),
	santuario: inicioF('santuario'),
	zapatos: inicioF('ponen zapatos'),
	bendita: inicioF('agua bendita'),
	pusieron: inicioF('les pusieron'),
	ultima: inicioF('pusieron zapatos') + Math.round(0.4 * FPS),
};

export const loc = (ev: number, inicioToma: number) => ev - inicioToma;

export const DUR = {
	t1: CORTES.c1 - INICIO.t1,
	t2: CORTES.c2 - INICIO.t2,
	t3: CORTES.c3 - INICIO.t3,
	t4: CORTES.c4 - INICIO.t4,
	t5: CORTES.c5 - INICIO.t5,
	t6: CORTES.c6 - INICIO.t6,
	t7: CORTES.fin - INICIO.t7,
};
