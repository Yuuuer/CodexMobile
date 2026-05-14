import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const sceneDurations = {
  intro: 120,
  problem: 120,
  features: 150,
  workflow: 150,
  outro: 120,
};

const sceneStarts = {
  intro: 0,
  problem: sceneDurations.intro,
  features: sceneDurations.intro + sceneDurations.problem,
  workflow: sceneDurations.intro + sceneDurations.problem + sceneDurations.features,
  outro:
    sceneDurations.intro +
    sceneDurations.problem +
    sceneDurations.features +
    sceneDurations.workflow,
};

const colors = {
  ink: '#101318',
  panel: '#171c23',
  panelLight: '#f6f3ec',
  paper: '#fffaf1',
  text: '#f6f2e8',
  muted: '#a9b2bf',
  mint: '#4fd1ad',
  cyan: '#50b4f7',
  amber: '#f5b85a',
  coral: '#f06f61',
  violet: '#9a8cff',
  green: '#99d36e',
};

const screenshots = {
  chatDark: 'xhs-chat-dark.png',
  sidebarDark: 'xhs-sidebar-dark.png',
  chatLight: 'xhs-chat-light.png',
  sidebarLight: 'xhs-sidebar-light.png',
};

const clampEase = (frame: number, start: number, duration: number) =>
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

const slideY = (frame: number, start: number, duration: number, from = 48) => {
  const p = clampEase(frame, start, duration);
  return interpolate(p, [0, 1], [from, 0]);
};

const BrandMark = ({tone = 'dark'}: {tone?: 'dark' | 'light'}) => {
  const foreground = tone === 'dark' ? colors.text : colors.ink;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${colors.mint}, ${colors.cyan})`,
          color: colors.ink,
          display: 'grid',
          placeItems: 'center',
          fontSize: 34,
          fontWeight: 900,
          boxShadow: '0 22px 60px rgba(79, 209, 173, 0.28)',
        }}
      >
        C
      </div>
      <div style={{lineHeight: 1.05}}>
        <div style={{color: foreground, fontSize: 34, fontWeight: 900}}>CodexMobile</div>
        <div style={{color: tone === 'dark' ? colors.muted : '#596170', fontSize: 20, marginTop: 8}}>
          私有移动 Codex 工作台
        </div>
      </div>
    </div>
  );
};

const Pill = ({
  children,
  color = colors.mint,
  dark = true,
}: {
  children: React.ReactNode;
  color?: string;
  dark?: boolean;
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '14px 22px',
      borderRadius: 999,
      background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(16,19,24,0.08)',
      border: `2px solid ${color}`,
      color,
      fontSize: 25,
      fontWeight: 800,
      letterSpacing: 0,
    }}
  >
    {children}
  </div>
);

const PhoneMock = ({
  image,
  scale = 1,
  rotate = 0,
  top = 0,
  left = 0,
  shadow = true,
}: {
  image: string;
  scale?: number;
  rotate?: number;
  top?: number;
  left?: number;
  shadow?: boolean;
}) => (
  <div
    style={{
      position: 'absolute',
      top,
      left,
      width: 446,
      height: 920,
      transform: `scale(${scale}) rotate(${rotate}deg)`,
      transformOrigin: 'center',
      borderRadius: 72,
      background: '#05070a',
      padding: 22,
      boxShadow: shadow ? '0 50px 110px rgba(0, 0, 0, 0.55)' : 'none',
      border: '4px solid rgba(255,255,255,0.16)',
      overflow: 'hidden',
    }}
    >
      <div
        style={{
          position: 'absolute',
          top: 18,
        left: 158,
        width: 130,
        height: 32,
        borderRadius: 999,
        background: '#05070a',
        zIndex: 3,
      }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 52,
          overflow: 'hidden',
          background: image.includes('light') ? '#f8f8f6' : '#05070a',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Img
          src={staticFile(image)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
  </div>
);

const Background = ({light = false}: {light?: boolean}) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 660], [0, 60], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        background: light
          ? `linear-gradient(160deg, ${colors.paper} 0%, #eef8f3 52%, #edf3ff 100%)`
          : `linear-gradient(160deg, ${colors.ink} 0%, #1e252d 58%, #102925 100%)`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -240 + drift,
          top: 220,
          width: 620,
          height: 620,
          borderRadius: 80,
          background: light ? 'rgba(79, 209, 173, 0.14)' : 'rgba(79, 209, 173, 0.18)',
          transform: 'rotate(18deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -180 - drift / 2,
          bottom: 140,
          width: 520,
          height: 520,
          borderRadius: 90,
          background: light ? 'rgba(80, 180, 247, 0.13)' : 'rgba(80, 180, 247, 0.14)',
          transform: 'rotate(-14deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          opacity: light ? 0.22 : 0.26,
        }}
      />
    </AbsoluteFill>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();
  const phone = clampEase(frame, 8, 38);
  const title = clampEase(frame, 20, 34);
  const pulse = interpolate(Math.sin(frame / 9), [-1, 1], [0.96, 1.04]);

  return (
    <AbsoluteFill>
      <Background />
      <div style={{position: 'absolute', top: 96, left: 72}}>
        <BrandMark />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 248,
          left: 72,
          width: 650,
          color: colors.text,
          opacity: title,
          transform: `translateY(${slideY(frame, 20, 34)}px)`,
        }}
      >
        <div style={{fontSize: 94, lineHeight: 0.98, fontWeight: 950}}>
          电脑在跑
          <br />
          手机接得住
        </div>
        <div style={{fontSize: 36, lineHeight: 1.28, color: colors.muted, marginTop: 34, fontWeight: 700}}>
          把本机 Codex 工作流，接到一个随身可用的 PWA 里。
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 74,
          bottom: 150,
          display: 'flex',
          gap: 18,
          opacity: fade(frame, 46, 24),
        }}
      >
        <Pill color={colors.mint}>私有部署</Pill>
        <Pill color={colors.amber}>桌面同步</Pill>
        <Pill color={colors.cyan}>过程可见</Pill>
      </div>
      <div
        style={{
          transform: `translateX(${interpolate(phone, [0, 1], [180, 0])}px) scale(${interpolate(phone, [0, 1], [0.86, 1])})`,
          opacity: phone,
        }}
      >
        <PhoneMock image={screenshots.chatDark} top={530} left={550} scale={0.95} rotate={-4} />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 82,
          top: 360,
          width: 126,
          height: 126,
          borderRadius: 38,
          border: `3px solid ${colors.mint}`,
          display: 'grid',
          placeItems: 'center',
          color: colors.mint,
          fontSize: 26,
          fontWeight: 900,
          transform: `scale(${pulse})`,
        }}
      >
        LIVE
      </div>
    </AbsoluteFill>
  );
};

const ProblemScene = () => {
  const frame = useCurrentFrame();
  const items = ['出门了，任务还在跑', '电脑旁边没人看确认', '工具调用过程看不见', '手机想追问却断层'];

  return (
    <AbsoluteFill>
      <Background light />
      <div style={{position: 'absolute', top: 94, left: 72}}>
        <BrandMark tone="light" />
      </div>
      <div style={{position: 'absolute', left: 72, top: 250, color: colors.ink, width: 800}}>
        <div
          style={{
            fontSize: 75,
            fontWeight: 950,
            lineHeight: 1.04,
            opacity: clampEase(frame, 0, 28),
            transform: `translateY(${slideY(frame, 0, 28)}px)`,
          }}
        >
          移动端难的
          <br />
          不是发消息
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            lineHeight: 1.35,
            fontWeight: 750,
            color: '#5a6370',
            opacity: clampEase(frame, 18, 30),
          }}
        >
          真正麻烦的是：电脑里正在发生的工作，手机能不能继续接上。
        </div>
      </div>
      <div style={{position: 'absolute', left: 74, top: 610, width: 530}}>
        {items.map((item, index) => {
          const p = clampEase(frame, 36 + index * 12, 24);
          return (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                marginBottom: 22,
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-28, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: index % 2 === 0 ? colors.coral : colors.amber,
                }}
              />
              <div style={{fontSize: 33, fontWeight: 850, color: colors.ink}}>{item}</div>
            </div>
          );
        })}
      </div>
      <div style={{opacity: clampEase(frame, 20, 36)}}>
        <PhoneMock image={screenshots.sidebarLight} top={655} left={602} scale={0.86} rotate={5} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          bottom: 145,
          right: 72,
          padding: '34px 36px',
          borderRadius: 34,
          background: colors.ink,
          color: colors.text,
          fontSize: 38,
          fontWeight: 900,
          lineHeight: 1.22,
          opacity: clampEase(frame, 82, 24),
        }}
      >
        CodexMobile 做的是：让手机成为你的移动控制台。
      </div>
    </AbsoluteFill>
  );
};

const FeatureCard = ({
  title,
  body,
  color,
  index,
}: {
  title: string;
  body: string;
  color: string;
  index: number;
}) => {
  const frame = useCurrentFrame();
  const p = clampEase(frame, 20 + index * 10, 28);
  return (
    <div
      style={{
        width: '100%',
        minHeight: 166,
        padding: '28px 30px',
        borderRadius: 26,
        background: 'rgba(255,255,255,0.075)',
        border: '1px solid rgba(255,255,255,0.14)',
        color: colors.text,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [42, 0])}px)`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{width: 18, height: 58, borderRadius: 999, background: color}} />
        <div style={{fontSize: 35, fontWeight: 950}}>{title}</div>
      </div>
      <div style={{fontSize: 25, lineHeight: 1.36, color: colors.muted, marginTop: 18, fontWeight: 650}}>
        {body}
      </div>
    </div>
  );
};

const FeaturesScene = () => {
  const frame = useCurrentFrame();
  const features = [
    {title: '接管桌面线程', body: '电脑上开的 Codex 对话，手机能看见、追问、继续。', color: colors.mint},
    {title: '保留完整过程', body: '工具调用、活动流、错误和完成状态，折叠但不丢。', color: colors.cyan},
    {title: '移动端工作流', body: '/ 命令、$skill、@文件、图片上传、Git 面板都在。', color: colors.amber},
    {title: '私有网络访问', body: '通过 Tailscale 或局域网连接，本机文件和密钥仍在电脑。', color: colors.coral},
  ];

  return (
    <AbsoluteFill>
      <Background />
      <div style={{position: 'absolute', left: 72, top: 96}}>
        <Pill color={colors.mint}>核心能力</Pill>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 182,
          color: colors.text,
          fontSize: 72,
          fontWeight: 950,
          lineHeight: 1.04,
          opacity: clampEase(frame, 0, 28),
        }}
      >
        像桌面一样可靠
        <br />
        像手机一样顺手
      </div>
      <div style={{position: 'absolute', left: 72, right: 72, top: 430, display: 'grid', gap: 22}}>
        {features.map((feature, index) => (
          <FeatureCard key={feature.title} {...feature} index={index} />
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 120,
          color: colors.text,
          fontSize: 34,
          lineHeight: 1.32,
          fontWeight: 800,
          opacity: clampEase(frame, 86, 30),
        }}
      >
        不是把电脑远程过去，而是把 Codex 的执行链路做成移动端可操作的信息流。
      </div>
    </AbsoluteFill>
  );
};

const WorkflowNode = ({
  title,
  subtitle,
  color,
  x,
  y,
  index,
}: {
  title: string;
  subtitle: string;
  color: string;
  x: number;
  y: number;
  index: number;
}) => {
  const frame = useCurrentFrame();
  const p = clampEase(frame, 18 + index * 18, 28);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 330,
        padding: '28px 26px',
        borderRadius: 30,
        background: colors.paper,
        color: colors.ink,
        boxShadow: '0 26px 70px rgba(0,0,0,0.22)',
        opacity: p,
        transform: `scale(${interpolate(p, [0, 1], [0.88, 1])})`,
      }}
    >
      <div style={{width: 48, height: 10, borderRadius: 999, background: color, marginBottom: 18}} />
      <div style={{fontSize: 31, fontWeight: 950}}>{title}</div>
      <div style={{fontSize: 21, lineHeight: 1.32, color: '#66707d', marginTop: 12, fontWeight: 700}}>
        {subtitle}
      </div>
    </div>
  );
};

const Connector = ({top, rotate = 0, delay}: {top: number; rotate?: number; delay: number}) => {
  const frame = useCurrentFrame();
  const p = clampEase(frame, delay, 24);
  return (
    <div
      style={{
        position: 'absolute',
        left: 368,
        top,
        width: 350,
        height: 8,
        borderRadius: 999,
        background: `linear-gradient(90deg, ${colors.mint}, ${colors.cyan})`,
        transform: `rotate(${rotate}deg) scaleX(${p})`,
        transformOrigin: 'left center',
        opacity: p,
      }}
    />
  );
};

const WorkflowScene = () => {
  const frame = useCurrentFrame();
  const caption = clampEase(frame, 94, 28);

  return (
    <AbsoluteFill>
      <Background light />
      <div style={{position: 'absolute', left: 72, top: 92}}>
        <Pill color={colors.ink} dark={false}>
          真实链路
        </Pill>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 176,
          color: colors.ink,
          fontSize: 72,
          fontWeight: 950,
          lineHeight: 1.04,
          opacity: clampEase(frame, 0, 28),
        }}
      >
        执行还在电脑
        <br />
        控制权进手机
      </div>
      <Connector top={615} delay={38} />
      <Connector top={845} rotate={18} delay={58} />
      <Connector top={1118} rotate={-18} delay={78} />
      <WorkflowNode
        title="Mobile PWA"
        subtitle="手机、平板、折叠屏，浏览器打开就能用。"
        color={colors.mint}
        x={72}
        y={520}
        index={0}
      />
      <WorkflowNode
        title="Node Bridge"
        subtitle="配对码、WebSocket、上传、通知和本地状态。"
        color={colors.cyan}
        x={612}
        y={710}
        index={1}
      />
      <WorkflowNode
        title="Codex Desktop"
        subtitle="读取本机线程，IPC 接管已有任务。"
        color={colors.amber}
        x={72}
        y={1000}
        index={2}
      />
      <WorkflowNode
        title="Local Tools"
        subtitle="文件、Git、skills、命令和私有环境都留在电脑。"
        color={colors.coral}
        x={612}
        y={1190}
        index={3}
      />
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 120,
          padding: '34px 38px',
          borderRadius: 32,
          background: colors.ink,
          color: colors.text,
          fontSize: 36,
          fontWeight: 900,
          lineHeight: 1.22,
          opacity: caption,
          transform: `translateY(${interpolate(caption, [0, 1], [36, 0])}px)`,
        }}
      >
        你看到的是手机界面，真正干活的是自己的电脑和本地 Codex 环境。
      </div>
    </AbsoluteFill>
  );
};

const OutroScene = () => {
  const frame = useCurrentFrame();
  const p = clampEase(frame, 0, 34);
  const cards = [
    {image: screenshots.chatDark, top: 710, left: 78, rotate: -6},
    {image: screenshots.sidebarDark, top: 646, left: 322, rotate: 3},
    {image: screenshots.chatLight, top: 725, left: 566, rotate: 8},
  ];

  return (
    <AbsoluteFill>
      <Background />
      <div style={{position: 'absolute', top: 96, left: 72, opacity: p}}>
        <BrandMark />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 246,
          width: 900,
          color: colors.text,
          opacity: p,
          transform: `translateY(${slideY(frame, 0, 34)}px)`,
        }}
      >
        <div style={{fontSize: 84, fontWeight: 950, lineHeight: 1.02}}>
          把 Codex
          <br />
          带进口袋里
        </div>
        <div style={{fontSize: 35, lineHeight: 1.34, color: colors.muted, fontWeight: 760, marginTop: 32}}>
          但文件、密钥和执行能力，仍然留在你自己的电脑上。
        </div>
      </div>
      {cards.map((card, index) => {
        const cp = clampEase(frame, 30 + index * 10, 32);
        return (
          <div
            key={card.image}
            style={{
              opacity: cp,
              transform: `translateY(${interpolate(cp, [0, 1], [70, 0])}px)`,
            }}
          >
            <PhoneMock {...card} scale={0.72} />
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 124,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: clampEase(frame, 76, 28),
        }}
      >
        <div style={{display: 'flex', gap: 16}}>
          <Pill color={colors.mint}>PWA</Pill>
          <Pill color={colors.cyan}>Tailscale</Pill>
          <Pill color={colors.amber}>GitHub</Pill>
        </div>
        <div style={{color: colors.text, fontSize: 26, fontWeight: 850}}>github.com/flyyangX/CodexMobile</div>
      </div>
    </AbsoluteFill>
  );
};

export const CodexMobileShowcase = () => {
  return (
    <AbsoluteFill style={{fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'}}>
      <Sequence from={sceneStarts.intro} durationInFrames={sceneDurations.intro} premountFor={30}>
        <IntroScene />
      </Sequence>
      <Sequence from={sceneStarts.problem} durationInFrames={sceneDurations.problem} premountFor={30}>
        <ProblemScene />
      </Sequence>
      <Sequence from={sceneStarts.features} durationInFrames={sceneDurations.features} premountFor={30}>
        <FeaturesScene />
      </Sequence>
      <Sequence from={sceneStarts.workflow} durationInFrames={sceneDurations.workflow} premountFor={30}>
        <WorkflowScene />
      </Sequence>
      <Sequence from={sceneStarts.outro} durationInFrames={sceneDurations.outro} premountFor={30}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
