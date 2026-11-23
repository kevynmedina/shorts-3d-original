import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Cifra discreta arriba del cuadro (zona superior; no tapa personajes ni subtítulos).
export const RotulosContext = React.createContext(true);

export const Cifra: React.FC<{texto: string; inicio: number; fin?: number; color?: string; tam?: number}> = ({
	texto, inicio, fin = 100000, color = '#ffd34d', tam = 96,
}) => {
	const f = useCurrentFrame();
	const activos = React.useContext(RotulosContext);
	const op = interpolate(f, [inicio, inicio + 6, fin - 6, fin], [0, 1, 1, 0], clamp);
	if (op <= 0.01 || !activos) return null;
	return (
		<div
			style={{
				position: 'absolute', left: 40, right: 40, top: 215, textAlign: 'center', opacity: op,
				fontFamily: 'Arial Black, Arial, sans-serif', fontWeight: 900, fontSize: tam, lineHeight: 1.05, color,
				WebkitTextStroke: '14px #241726', paintOrder: 'stroke fill', letterSpacing: 2,
			}}
		>
			{texto}
		</div>
	);
};
