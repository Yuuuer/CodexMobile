/**
 * 设备配对门禁：接收终端配对链接或手动输入终端配对码完成 Cookie 登录。
 *
 * Keywords: pairing, device-auth, cookie, terminal-code
 *
 * Exports:
 * - default — `PairingScreen`（未认证时由 `App` 全屏展示）。
 *
 * Inward: `pairing-flow`。
 *
 * Outward: `App.jsx` 在 `authenticated === false` 时渲染。
 */

import { Check, Loader2, Monitor } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  completePairing,
  normalizePairingCode,
  pairingRequestFromSearch
} from '../pairing-flow.js';

export default function PairingScreen({ onPaired }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pairing, setPairing] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const autoPairRef = useRef(pairingRequestFromSearch(globalThis.location?.search || ''));
  const formRef = useRef(null);

  useEffect(() => {
    const fromSearch = autoPairRef.current;
    if (!fromSearch) {
      return;
    }
    setCode(fromSearch.code);
    if (typeof globalThis.window?.history?.replaceState === 'function') {
      globalThis.window.history.replaceState(null, '', '/');
    }
  }, []);

  useEffect(() => {
    const fromSearch = autoPairRef.current;
    if (!fromSearch || pairing) {
      return;
    }
    autoPairRef.current = null;
    setPairing(true);
    setError('');
    completePairing({ requestId: fromSearch.requestId, code: fromSearch.code })
      .then(() => onPaired())
      .catch((err) => setError(err.message || '自动配对失败，请重新运行 npm run pair'))
      .finally(() => setPairing(false));
  }, [onPaired, pairing]);

  async function handlePair(event) {
    event.preventDefault();
    if (!code.trim()) {
      setError('请输入配对码');
      return;
    }
    setPairing(true);
    setError('');
    try {
      await completePairing({ code });
      onPaired();
    } catch (err) {
      setError(err.message);
    } finally {
      setPairing(false);
    }
  }

  function scrollFormIntoView() {
    formRef.current?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }

  function handleCodeFocus() {
    setInputActive(true);
    window.setTimeout(scrollFormIntoView, 120);
    window.setTimeout(scrollFormIntoView, 360);
  }

  return (
    <main className={inputActive ? 'pairing-screen is-input-active' : 'pairing-screen'}>
      <div className="pairing-mark">
        <Monitor size={30} />
      </div>
      <h1>CodexMobile</h1>
      <p className="pairing-lead">
        我的本机 Codex 移动工作台。电脑端负责同步与镜像，iPhone 可以追问、看过程、处理确认和收完成通知。
      </p>
      <div className="pairing-points" aria-label="CodexMobile 核心能力">
        <span>桌面线程同步</span>
        <span>完整执行过程</span>
        <span>私有网络访问</span>
      </div>
      <p className="pairing-note">
        在电脑终端运行 npm run pair，然后打开终端链接或输入终端配对码。
      </p>
      <form ref={formRef} className="pairing-form" onSubmit={handlePair}>
        <input
          inputMode="text"
          placeholder="10 位配对码"
          value={code}
          onBlur={() => setInputActive(false)}
          onFocus={handleCodeFocus}
          onChange={(event) => setCode(normalizePairingCode(event.target.value, 10))}
        />
        <button type="submit" disabled={!code.trim() || pairing}>
          {pairing ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
          连接
        </button>
      </form>
      {error ? <div className="pairing-error">{error}</div> : null}
    </main>
  );
}
