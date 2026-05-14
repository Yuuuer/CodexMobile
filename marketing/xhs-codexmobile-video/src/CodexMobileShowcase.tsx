import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const sceneDurations = {
  intro: 110,
  longTask: 150,
  control: 130,
  gallery: 150,
  outro: 120,
};

const sceneStarts = {
  intro: 0,
  longTask: sceneDurations.intro,
  control: sceneDurations.intro + sceneDurations.longTask,
  gallery: sceneDurations.intro + sceneDurations.longTask + sceneDurations.control,
  outro:
    sceneDurations.intro +
    sceneDurations.longTask +
    sceneDurations.control +
    sceneDurations.gallery,
};

const colors = {
  ink: '#0b0f14',
  paper: '#fbfaf6',
  text: '#f7f2e8',
  darkText: '#11151b',
  muted: '#c7ccd5',
  darkMuted: '#5f6c7b',
  mint: '#6e7dff',
  cyan: '#5f9bff',
  amber: '#b48bff',
  violet: '#8d92ff',
};

const brandAssets = {
  icon: 'codex-icon-512.png',
  wordmark: 'pairing-wordmark.png',
  backgroundDark: 'pairing-background.png',
  backgroundLight: 'pairing-background-light.png',
};

const screenshots = {
  chatDark: 'real-ui-01-chat-execution-dark.png',
  chatLight: 'real-ui-01-chat-execution-light.png',
  drawerDark: 'real-ui-02-drawer-sessions-dark.png',
  drawerLight: 'real-ui-02-drawer-sessions-light.png',
  longDark: 'real-ui-03-composer-workflow-dark.png',
  longLight: 'real-ui-03-composer-workflow-light.png',
  gitDark: 'real-ui-04-git-menu-dark.png',
  gitLight: 'real-ui-04-git-menu-light.png',
  fileDark: 'real-ui-05-file-preview-dark.png',
  fileLight: 'real-ui-05-file-preview-light.png',
};

const iPhone17ProMax = {
  bodyWidthMm: 78,
  bodyHeightMm: 163.4,
  displayWidthPx: 1320,
  displayHeightPx: 2868,
  cssViewportWidth: 440,
  cssViewportHeight: 956,
};

const ease = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const fade = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const yIn = (frame: number, start: number, duration: number, distance = 48) =>
  interpolate(ease(frame, start, duration), [0, 1], [distance, 0]);

const Background = ({light = false, dim = 0.12}: {light?: boolean; dim?: number}) => (
  <AbsoluteFill style={{overflow: 'hidden', background: light ? colors.paper : colors.ink}}>
    <Img
      src={staticFile(light ? brandAssets.backgroundLight : brandAssets.backgroundDark)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
    <AbsoluteFill
      style={{
        background: light
          ? `linear-gradient(180deg, rgba(255,255,255,${dim}) 0%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.34) 100%)`
          : `linear-gradient(180deg, rgba(0,0,0,${dim}) 0%, rgba(0,0,0,0.18) 48%, rgba(0,0,0,0.34) 100%)`,
      }}
    />
  </AbsoluteFill>
);

const Brand = ({dark = true, compact = false}: {dark?: boolean; compact?: boolean}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: compact ? 15 : 18}}>
    <Img
      src={staticFile(brandAssets.icon)}
      style={{
        width: compact ? 58 : 72,
        height: compact ? 58 : 72,
        display: 'block',
        filter: dark ? 'drop-shadow(0 20px 42px rgba(89, 108, 255, 0.42))' : 'drop-shadow(0 18px 34px rgba(89, 108, 255, 0.2))',
      }}
    />
    <div>
      <Img
        src={staticFile(brandAssets.wordmark)}
        style={{
          width: compact ? 262 : 330,
          height: 'auto',
          display: 'block',
          filter: dark ? 'invert(1) brightness(1.12)' : 'none',
        }}
      />
      <div
        style={{
          fontSize: compact ? 18 : 21,
          fontWeight: 750,
          color: dark ? colors.muted : colors.darkMuted,
          marginTop: compact ? 5 : 8,
          letterSpacing: 0,
        }}
      >
        本机 Codex 的移动工作台
      </div>
    </div>
  </div>
);

const Pill = ({
  children,
  color = colors.mint,
  light = false,
}: {
  children: React.ReactNode;
  color?: string;
  light?: boolean;
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '13px 21px',
      borderRadius: 999,
      border: `2px solid ${color}`,
      background: light ? 'rgba(12, 16, 22, 0.06)' : 'rgba(255, 255, 255, 0.075)',
      color,
      fontSize: 24,
      fontWeight: 850,
      letterSpacing: 0,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

const PhoneFrame = ({
  image,
  screenWidth = 420,
  top = 0,
  left = 0,
  rotate = 0,
  scale = 1,
  shadow = true,
}: {
  image: string;
  screenWidth?: number;
  top?: number;
  left?: number;
  rotate?: number;
  scale?: number;
  shadow?: boolean;
}) => {
  const screenHeight =
    screenWidth * (iPhone17ProMax.displayHeightPx / iPhone17ProMax.displayWidthPx);
  const displayDiagonalMm = 6.86 * 25.4;
  const displayAspect = iPhone17ProMax.displayHeightPx / iPhone17ProMax.displayWidthPx;
  const displayWidthMm = displayDiagonalMm / Math.sqrt(1 + displayAspect ** 2);
  const displayHeightMm = displayWidthMm * displayAspect;
  const side = Math.round(screenWidth * ((iPhone17ProMax.bodyWidthMm - displayWidthMm) / displayWidthMm / 2));
  const vertical = Math.round(screenHeight * ((iPhone17ProMax.bodyHeightMm - displayHeightMm) / displayHeightMm / 2));
  const outerWidth = screenWidth + side * 2;
  const outerHeight = screenHeight + vertical * 2;
  const radius = Math.round(outerWidth * 0.14);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        width: outerWidth,
        height: outerHeight,
        padding: `${vertical}px ${side}px`,
        borderRadius: radius,
        background: '#05070a',
        border: '4px solid rgba(255,255,255,0.15)',
        boxShadow: shadow ? '0 48px 120px rgba(0,0,0,0.52)' : 'none',
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        transformOrigin: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: Math.round(vertical * 0.32),
          left: Math.round((outerWidth - screenWidth * 0.24) / 2),
          width: Math.round(screenWidth * 0.24),
          height: Math.max(5, Math.round(screenWidth * 0.014)),
          borderRadius: 999,
          background: 'rgba(255,255,255,0.18)',
        }}
      />
      <div
        style={{
          width: screenWidth,
          height: screenHeight,
          borderRadius: Math.round(radius * 0.68),
          overflow: 'hidden',
          background: image.includes('light') ? '#f8f8f6' : '#05070a',
        }}
      >
        <Img
          src={staticFile(image)}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
};

const LabelCard = ({
  title,
  body,
  color,
  delay,
}: {
  title: string;
  body: string;
  color: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, delay, 26);

  return (
    <div
      style={{
        padding: '24px 26px',
        borderRadius: 26,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.14)',
        color: colors.text,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [36, 0])}px)`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 15}}>
        <div style={{width: 16, height: 48, borderRadius: 999, background: color}} />
        <div style={{fontSize: 32, fontWeight: 950}}>{title}</div>
      </div>
      <div style={{fontSize: 23, lineHeight: 1.36, color: colors.muted, marginTop: 14, fontWeight: 700}}>
        {body}
      </div>
    </div>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();
  const phone = ease(frame, 8, 38);
  const liveScale = interpolate(Math.sin(frame / 8), [-1, 1], [0.96, 1.04]);

  return (
    <AbsoluteFill>
      <Background dim={0.18} />
      <div style={{position: 'absolute', top: 96, left: 72, opacity: fade(frame, 0, 22)}}>
        <Brand />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 270,
          left: 72,
          width: 610,
          color: colors.text,
          opacity: ease(frame, 18, 34),
          transform: `translateY(${yIn(frame, 18, 34)}px)`,
        }}
      >
        <div style={{fontSize: 88, lineHeight: 1.02, fontWeight: 980}}>
          本机 Codex
          <br />
          装进手机里
        </div>
        <div style={{fontSize: 35, lineHeight: 1.32, color: colors.muted, marginTop: 30, fontWeight: 760}}>
          电脑负责执行，手机负责接续、查看和继续指挥。
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          bottom: 150,
          display: 'flex',
          gap: 15,
          opacity: ease(frame, 56, 24),
        }}
      >
        <Pill color={colors.mint}>真实 UI 截图</Pill>
        <Pill color={colors.cyan}>PWA</Pill>
        <Pill color={colors.amber}>私有网络</Pill>
      </div>
      <div
        style={{
          opacity: phone,
          transform: `translateX(${interpolate(phone, [0, 1], [180, 0])}px) scale(${interpolate(phone, [0, 1], [0.92, 1])})`,
        }}
      >
        <PhoneFrame image={screenshots.chatDark} screenWidth={395} top={540} left={602} rotate={-3} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 88,
          top: 360,
          width: 126,
          height: 126,
          borderRadius: 36,
          border: `3px solid ${colors.mint}`,
          display: 'grid',
          placeItems: 'center',
          color: colors.mint,
          fontSize: 27,
          fontWeight: 950,
          opacity: ease(frame, 44, 20),
          transform: `scale(${liveScale})`,
        }}
      >
        LIVE
      </div>
    </AbsoluteFill>
  );
};

const LongTaskScene = () => {
  const frame = useCurrentFrame();
  const lines = [
    {text: '搜索真实入口与组件路径', color: colors.mint},
    {text: '展开工具调用与 Shell 输出', color: colors.cyan},
    {text: '队列、停止、继续都在底部', color: colors.amber},
  ];

  return (
    <AbsoluteFill>
      <Background dim={0.16} />
      <div
        style={{
          position: 'absolute',
          top: 92,
          left: 72,
          opacity: ease(frame, 0, 26),
        }}
      >
        <Pill color={colors.mint}>长任务执行</Pill>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 178,
          left: 72,
          width: 820,
          color: colors.text,
          opacity: ease(frame, 8, 30),
          transform: `translateY(${yIn(frame, 8, 30)}px)`,
        }}
      >
        <div style={{fontSize: 76, lineHeight: 1.04, fontWeight: 980}}>
          不是只看结果
          <br />
          过程也能完整展开
        </div>
        <div style={{fontSize: 31, lineHeight: 1.36, color: colors.muted, marginTop: 26, fontWeight: 740}}>
          工具调用、搜索、读取文件、构建输出，手机端按真实信息流展示。
        </div>
      </div>
      <PhoneFrame image={screenshots.longDark} screenWidth={405} top={585} left={598} rotate={2} />
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 690,
          width: 415,
          display: 'grid',
          gap: 22,
        }}
      >
        {lines.map((line, index) => {
          const p = ease(frame, 42 + index * 18, 26);
          return (
            <div
              key={line.text}
              style={{
                padding: '24px 24px',
                borderRadius: 24,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: colors.text,
                fontSize: 28,
                fontWeight: 860,
                lineHeight: 1.24,
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-42, 0])}px)`,
              }}
            >
              <div style={{width: 58, height: 9, borderRadius: 999, background: line.color, marginBottom: 16}} />
              {line.text}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 126,
          padding: '31px 34px',
          borderRadius: 30,
          background: 'rgba(251,250,246,0.94)',
          color: colors.darkText,
          fontSize: 34,
          fontWeight: 930,
          lineHeight: 1.24,
          opacity: ease(frame, 106, 24),
        }}
      >
        出门以后，也能知道 Codex 正在干到哪一步。
      </div>
    </AbsoluteFill>
  );
};

const ControlScene = () => {
  const frame = useCurrentFrame();
  const chips = ['会话抽屉', 'Git 小菜单', '文件预览', '深浅模式'];

  return (
    <AbsoluteFill>
      <Background light dim={0.22} />
      <div style={{position: 'absolute', top: 94, left: 72, opacity: ease(frame, 0, 24)}}>
        <Brand dark={false} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 246,
          width: 850,
          color: colors.darkText,
          opacity: ease(frame, 8, 30),
          transform: `translateY(${yIn(frame, 8, 30)}px)`,
        }}
      >
        <div style={{fontSize: 74, lineHeight: 1.05, fontWeight: 980}}>
          不是远程桌面
          <br />
          是移动控制台
        </div>
        <div style={{fontSize: 32, lineHeight: 1.34, color: colors.darkMuted, marginTop: 26, fontWeight: 760}}>
          只保留真正高频的移动端操作，让线程、文件和 Git 状态更容易扫读。
        </div>
      </div>
      <PhoneFrame image={screenshots.drawerLight} screenWidth={298} top={705} left={52} rotate={-4} />
      <PhoneFrame image={screenshots.gitDark} screenWidth={318} top={660} left={382} rotate={1} />
      <PhoneFrame image={screenshots.fileLight} screenWidth={298} top={725} left={724} rotate={4} />
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 120,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          opacity: ease(frame, 76, 24),
        }}
      >
        {chips.map((chip, index) => (
          <Pill key={chip} color={[colors.mint, colors.cyan, colors.amber, colors.violet][index]} light>
            {chip}
          </Pill>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const GalleryScene = () => {
  const frame = useCurrentFrame();
  const cards = [
    {title: '桌面线程接续', body: '手机打开就能看到当前对话和执行状态。', color: colors.mint},
    {title: '真实文件上下文', body: '@ 文件、图片附件和 README 引用保持一致。', color: colors.cyan},
    {title: '轻量 Git 操作', body: '移动端只放常用操作，不塞回旧 Git 面板。', color: colors.amber},
  ];
  const phoneImages = [
    screenshots.chatLight,
    screenshots.drawerDark,
    screenshots.longLight,
    screenshots.gitLight,
  ];
  const phonePlacements = [
    {left: 525, top: 528, rotate: -4},
    {left: 792, top: 548, rotate: 3},
    {left: 525, top: 1002, rotate: -2},
    {left: 792, top: 1018, rotate: 4},
  ];

  return (
    <AbsoluteFill>
      <Background dim={0.14} />
      <div style={{position: 'absolute', left: 72, top: 94}}>
        <Pill color={colors.cyan}>功能展示</Pill>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 180,
          color: colors.text,
          fontSize: 72,
          fontWeight: 980,
          lineHeight: 1.05,
          opacity: ease(frame, 0, 28),
        }}
      >
        常用能力
        <br />
        都回到真实界面里
      </div>
      <div style={{position: 'absolute', left: 72, top: 420, width: 418, display: 'grid', gap: 20}}>
        {cards.map((card, index) => (
          <LabelCard key={card.title} {...card} delay={24 + index * 14} />
        ))}
      </div>
      {phoneImages.map((image, index) => {
        const p = ease(frame, 30 + index * 12, 28);
        return (
          <div
            key={image}
            style={{
              opacity: p,
              transform: `translateY(${interpolate(p, [0, 1], [70, 0])}px)`,
            }}
          >
            <PhoneFrame
              image={image}
              screenWidth={220}
              top={phonePlacements[index].top}
              left={phonePlacements[index].left}
              rotate={phonePlacements[index].rotate}
              shadow={index > 1}
            />
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 126,
          color: colors.text,
          fontSize: 33,
          fontWeight: 850,
          lineHeight: 1.32,
          opacity: ease(frame, 102, 24),
        }}
      >
        所有画面都来自当前项目的真实页面截图，展示的是现在这版 CodexMobile。
      </div>
    </AbsoluteFill>
  );
};

const OutroScene = () => {
  const frame = useCurrentFrame();
  const p = ease(frame, 0, 34);

  return (
    <AbsoluteFill>
      <Background light dim={0.26} />
      <div style={{position: 'absolute', top: 96, left: 72, opacity: p}}>
        <Brand dark={false} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 252,
          width: 880,
          color: colors.darkText,
          opacity: p,
          transform: `translateY(${yIn(frame, 0, 34)}px)`,
        }}
      >
        <div style={{fontSize: 84, lineHeight: 1.02, fontWeight: 980}}>
          把 Codex
          <br />
          带到随身屏幕
        </div>
        <div style={{fontSize: 35, lineHeight: 1.34, color: colors.darkMuted, marginTop: 30, fontWeight: 770}}>
          文件、密钥和执行环境仍在自己的电脑上，手机只是更顺手的控制入口。
        </div>
      </div>
      <PhoneFrame image={screenshots.chatDark} screenWidth={330} top={705} left={128} rotate={-4} />
      <PhoneFrame image={screenshots.longLight} screenWidth={350} top={660} left={580} rotate={4} />
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 120,
          padding: '30px 34px',
          borderRadius: 30,
          background: colors.ink,
          color: colors.text,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: ease(frame, 74, 28),
        }}
      >
        <div style={{display: 'flex', gap: 14}}>
          <Pill color={colors.mint}>PWA</Pill>
          <Pill color={colors.cyan}>Tailscale</Pill>
          <Pill color={colors.amber}>本机执行</Pill>
        </div>
        <div style={{fontSize: 25, fontWeight: 850, color: colors.muted}}>github.com/flyyangX/CodexMobile</div>
      </div>
    </AbsoluteFill>
  );
};

export const CodexMobileShowcase = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif',
      }}
    >
      <Sequence from={sceneStarts.intro} durationInFrames={sceneDurations.intro} premountFor={30}>
        <IntroScene />
      </Sequence>
      <Sequence from={sceneStarts.longTask} durationInFrames={sceneDurations.longTask} premountFor={30}>
        <LongTaskScene />
      </Sequence>
      <Sequence from={sceneStarts.control} durationInFrames={sceneDurations.control} premountFor={30}>
        <ControlScene />
      </Sequence>
      <Sequence from={sceneStarts.gallery} durationInFrames={sceneDurations.gallery} premountFor={30}>
        <GalleryScene />
      </Sequence>
      <Sequence from={sceneStarts.outro} durationInFrames={sceneDurations.outro} premountFor={30}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
