import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AlchemyShop.css';

// ── Persistence ───────────────────────────────────────────────
function loadSave() {
  try {
    const raw = localStorage.getItem('alchemyShop_save');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeSave(state) {
  try {
    localStorage.setItem('alchemyShop_save', JSON.stringify({
      gold: state.gold,
      herbs: state.herbs,
      potions: state.potions,
      upgrades: state.upgrades,
      totalEarned: state.totalEarned,
    }));
  } catch {}
}
function clearSave() { localStorage.removeItem('alchemyShop_save'); }

// ── Upgrades definition ───────────────────────────────────────
const UPGRADES = [
  { id: 'autoStirrer',  label: 'Auto-Stirrer',   cost: 30,  desc: 'Brews 1 potion every 8s automatically.',   icon: '⚙️' },
  { id: 'herbGarden',   label: 'Herb Garden',     cost: 60,  desc: 'Generates 1 herb every 12s.',              icon: '🌿' },
  { id: 'fastBrewer',   label: 'Fast Brew',       cost: 80,  desc: 'Cuts brewing time by half.',               icon: '⚡' },
  { id: 'goldTouch',    label: 'Gold Touch',       cost: 120, desc: 'Each potion sells for +3 extra gold.',     icon: '✨' },
  { id: 'doubleHerb',   label: 'Double Herb',      cost: 100, desc: 'Market buys give 2 herbs instead of 1.',  icon: '🌱' },
  { id: 'masterBrewer', label: 'Master Brewer',    cost: 200, desc: 'Auto-Stirrer speed doubled. +5g per sell.',icon: '🧙' },
];

const BREW_TIME = 3000; // ms
const SELL_PRICE = 5;

function initState(save = null) {
  return {
    gold: save?.gold ?? 10,
    herbs: save?.herbs ?? 5,
    potions: save?.potions ?? 0,
    upgrades: save?.upgrades ?? {},
    totalEarned: save?.totalEarned ?? 0,
    brewing: false,
    brewProgress: 0,  // 0-100
    brewStart: null,
  };
}

export default function AlchemyShop({ navigate }) {
  const save = loadSave();
  const [state, setState] = useState(() => initState(save));
  const [log, setLog] = useState(['Welcome to your Alchemy Shop!']);
  const [herbPrice, setHerbPrice] = useState(3);
  const autoRef = useRef(null);
  const gardenRef = useRef(null);

  const addLog = useCallback((msg) => {
    setLog(l => [msg, ...l].slice(0, 12));
  }, []);

  // ── Auto-save ────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => writeSave(state), 5000);
    return () => clearInterval(id);
  }, [state]);

  // ── Brew progress bar ────────────────────────────────────────
  useEffect(() => {
    if (!state.brewing) return;
    const id = setInterval(() => {
      setState(s => {
        if (!s.brewing) return s;
        const elapsed = Date.now() - s.brewStart;
        const brewTime = s.upgrades.fastBrewer ? BREW_TIME / 2 : BREW_TIME;
        const pct = Math.min(100, (elapsed / brewTime) * 100);
        if (pct >= 100) {
          addLog('🧪 Potion brewed!');
          return { ...s, brewing: false, brewProgress: 0, brewStart: null, potions: s.potions + 1 };
        }
        return { ...s, brewProgress: pct };
      });
    }, 80);
    return () => clearInterval(id);
  }, [state.brewing, addLog]);

  // ── Auto-stirrer ─────────────────────────────────────────────
  useEffect(() => {
    if (!state.upgrades.autoStirrer) return;
    const interval = state.upgrades.masterBrewer ? 4000 : 8000;
    autoRef.current = setInterval(() => {
      setState(s => {
        if (s.brewing || s.herbs < 1) return s;
        addLog('⚙️ Auto-Stirrer started a brew...');
        return { ...s, herbs: s.herbs - 1, brewing: true, brewStart: Date.now(), brewProgress: 0 };
      });
    }, interval);
    return () => clearInterval(autoRef.current);
  }, [state.upgrades.autoStirrer, state.upgrades.masterBrewer, addLog]);

  // ── Herb garden ──────────────────────────────────────────────
  useEffect(() => {
    if (!state.upgrades.herbGarden) return;
    gardenRef.current = setInterval(() => {
      setState(s => {
        addLog('🌿 Herb Garden yielded a herb!');
        return { ...s, herbs: s.herbs + 1 };
      });
    }, 12000);
    return () => clearInterval(gardenRef.current);
  }, [state.upgrades.herbGarden, addLog]);

  // ── Herb price fluctuation ────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setHerbPrice(2 + Math.floor(Math.random() * 4));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // ── Actions ───────────────────────────────────────────────────
  const brew = useCallback(() => {
    setState(s => {
      if (s.brewing || s.herbs < 1) return s;
      addLog('🧪 Brewing a potion...');
      return { ...s, herbs: s.herbs - 1, brewing: true, brewStart: Date.now(), brewProgress: 0 };
    });
  }, [addLog]);

  const sellPotion = useCallback(() => {
    setState(s => {
      if (s.potions < 1) return s;
      const bonus = (s.upgrades.goldTouch ? 3 : 0) + (s.upgrades.masterBrewer ? 5 : 0);
      const price = SELL_PRICE + bonus;
      addLog(`💰 Sold a potion for ${price}g!`);
      const newEarned = s.totalEarned + price;
      return { ...s, potions: s.potions - 1, gold: s.gold + price, totalEarned: newEarned };
    });
  }, [addLog]);

  const buyHerb = useCallback(() => {
    setState(s => {
      if (s.gold < herbPrice) return s;
      const count = s.upgrades.doubleHerb ? 2 : 1;
      addLog(`🌿 Bought ${count} herb(s) for ${herbPrice}g`);
      return { ...s, gold: s.gold - herbPrice, herbs: s.herbs + count };
    });
  }, [herbPrice, addLog]);

  const buyUpgrade = useCallback((id) => {
    const upg = UPGRADES.find(u => u.id === id);
    if (!upg) return;
    setState(s => {
      if (s.gold < upg.cost || s.upgrades[id]) return s;
      addLog(`🔮 Unlocked: ${upg.label}!`);
      return { ...s, gold: s.gold - upg.cost, upgrades: { ...s.upgrades, [id]: true } };
    });
  }, [addLog]);

  const resetGame = useCallback(() => {
    clearSave();
    setState(initState(null));
    setLog(['Shop reset. Starting fresh!']);
  }, []);

  const { gold, herbs, potions, upgrades, brewing, brewProgress, totalEarned } = state;

  const visibleUpgrades = UPGRADES.filter(u => {
    if (upgrades[u.id]) return true;
    // Show upgrade if player can realistically afford it (earned 60%+ of cost)
    return totalEarned >= u.cost * 0.4 || gold >= u.cost * 0.5;
  });

  return (
    <div className="alc-wrap">
      <div className="alc-header">
        <button className="alc-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="alc-tag">// ALCHEMY SHOP</span>
      </div>

      {/* Resources */}
      <div className="alc-resources">
        <div className="alc-res">
          <span className="alc-res-icon">🪙</span>
          <div>
            <div className="alc-res-label">GOLD</div>
            <div className="alc-res-val">{gold}</div>
          </div>
        </div>
        <div className="alc-res">
          <span className="alc-res-icon">🌿</span>
          <div>
            <div className="alc-res-label">HERBS</div>
            <div className="alc-res-val">{herbs}</div>
          </div>
        </div>
        <div className="alc-res">
          <span className="alc-res-icon">🧪</span>
          <div>
            <div className="alc-res-label">POTIONS</div>
            <div className="alc-res-val">{potions}</div>
          </div>
        </div>
        <div className="alc-res">
          <span className="alc-res-icon">📈</span>
          <div>
            <div className="alc-res-label">EARNED</div>
            <div className="alc-res-val">{totalEarned}g</div>
          </div>
        </div>
      </div>

      <div className="alc-body">
        {/* Actions */}
        <div className="alc-panel">
          <div className="alc-panel-title">ACTIONS</div>

          <div className="alc-action-card">
            <div className="alc-action-top">
              <span className="alc-action-icon">🧪</span>
              <div>
                <div className="alc-action-name">Brew Potion</div>
                <div className="alc-action-desc">Costs 1 herb · takes {upgrades.fastBrewer ? '1.5s' : '3s'}</div>
              </div>
            </div>
            {brewing && (
              <div className="alc-brew-bar-wrap">
                <div className="alc-brew-bar" style={{ width: `${brewProgress}%` }} />
              </div>
            )}
            <button
              className="alc-btn primary"
              onClick={brew}
              disabled={brewing || herbs < 1}
            >
              {brewing ? `BREWING... ${Math.round(brewProgress)}%` : 'BREW →'}
            </button>
          </div>

          <div className="alc-action-card">
            <div className="alc-action-top">
              <span className="alc-action-icon">💰</span>
              <div>
                <div className="alc-action-name">Sell Potion</div>
                <div className="alc-action-desc">
                  Earns {SELL_PRICE + (upgrades.goldTouch ? 3 : 0) + (upgrades.masterBrewer ? 5 : 0)}g each
                </div>
              </div>
            </div>
            <button className="alc-btn success" onClick={sellPotion} disabled={potions < 1}>
              SELL → +{SELL_PRICE + (upgrades.goldTouch ? 3 : 0) + (upgrades.masterBrewer ? 5 : 0)}g
            </button>
          </div>

          <div className="alc-action-card">
            <div className="alc-action-top">
              <span className="alc-action-icon">🌿</span>
              <div>
                <div className="alc-action-name">Buy Herbs</div>
                <div className="alc-action-desc">
                  Market price: {herbPrice}g · {upgrades.doubleHerb ? 'x2 herbs!' : '1 herb'}
                </div>
              </div>
            </div>
            <button className="alc-btn" onClick={buyHerb} disabled={gold < herbPrice}>
              BUY {herbPrice}g →
            </button>
          </div>
        </div>

        {/* Upgrades */}
        <div className="alc-panel">
          <div className="alc-panel-title">UPGRADES</div>
          {visibleUpgrades.length === 0 && (
            <div className="alc-empty">Earn more gold to unlock upgrades.</div>
          )}
          {visibleUpgrades.map(upg => {
            const owned = !!upgrades[upg.id];
            const canAfford = gold >= upg.cost;
            return (
              <div key={upg.id} className={`alc-upgrade ${owned ? 'owned' : ''}`}>
                <span className="alc-upg-icon">{upg.icon}</span>
                <div className="alc-upg-info">
                  <div className="alc-upg-name">{upg.label}</div>
                  <div className="alc-upg-desc">{upg.desc}</div>
                </div>
                {owned
                  ? <span className="alc-upg-owned">✓ OWNED</span>
                  : <button
                      className={`alc-btn small ${canAfford ? 'primary' : ''}`}
                      onClick={() => buyUpgrade(upg.id)}
                      disabled={!canAfford}
                    >{upg.cost}g</button>
                }
              </div>
            );
          })}
        </div>

        {/* Log */}
        <div className="alc-panel">
          <div className="alc-panel-title">EVENT LOG</div>
          <div className="alc-log">
            {log.map((entry, i) => (
              <div key={i} className={`alc-log-entry ${i === 0 ? 'fresh' : ''}`}>{entry}</div>
            ))}
          </div>
          <button className="alc-reset-btn" onClick={resetGame}>RESET SAVE</button>
        </div>
      </div>
    </div>
  );
}
