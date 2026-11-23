import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {SHOTS} from './tomas/Tomas';
import {Subtitulos} from './tomas/Subtitulos';
import {XF} from './tomas/cortes';

// Composición "melaza": 1080x1920, 30 fps. Siete tomas con XFADE de 6 cuadros.
// Cada toma entrante empieza XF cuadros antes de su corte y sube de 0 a 1; la saliente queda opaca.
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Melaza: React.FC<{subtitulos: boolean}> = ({subtitulos}) => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill style={{background: '#000000'}}>
			{SHOTS.map((s) => {
				const op = s.id === 1 ? 1 : interpolate(frame, [s.inicio, s.inicio + XF], [0, 1], clamp);
				const C = s.C;
				return (
					<Sequence key={s.id} from={s.inicio} durationInFrames={s.dur}>
						<AbsoluteFill style={{opacity: op}}>
							<C />
						</AbsoluteFill>
					</Sequence>
				);
			})}
			{subtitulos && <Subtitulos />}
		</AbsoluteFill>
	);
};
