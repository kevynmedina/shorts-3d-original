import React from 'react';
import {Composition} from 'remotion';
import {Melaza} from './videos/melaza/Melaza';
import {FIN_TOTAL} from './videos/melaza/tomas/Tomas';
import {Baile} from './videos/baile/Baile';
import {FIN_TOTAL as FIN_BAILE} from './videos/baile/tomas/Tomas';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="melaza"
				component={Melaza}
				durationInFrames={FIN_TOTAL}
				fps={30}
				width={1080}
				height={1920}
				defaultProps={{subtitulos: true}}
			/>
			<Composition
				id="baile"
				component={Baile}
				durationInFrames={FIN_BAILE}
				fps={30}
				width={1080}
				height={1920}
				defaultProps={{subtitulos: true}}
			/>
		</>
	);
};
