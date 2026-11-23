// Genera src\videos\baile\shots.json (formato de plantillas\scripts\short_qa.py) a partir de tomas\cortes.ts,
// para que cortes, XFADE y total de cuadros no se desincronicen de la composición.
// Uso: node herramientas\generar_shots_baile.mjs [--total]   (--total solo imprime FIN_TOTAL)
import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const r = await build({
	entryPoints: [path.resolve('src/videos/baile/tomas/cortes.ts')],
	bundle: true, format: 'esm', write: false, platform: 'node', loader: {'.json': 'json'},
});
const url = 'data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64');
const {CORTES, XF} = await import(url);
const cortes = [0, CORTES.c1, CORTES.c2, CORTES.c3, CORTES.c4, CORTES.c5, CORTES.c6];
const fin = CORTES.fin;
if (process.argv.includes('--total')) {
	console.log(fin);
	process.exit(0);
}
const shots = cortes.map((a, i) => ({id: i + 1, a, b: (i + 1 < cortes.length ? cortes[i + 1] : fin) - 1}));
const xfade = cortes.slice(1).map((c) => [c - XF, c]);
const salida = path.resolve('src/videos/baile/shots.json');
fs.writeFileSync(salida, JSON.stringify({shots, xfade, total: fin}));
console.log('escrito', salida, 'total', fin);
