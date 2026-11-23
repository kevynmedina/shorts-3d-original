import {Config} from '@remotion/cli/config';

// Renderizado con ANGLE (GPU). Los flags --gl, --concurrency y --timeout se pasan también en la línea de comandos.
Config.setChromiumOpenGlRenderer('angle');
