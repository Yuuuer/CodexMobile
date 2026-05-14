import {Composition} from 'remotion';
import {CodexMobileShowcase} from './CodexMobileShowcase';

export const RemotionRoot = () => {
  return (
    <Composition
      id="CodexMobileXhs"
      component={CodexMobileShowcase}
      durationInFrames={660}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
