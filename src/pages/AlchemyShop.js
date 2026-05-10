import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AlchemyShop.css';

// ── Persistence ───────────────────────────────────────────────
function loadSave() {
  try { const r = localStorage.getItem('alchemyShop_v2'); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function writeSave(s) {
  try {
    localStorage.setItem('alchemyShop_v2', JSON.stringify({
      gold: s.gold, herbs: s.herbs, mushrooms: s.mushrooms, crystals: s.crystals,
      inventory: s.inventory, upgrades: s.upgrades,
      totalEarned: s.totalEarned, day: s.day, reputation: s.reputation,
      prestige: s.prestige, prestigePoints: s.prestigePoints,
      completedQuests: s.completedQuests,
      herbsTotal: s.herbsTotal, crystalsTotal: s.crystalsTotal,
      brewPoison: s.brewPoison, brewElixir: s.brewElixir, brewed: s.brewed,
    }));
  } catch {}
}
function clearSave() { localStorage.removeItem('alchemyShop_v2'); }

// ── Recipes ───────────────────────────────────────────────────
const RECIPES = {
  health:     { id: 'health',     name: 'Health Potion',    icon: '❤️',  cost: { herbs: 1 },                             brewTime: 3000,  basePrice: 6,   desc: 'Basic healing brew',      color: '#ff4747' },
  speed:      { id: 'speed',      name: 'Speed Elixir',     icon: '💨',  cost: { herbs: 1, mushrooms: 1 },               brewTime: 5000,  basePrice: 14,  desc: 'Haste for the swift',     color: '#47c8ff' },
  strength:   { id: 'strength',   name: 'Strength Draught', icon: '💪',  cost: { herbs: 2, crystals: 1 },                brewTime: 7000,  basePrice: 22,  desc: 'Power beyond measure',    color: '#ff8c47' },
  poison:     { id: 'poison',     name: 'Venom Flask',      icon: '☠️',  cost: { mushrooms: 2 },                         brewTime: 4000,  basePrice: 11,  desc: 'Shady but profitable',    color: '#9bff47' },
  wisdom:     { id: 'wisdom',     name: 'Wisdom Tonic',     icon: '🔮',  cost: { herbs: 1, crystals: 2 },                brewTime: 9000,  basePrice: 32,  desc: 'Clarity of mind',         color: '#c47aff' },
  fire:       { id: 'fire',       name: 'Fire Essence',     icon: '🔥',  cost: { herbs: 2, mushrooms: 1, crystals: 1 },  brewTime: 11000, basePrice: 45,  desc: 'Explosive power',         color: '#ff6b47' },
  invisib:    { id: 'invisib',    name: 'Shadow Vial',      icon: '👻',  cost: { mushrooms: 3, crystals: 2 },            brewTime: 14000, basePrice: 65,  desc: 'Now you see me...',       color: '#888' },
  elixirLife: { id: 'elixirLife', name: 'Elixir of Life',   icon: '✨',  cost: { herbs: 3, mushrooms: 2, crystals: 3 }, brewTime: 20000, basePrice: 110, desc: 'The legendary brew',      color: '#ffd700' },
};

// ── Upgrades ──────────────────────────────────────────────────
const UPGRADES = [
  { id: 'autoStirrer',   cat: 'auto',    label: 'Auto-Stirrer',    cost: 35,   desc: 'Auto-brews health potions every 10s.',         icon: '⚙️' },
  { id: 'herbGarden',    cat: 'auto',    label: 'Herb Garden',     cost: 55,   desc: 'Grows 1 herb every 15s.',                      icon: '🌿' },
  { id: 'shroomFarm',    cat: 'auto',    label: 'Shroom Farm',     cost: 90,   desc: 'Grows 1 mushroom every 20s.',                  icon: '🍄' },
  { id: 'crystalMine',   cat: 'auto',    label: 'Crystal Mine',    cost: 180,  desc: 'Mines 1 crystal every 35s.',                   icon: '💎' },
  { id: 'masterStirrer', cat: 'auto',    label: 'Master Stirrer',  cost: 300,  desc: 'Auto-Stirrer brews twice as fast.',            icon: '🌀' },
  { id: 'fastBrewer',    cat: 'brew',    label: 'Quicken Brew',    cost: 70,   desc: 'All brew times cut by 35%.',                   icon: '⚡' },
  { id: 'doubleBatch',   cat: 'brew',    label: 'Double Batch',    cost: 140,  desc: 'Each brew yields 2 potions.',                  icon: '⚗️' },
  { id: 'masterBrewer',  cat: 'brew',    label: 'Master Brewer',   cost: 350,  desc: 'Brew times halved. Batch yields 3.',           icon: '🧙' },
  { id: 'haggling',      cat: 'market',  label: 'Haggling',        cost: 50,   desc: 'Herbs cost 1g less (min 1g).',                 icon: '🤝' },
  { id: 'doubleHerb',    cat: 'market',  label: 'Bulk Herbs',      cost: 80,   desc: 'Buy 3 herbs at once.',                         icon: '🌱' },
  { id: 'goldTouch',     cat: 'market',  label: 'Gold Touch',      cost: 110,  desc: '+3g on every potion sold.',                    icon: '✨' },
  { id: 'marketStall',   cat: 'market',  label: 'Market Stall',    cost: 200,  desc: '+6g on every potion sold.',                    icon: '🏪' },
  { id: 'auctionHouse',  cat: 'market',  label: 'Auction House',   cost: 500,  desc: 'Sell all potions at once at a 20% bonus.',     icon: '🏛️' },
  { id: 'cauldronXL',    cat: 'special', label: 'Cauldron XL',     cost: 250,  desc: 'Brew 2 different potions simultaneously.',     icon: '🫧' },
  { id: 'alchemyBook',   cat: 'special', label: 'Alchemy Tome',    cost: 400,  desc: 'Unlocks Fire Essence & Shadow Vial.',          icon: '📖' },
  { id: 'elixirSecret',  cat: 'special', label: 'Ancient Secret',  cost: 800,  desc: 'Unlocks the Elixir of Life.',                  icon: '🗝️' },
  { id: 'prestige',      cat: 'special', label: 'Ascend (Prestige)',cost: 2000, desc: 'Reset with +10% permanent gold bonus.',        icon: '🌟' },
];

const UPGRADE_CATS = [
  { id: 'auto',    label: '⚙️ Auto'    },
  { id: 'brew',    label: '⚗️ Brew'    },
  { id: 'market',  label: '🛒 Market'  },
  { id: 'special', label: '✨ Special' },
];

// ── Quests ────────────────────────────────────────────────────
const QUESTS = [
  { id: 'q1', label: 'First Brew',      desc: 'Brew your first potion.',             goal: { brewed: 1 },          reward: { gold: 10 } },
  { id: 'q2', label: 'Vendor',          desc: 'Earn 50g total.',                     goal: { totalEarned: 50 },    reward: { gold: 20, herbs: 5 } },
  { id: 'q3', label: 'Herbalist',       desc: 'Collect 20 herbs (bought or grown).',  goal: { herbsTotal: 20 },     reward: { gold: 15, mushrooms: 3 } },
  { id: 'q4', label: 'Poisoner',        desc: 'Brew 3 Venom Flasks.',                goal: { brewPoison: 3 },      reward: { gold: 30 } },
  { id: 'q5', label: 'Crystal Hoarder', desc: 'Collect 10 crystals.',                goal: { crystalsTotal: 10 },  reward: { gold: 40, crystals: 5 } },
  { id: 'q6', label: 'Industrialist',   desc: 'Own Auto-Stirrer + Herb Garden.',     goal: { ownAuto: true },      reward: { gold: 50 } },
  { id: 'q7', label: 'Century',         desc: 'Earn 100g total.',                    goal: { totalEarned: 100 },   reward: { gold: 50, mushrooms: 5 } },
  { id: 'q8', label: 'Legendary',       desc: 'Brew 1 Elixir of Life.',              goal: { brewElixir: 1 },      reward: { gold: 200, prestigePoints: 1 } },
  { id: 'q9', label: 'Tycoon',          desc: 'Earn 500g total.',                    goal: { totalEarned: 500 },   reward: { gold: 100, prestigePoints: 2 } },
];

// ── Customers ─────────────────────────────────────────────────
const CUSTOMER_TYPES = [
  { type: 'traveler', icon: '🧳', wants: ['health', 'speed'],           bonus: 1.0, label: 'Traveler'  },
  { type: 'warrior',  icon: '⚔️',  wants: ['health', 'strength'],        bonus: 1.1, label: 'Warrior'   },
  { type: 'mage',     icon: '🧝',  wants: ['wisdom', 'fire', 'invisib'], bonus: 1.3, label: 'Mage'      },
  { type: 'merchant', icon: '💼',  wants: ['health', 'speed', 'poison'], bonus: 1.2, label: 'Merchant'  },
  { type: 'noble',    icon: '👑',  wants: ['elixirLife', 'wisdom'],      bonus: 1.5, label: 'Noble'     },
];

function randCustomer() {
  const c = CUSTOMER_TYPES[Math.floor(Math.random() * CUSTOMER_TYPES.length)];
  const wants = c.wants[Math.floor(Math.random() * c.wants.length)];
  return { ...c, wants, id: Math.random() };
}

// ── Helpers ───────────────────────────────────────────────────
function calcBrewTime(recipe, upgrades) {
  let t = recipe.brewTime;
  if (upgrades.fastBrewer)   t *= 0.65;
  if (upgrades.masterBrewer) t *= 0.5;
  return Math.round(t);
}

function calcBatchSize(upgrades) {
  if (upgrades.masterBrewer) return 3;
  if (upgrades.doubleBatch)  return 2;
  return 1;
}

function calcSellPrice(recipe, upgrades, customer, prestige) {
  let p = recipe.basePrice;
  if (upgrades.goldTouch)   p += 3;
  if (upgrades.marketStall) p += 6;
  if (customer)             p = Math.round(p * customer.bonus);
  p = Math.round(p * (1 + (prestige || 0) * 0.1));
  return p;
}

function initState(save) {
  return {
    gold:           save?.gold           ?? 10,
    herbs:          save?.herbs          ?? 5,
    mushrooms:      save?.mushrooms      ?? 0,
    crystals:       save?.crystals       ?? 0,
    inventory:      save?.inventory      ?? {},
    upgrades:       save?.upgrades       ?? {},
    totalEarned:    save?.totalEarned    ?? 0,
    day:            save?.day            ?? 1,
    reputation:     save?.reputation     ?? 0,
    prestige:       save?.prestige       ?? 0,
    prestigePoints: save?.prestigePoints ?? 0,
    completedQuests:save?.completedQuests?? [],
    herbsTotal:     save?.herbsTotal     ?? 0,
    crystalsTotal:  save?.crystalsTotal  ?? 0,
    brewPoison:     save?.brewPoison     ?? 0,
    brewElixir:     save?.brewElixir     ?? 0,
    brewed:         save?.brewed         ?? 0,
    // ephemeral
    brews: [],
  };
}

// ── Component ─────────────────────────────────────────────────
export default function AlchemyShop({ navigate }) {
  const [state, setState]           = useState(() => initState(loadSave()));
  const [log, setLog]               = useState(['🧪 Welcome to your Alchemy Shop!']);
  const [herbPrice, setHerbPrice]   = useState(3);
  const [shroomPrice, setShroomP]   = useState(5);
  const [crystalPrice, setCrystalP] = useState(10);
  const [customer, setCustomer]     = useState(null);
  const [custTimer, setCustTimer]   = useState(0);
  const [upgradeCat, setUpgradeCat] = useState('auto');
  const [tab, setTab]               = useState('brew');
  const [tick, setTick]             = useState(0);  // force re-render for brew bars

  const stateRef   = useRef(state);
  const customerRef = useRef(customer);
  useEffect(() => { stateRef.current   = state;    }, [state]);
  useEffect(() => { customerRef.current = customer; }, [customer]);

  const addLog = useCallback((msg) => setLog(l => [msg, ...l].slice(0, 20)), []);

  // Re-render every 200ms to animate brew bars
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  // Auto-save every 5s via ref
  useEffect(() => {
    const id = setInterval(() => writeSave(stateRef.current), 5000);
    return () => clearInterval(id);
  }, []);

  // Brew completion checker
  useEffect(() => {
    const id = setInterval(() => {
      setState(s => {
        if (!s.brews.length) return s;
        const now = Date.now();
        const remaining = [];
        let ns = s;
        for (const brew of s.brews) {
          const recipe = RECIPES[brew.recipeId];
          const t = calcBrewTime(recipe, s.upgrades);
          if (now - brew.start >= t) {
            const qty = calcBatchSize(s.upgrades);
            const inv = { ...ns.inventory, [brew.recipeId]: (ns.inventory[brew.recipeId] || 0) + qty };
            ns = {
              ...ns,
              inventory: inv,
              brewed:     ns.brewed + qty,
              brewPoison: brew.recipeId === 'poison'     ? ns.brewPoison + qty : ns.brewPoison,
              brewElixir: brew.recipeId === 'elixirLife' ? ns.brewElixir + qty : ns.brewElixir,
            };
            addLog(`${recipe.icon} ${recipe.name} ready! (×${qty})`);
          } else {
            remaining.push(brew);
          }
        }
        if (ns === s) return s;
        return { ...ns, brews: remaining };
      });
    }, 150);
    return () => clearInterval(id);
  }, [addLog]);

  // Auto-stirrer
  useEffect(() => {
    if (!state.upgrades.autoStirrer) return;
    const ms = state.upgrades.masterStirrer ? 5000 : 10000;
    const id = setInterval(() => {
      setState(s => {
        if (s.herbs < 1) return s;
        const slots = s.upgrades.cauldronXL ? 2 : 1;
        if (s.brews.length >= slots) return s;
        addLog('⚙️ Auto-Stirrer started a health brew');
        return { ...s, herbs: s.herbs - 1, brews: [...s.brews, { recipeId: 'health', start: Date.now() }] };
      });
    }, ms);
    return () => clearInterval(id);
  }, [state.upgrades.autoStirrer, state.upgrades.masterStirrer, state.upgrades.cauldronXL, addLog]);

  // Herb garden
  useEffect(() => {
    if (!state.upgrades.herbGarden) return;
    const id = setInterval(() => {
      setState(s => ({ ...s, herbs: s.herbs + 1, herbsTotal: s.herbsTotal + 1 }));
      addLog('🌿 Garden grew an herb!');
    }, 15000);
    return () => clearInterval(id);
  }, [state.upgrades.herbGarden, addLog]);

  // Shroom farm
  useEffect(() => {
    if (!state.upgrades.shroomFarm) return;
    const id = setInterval(() => {
      setState(s => ({ ...s, mushrooms: s.mushrooms + 1 }));
      addLog('🍄 Farm grew a mushroom!');
    }, 20000);
    return () => clearInterval(id);
  }, [state.upgrades.shroomFarm, addLog]);

  // Crystal mine
  useEffect(() => {
    if (!state.upgrades.crystalMine) return;
    const id = setInterval(() => {
      setState(s => ({ ...s, crystals: s.crystals + 1, crystalsTotal: s.crystalsTotal + 1 }));
      addLog('💎 Mine yielded a crystal!');
    }, 35000);
    return () => clearInterval(id);
  }, [state.upgrades.crystalMine, addLog]);

  // Market prices
  useEffect(() => {
    const id = setInterval(() => {
      setHerbPrice(2 + Math.floor(Math.random() * 4));
      setShroomP(4 + Math.floor(Math.random() * 5));
      setCrystalP(8 + Math.floor(Math.random() * 8));
    }, 20000);
    return () => clearInterval(id);
  }, []);

  // Day cycle
  useEffect(() => {
    const id = setInterval(() => {
      setState(s => ({ ...s, day: s.day + 1 }));
      addLog(`🌅 Day ${stateRef.current.day + 1} — market prices updated!`);
      setHerbPrice(2 + Math.floor(Math.random() * 4));
      setShroomP(4 + Math.floor(Math.random() * 5));
      setCrystalP(8 + Math.floor(Math.random() * 8));
    }, 120000);
    return () => clearInterval(id);
  }, [addLog]);

  // Customer spawn
  useEffect(() => {
    const id = setInterval(() => {
      if (!customerRef.current) {
        const c = randCustomer();
        setCustomer(c);
        setCustTimer(30);
        addLog(`${c.icon} A ${c.label} wants ${RECIPES[c.wants]?.name}!`);
      }
    }, 25000);
    return () => clearInterval(id);
  }, [addLog]);

  // Customer countdown
  useEffect(() => {
    if (!customer) return;
    const id = setInterval(() => {
      setCustTimer(t => {
        if (t <= 1) {
          setCustomer(null);
          addLog('😤 Customer left without buying.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [customer, addLog]);

  // Quest checker
  useEffect(() => {
    const s = state;
    for (const q of QUESTS) {
      if (s.completedQuests.includes(q.id)) continue;
      const g = q.goal;
      let met = false;
      if (g.brewed        !== undefined && s.brewed        >= g.brewed)        met = true;
      if (g.totalEarned   !== undefined && s.totalEarned   >= g.totalEarned)   met = true;
      if (g.herbsTotal    !== undefined && s.herbsTotal    >= g.herbsTotal)     met = true;
      if (g.brewPoison    !== undefined && s.brewPoison    >= g.brewPoison)     met = true;
      if (g.crystalsTotal !== undefined && s.crystalsTotal >= g.crystalsTotal)  met = true;
      if (g.ownAuto       !== undefined && s.upgrades.autoStirrer && s.upgrades.herbGarden) met = true;
      if (g.brewElixir    !== undefined && s.brewElixir    >= g.brewElixir)     met = true;
      if (met) {
        const r = q.reward;
        setState(prev => ({
          ...prev,
          gold:           prev.gold           + (r.gold           || 0),
          herbs:          prev.herbs          + (r.herbs          || 0),
          mushrooms:      prev.mushrooms      + (r.mushrooms      || 0),
          crystals:       prev.crystals       + (r.crystals       || 0),
          prestigePoints: prev.prestigePoints + (r.prestigePoints || 0),
          completedQuests: [...prev.completedQuests, q.id],
        }));
        const rewardStr = Object.entries(r).map(([k, v]) => `+${v} ${k}`).join(', ');
        addLog(`🏆 Quest done: "${q.label}"! → ${rewardStr}`);
      }
    }
  
  }, [state.brewed, state.totalEarned, state.herbsTotal, state.brewPoison,
      state.crystalsTotal, state.brewElixir, state.upgrades.autoStirrer, state.upgrades.herbGarden]);

  // ── Actions ───────────────────────────────────────────────────
  const startBrew = useCallback((recipeId) => {
    setState(s => {
      const recipe = RECIPES[recipeId];
      const slots = s.upgrades.cauldronXL ? 2 : 1;
      if (s.brews.length >= slots) return s;
      const cost = recipe.cost;
      if ((cost.herbs || 0) > s.herbs || (cost.mushrooms || 0) > s.mushrooms || (cost.crystals || 0) > s.crystals) return s;
      addLog(`🧪 Brewing ${recipe.name}...`);
      return {
        ...s,
        herbs:     s.herbs     - (cost.herbs     || 0),
        mushrooms: s.mushrooms - (cost.mushrooms || 0),
        crystals:  s.crystals  - (cost.crystals  || 0),
        brews: [...s.brews, { recipeId, start: Date.now() }],
      };
    });
  }, [addLog]);

  const sellPotion = useCallback((recipeId, cust) => {
    setState(s => {
      const recipe = RECIPES[recipeId];
      if (!recipe || !(s.inventory[recipeId] > 0)) return s;
      const price = calcSellPrice(recipe, s.upgrades, cust || null, s.prestige);
      addLog(`💰 Sold ${recipe.name} for ${price}g${cust ? ' (customer bonus!)' : ''}`);
      if (cust) setCustomer(null);
      return {
        ...s,
        inventory:   { ...s.inventory, [recipeId]: s.inventory[recipeId] - 1 },
        gold:        s.gold + price,
        totalEarned: s.totalEarned + price,
        reputation:  cust ? s.reputation + 1 : s.reputation,
      };
    });
  }, [addLog]);

  const sellAll = useCallback(() => {
    setState(s => {
      if (!s.upgrades.auctionHouse) return s;
      let earned = 0;
      const inv = { ...s.inventory };
      for (const [rid, qty] of Object.entries(inv)) {
        if (!qty) continue;
        const recipe = RECIPES[rid];
        if (!recipe) continue;
        earned += Math.round(calcSellPrice(recipe, s.upgrades, null, s.prestige) * qty * 1.2);
        inv[rid] = 0;
      }
      if (!earned) return s;
      addLog(`🏛️ Auction House: sold everything for ${earned}g (+20%)!`);
      return { ...s, inventory: inv, gold: s.gold + earned, totalEarned: s.totalEarned + earned };
    });
  }, [addLog]);

  const buyIngredient = useCallback((type, price) => {
    setState(s => {
      if (s.gold < price) return s;
      let count = 1;
      if (type === 'herbs' && s.upgrades.doubleHerb) count = 3;
      const icon = { herbs: '🌿', mushrooms: '🍄', crystals: '💎' }[type];
      addLog(`${icon} Bought ${count}× ${type} for ${price}g`);
      return {
        ...s,
        gold:         s.gold - price,
        [type]:       s[type] + count,
        herbsTotal:    type === 'herbs'    ? s.herbsTotal    + count : s.herbsTotal,
        crystalsTotal: type === 'crystals' ? s.crystalsTotal + count : s.crystalsTotal,
      };
    });
  }, [addLog]);

  const buyUpgrade = useCallback((id) => {
    const upg = UPGRADES.find(u => u.id === id);
    if (!upg) return;
    if (id === 'prestige') {
      setState(s => {
        if (s.gold < upg.cost) return s;
        const fresh = { ...initState(null), prestige: s.prestige + 1, prestigePoints: s.prestigePoints + 1 };
        clearSave();
        stateRef.current = fresh;
        addLog(`🌟 PRESTIGE! Ascending to Prestige #${fresh.prestige}. +10% gold bonus active!`);
        return fresh;
      });
      return;
    }
    setState(s => {
      if (s.gold < upg.cost || s.upgrades[id]) return s;
      addLog(`🔮 Unlocked: ${upg.label}!`);
      return { ...s, gold: s.gold - upg.cost, upgrades: { ...s.upgrades, [id]: true } };
    });
  }, [addLog]);

  const resetGame = useCallback(() => {
    const fresh = initState(null);
    clearSave();
    stateRef.current = fresh;
    setState(fresh);
    setCustomer(null);
    setLog(['🧪 Shop reset. Starting fresh!']);
  }, []);

  // ── Derived ───────────────────────────────────────────────────
  const { gold, herbs, mushrooms, crystals, inventory, upgrades, totalEarned,
          day, reputation, prestige, prestigePoints, brews, completedQuests } = state;
  const slots     = upgrades.cauldronXL ? 2 : 1;
  const totalInv  = Object.values(inventory).reduce((a, b) => a + b, 0);
  const effHerbP  = upgrades.haggling ? Math.max(1, herbPrice - 1) : herbPrice;

  function recipeUnlocked(id) {
    if (['health','speed','strength','poison','wisdom'].includes(id)) return true;
    if (['fire','invisib'].includes(id))  return !!upgrades.alchemyBook;
    if (id === 'elixirLife')              return !!upgrades.elixirSecret;
    return false;
  }

  function canAffordBrew(recipe) {
    const c = recipe.cost;
    return (c.herbs||0) <= herbs && (c.mushrooms||0) <= mushrooms && (c.crystals||0) <= crystals;
  }

  const visUpgrades = UPGRADES.filter(u => {
    if (u.id === 'prestige') return totalEarned >= 800;
    if (upgrades[u.id])      return true;
    if (u.cat === 'special') return totalEarned >= u.cost * 0.3;
    return totalEarned >= u.cost * 0.2 || gold >= u.cost * 0.4;
  }).filter(u => u.cat === upgradeCat);

  function getBrewPct(brew) {
    const t = calcBrewTime(RECIPES[brew.recipeId], upgrades);
    return Math.min(100, ((Date.now() - brew.start) / t) * 100);
  }

  return (
    <div className="alc-wrap">
      {/* Header */}
      <div className="alc-header">
        <button className="alc-back" onClick={() => navigate('home')}>← BACK</button>
        <div className="alc-title-row">
          <span className="alc-tag">// ALCHEMY SHOP</span>
          <span className="alc-day">Day {day}</span>
          {prestige > 0 && <span className="alc-prestige-badge">⭐ Prestige {prestige}</span>}
        </div>
      </div>

      {/* Resources Bar */}
      <div className="alc-resources">
        {[['🪙','GOLD',gold],['🌿','HERBS',herbs],['🍄','SHROOMS',mushrooms],
          ['💎','CRYSTALS',crystals],['🧪','POTIONS',totalInv],
          ['⭐','REP',reputation],['📈','EARNED',`${totalEarned}g`]].map(([icon,label,val]) => (
          <div key={label} className="alc-res">
            <span className="alc-res-icon">{icon}</span>
            <div><div className="alc-res-label">{label}</div><div className="alc-res-val">{val}</div></div>
          </div>
        ))}
        {prestigePoints > 0 && (
          <div className="alc-res prestige-res">
            <span className="alc-res-icon">🏅</span>
            <div><div className="alc-res-label">P.POINTS</div><div className="alc-res-val">{prestigePoints}</div></div>
          </div>
        )}
      </div>

      {/* Customer Banner */}
      {customer && (
        <div className="alc-customer">
          <span className="alc-cust-icon">{customer.icon}</span>
          <div className="alc-cust-info">
            <span className="alc-cust-label">{customer.label} wants:</span>
            <span className="alc-cust-want">{RECIPES[customer.wants]?.icon} {RECIPES[customer.wants]?.name}</span>
            <span className="alc-cust-bonus">+{Math.round((customer.bonus-1)*100)}% price!</span>
          </div>
          <div className="alc-cust-right">
            <div className="alc-cust-timer-wrap">
              <div className="alc-cust-timer-bar" style={{ width: `${(custTimer/30)*100}%` }} />
              <span className="alc-cust-secs">{custTimer}s</span>
            </div>
            {(inventory[customer.wants] > 0) && (
              <button className="alc-btn success small" onClick={() => sellPotion(customer.wants, customer)}>
                SELL {RECIPES[customer.wants]?.icon}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Brews */}
      {brews.length > 0 && (
        <div className="alc-active-brews">
          {brews.map((brew, i) => {
            const recipe = RECIPES[brew.recipeId];
            const pct = getBrewPct(brew);
            return (
              <div key={i} className="alc-brew-active">
                <span className="alc-brew-active-icon">{recipe.icon}</span>
                <span className="alc-brew-active-name">{recipe.name}</span>
                <div className="alc-brew-bar-wrap">
                  <div className="alc-brew-bar" style={{ width: `${pct}%`, background: recipe.color }} />
                </div>
                <span className="alc-brew-pct">{Math.round(pct)}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="alc-tabs">
        {[['brew','⚗️ Brew'],['market','🛒 Market'],['upgrades','🔮 Upgrades'],['quests','📜 Quests']].map(([id,label]) => (
          <button key={id} className={`alc-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className="alc-body">

        {/* BREW TAB */}
        {tab === 'brew' && (
          <div className="alc-brew-section">
            <div className="alc-brew-slots-label">
              Cauldron slots: {brews.length}/{slots}
              {upgrades.doubleBatch && <span className="alc-batch-tag"> ×{calcBatchSize(upgrades)} per brew</span>}
            </div>
            <div className="alc-brew-grid">
              {Object.values(RECIPES).map(recipe => {
                const unlocked   = recipeUnlocked(recipe.id);
                const affordable = canAffordBrew(recipe);
                const qty        = inventory[recipe.id] || 0;
                const price      = calcSellPrice(recipe, upgrades, null, prestige);
                const isBrewing  = brews.some(b => b.recipeId === recipe.id);
                return (
                  <div key={recipe.id}
                       className={`alc-recipe-card ${!unlocked?'locked':''} ${isBrewing?'brewing-card':''}`}
                       style={{ '--rc': recipe.color }}>
                    <div className="alc-recipe-header">
                      <span className="alc-recipe-emoji">{unlocked ? recipe.icon : '🔒'}</span>
                      <div>
                        <div className="alc-recipe-name">{recipe.name}</div>
                        <div className="alc-recipe-desc">{unlocked ? recipe.desc : 'Unlock with upgrade'}</div>
                      </div>
                    </div>
                    {unlocked && (
                      <>
                        <div className="alc-recipe-cost">
                          {Object.entries(recipe.cost).map(([mat, n]) => {
                            const have = mat === 'herbs' ? herbs : mat === 'mushrooms' ? mushrooms : crystals;
                            return (
                              <span key={mat} className={`alc-mat-tag ${have < n ? 'short' : ''}`}>
                                {mat==='herbs'?'🌿':mat==='mushrooms'?'🍄':'💎'} ×{n}
                              </span>
                            );
                          })}
                          <span className="alc-mat-tag sell-tag">→ {price}g</span>
                        </div>
                        <div className="alc-recipe-footer">
                          <span className="alc-recipe-stock">Stock: {qty}</span>
                          <button className="alc-btn primary small"
                                  disabled={!affordable || brews.length >= slots}
                                  onClick={() => startBrew(recipe.id)}>BREW</button>
                          <button className="alc-btn success small"
                                  disabled={qty < 1}
                                  onClick={() => sellPotion(recipe.id)}>SELL +{price}g</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {upgrades.auctionHouse && totalInv > 0 && (
              <button className="alc-sell-all" onClick={sellAll}>
                🏛️ SELL ALL ({totalInv} potions) · +20% Auction bonus
              </button>
            )}
          </div>
        )}

        {/* MARKET TAB */}
        {tab === 'market' && (
          <div className="alc-market">
            <div className="alc-market-note">💡 Prices shift every 20s and each new day.</div>
            <div className="alc-market-section-title">BUY INGREDIENTS</div>
            {[
              { type:'herbs',     icon:'🌿', label:'Herbs',     price:effHerbP,   extra: upgrades.doubleHerb ? '(×3 with Bulk upgrade)' : '' },
              { type:'mushrooms', icon:'🍄', label:'Mushrooms', price:shroomPrice, extra:'' },
              { type:'crystals',  icon:'💎', label:'Crystals',  price:crystalPrice,extra:'' },
            ].map(({ type, icon, label, price, extra }) => (
              <div key={type} className="alc-market-row">
                <span className="alc-market-icon">{icon}</span>
                <div className="alc-market-info">
                  <div className="alc-market-name">{label} <span className="alc-market-have">({state[type]} owned)</span></div>
                  <div className="alc-market-price">{price}g each {extra && <span className="alc-market-extra">{extra}</span>}</div>
                </div>
                <button className={`alc-btn primary ${gold<price?'':'lit'}`}
                        disabled={gold<price}
                        onClick={() => buyIngredient(type, price)}>
                  BUY {price}g
                </button>
              </div>
            ))}

            {totalInv > 0 && (
              <>
                <div className="alc-market-section-title">SELL POTIONS</div>
                {Object.entries(inventory).filter(([,qty]) => qty > 0).map(([rid, qty]) => {
                  const recipe = RECIPES[rid];
                  if (!recipe) return null;
                  const price = calcSellPrice(recipe, upgrades, null, prestige);
                  const custMatch = customer?.wants === rid;
                  const custPrice = custMatch ? calcSellPrice(recipe, upgrades, customer, prestige) : null;
                  return (
                    <div key={rid} className={`alc-market-row ${custMatch?'cust-match':''}`}>
                      <span className="alc-market-icon">{recipe.icon}</span>
                      <div className="alc-market-info">
                        <div className="alc-market-name">{recipe.name} <span className="alc-market-have">(×{qty})</span></div>
                        <div className="alc-market-price">
                          {price}g each
                          {custMatch && <span className="alc-cust-price"> · Customer: {custPrice}g!</span>}
                        </div>
                      </div>
                      <div className="alc-sell-btns">
                        <button className="alc-btn success small" onClick={() => sellPotion(rid)}>+{price}g</button>
                        {custMatch && (
                          <button className="alc-btn special small" onClick={() => sellPotion(rid, customer)}>
                            ★ {custPrice}g
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {upgrades.auctionHouse && (
                  <button className="alc-sell-all" onClick={sellAll}>
                    🏛️ SELL ALL {totalInv} potions · +20% Auction bonus
                  </button>
                )}
              </>
            )}
            {totalInv === 0 && <div className="alc-empty">No potions in stock. Brew some first!</div>}
          </div>
        )}

        {/* UPGRADES TAB */}
        {tab === 'upgrades' && (
          <div className="alc-upgrades-wrap">
            <div className="alc-upg-cats">
              {UPGRADE_CATS.map(cat => (
                <button key={cat.id}
                        className={`alc-upg-cat-btn ${upgradeCat===cat.id?'active':''}`}
                        onClick={() => setUpgradeCat(cat.id)}>{cat.label}</button>
              ))}
            </div>
            <div className="alc-upgrades-list">
              {visUpgrades.length === 0 && <div className="alc-empty">Earn more gold to reveal upgrades in this category.</div>}
              {visUpgrades.map(upg => {
                const owned      = !!upgrades[upg.id];
                const affordable = gold >= upg.cost;
                return (
                  <div key={upg.id} className={`alc-upgrade ${owned?'owned':''} ${affordable&&!owned?'affordable':''}`}>
                    <span className="alc-upg-icon">{upg.icon}</span>
                    <div className="alc-upg-info">
                      <div className="alc-upg-name">{upg.label}</div>
                      <div className="alc-upg-desc">{upg.desc}</div>
                    </div>
                    {owned
                      ? <span className="alc-upg-owned">✓</span>
                      : <button className={`alc-btn small ${affordable?'primary':''}`}
                                disabled={!affordable} onClick={() => buyUpgrade(upg.id)}>
                          {upg.cost}g
                        </button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUESTS TAB */}
        {tab === 'quests' && (
          <div className="alc-quests">
            <div className="alc-quests-progress">{completedQuests.length}/{QUESTS.length} completed</div>
            {QUESTS.map(q => {
              const done = completedQuests.includes(q.id);
              return (
                <div key={q.id} className={`alc-quest ${done?'done':''}`}>
                  <div className="alc-quest-check">{done ? '✅' : '🔲'}</div>
                  <div className="alc-quest-body">
                    <div className="alc-quest-name">{q.label}</div>
                    <div className="alc-quest-desc">{q.desc}</div>
                  </div>
                  <div className="alc-quest-reward">
                    {Object.entries(q.reward).map(([k,v]) => (
                      <span key={k} className="alc-quest-rew">+{v} {k}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Log Panel */}
        <div className="alc-log-panel">
          <div className="alc-log-title">EVENT LOG</div>
          <div className="alc-log">
            {log.map((entry, i) => (
              <div key={i} className={`alc-log-entry ${i===0?'fresh':''}`}>{entry}</div>
            ))}
          </div>
          <button className="alc-reset-btn" onClick={resetGame}>RESET SAVE</button>
        </div>
      </div>
    </div>
  );
}
