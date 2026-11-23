// Fotos de prueba del short "baile": empaqueta una sola vez y saca varios cuadros.
// Uso: node herramientas\fotos_baile.mjs <nombre:cuadro,nombre:cuadro,...> [escala=0.5]
//   ej.: node herramientas\fotos_baile.mjs t1_ini:5,t1_mid:80 0.5
// Salida: out\fotos_baile\<nombre>.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [lista, escala = '0.5'] = process.argv.slice(2);
const chromiumOptions = {gl: 'angle'};
const salida = path.resolve('out', 'fotos_baile');
fs.mkdirSync(salida, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'baile', chromiumOptions});
const onBrowserLog = (l) => { if (l.type === 'error') console.log('[error]', l.text.slice(0, 300)); };
for (const par of lista.split(',')) {
	const [nombre, cuadro] = par.split(':');
	const t0 = Date.now();
	await renderStill({
		composition, serveUrl, frame: Number(cuadro), output: path.join(salida, `${nombre}.png`), imageFormat: 'png',
		scale: Number(escala), chromiumOptions, timeoutInMilliseconds: 240000, onBrowserLog,
	});
	console.log('foto', nombre, cuadro, ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
