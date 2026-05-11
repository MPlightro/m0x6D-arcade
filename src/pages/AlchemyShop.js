import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './AlchemyShop.css';

// ── Persistence ──────────────────────────────────────────────────────────────
const SAVE_KEY = 'alchemyShop_v3';
function loadSave() {
  try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function writeSave(s) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      gold: s.gold, herbs: s.herbs, mushrooms: s.mushrooms, crystals: s.crystals,
      essences: s.essences, inventory: s.inventory, upgrades: s.upgrades,
      totalEarned: s.totalEarned, lifetimeEarned: s.lifetimeEarned,
      day: s.day, reputation: s.reputation, prestige: s.prestige,
      prestigePoints: s.prestigePoints, completedQuests: s.completedQuests,
      herbsTotal: s.herbsTotal, crystalsTotal: s.crystalsTotal,
      brewPoison: s.brewPoison, brewElixir: s.brewElixir, brewed: s.brewed,
      totalBrews: s.totalBrews, totalSells: s.totalSells,
    }));
  } catch {}
}
function clearSave() { localStorage.removeItem(SAVE_KEY); }

// ── Recipes: prestige=0 available from start, prestige=N requires N prestiges ─
const RECIPES = [
  // Prestige 0 – available from the start
  { id:'health',     name:'Health Potion',     icon:'❤️',  cost:{ herbs:1 },                             brewTime:3000,  basePrice:6,   desc:'Basic healing brew',         color:'#ff4747', prestige:0 },
  { id:'poison',     name:'Venom Flask',       icon:'☠️',  cost:{ mushrooms:2 },                         brewTime:4000,  basePrice:11,  desc:'Shady but profitable',       color:'#9bff47', prestige:0 },
  { id:'speed',      name:'Speed Elixir',      icon:'💨',  cost:{ herbs:1, mushrooms:1 },                brewTime:5000,  basePrice:15,  desc:'Haste for the swift',        color:'#47c8ff', prestige:0 },
  { id:'strength',   name:'Strength Draught',  icon:'💪',  cost:{ herbs:2, crystals:1 },                 brewTime:7000,  basePrice:24,  desc:'Power beyond measure',       color:'#ff8c47', prestige:0 },
  { id:'wisdom',     name:'Wisdom Tonic',      icon:'🔮',  cost:{ herbs:1, crystals:2 },                 brewTime:9000,  basePrice:34,  desc:'Clarity of mind',            color:'#c47aff', prestige:0 },
  // Upgrade-gated (still prestige 0, but need alchemyBook / elixirSecret)
  { id:'fire',       name:'Fire Essence',      icon:'🔥',  cost:{ herbs:2, mushrooms:1, crystals:1 },    brewTime:11000, basePrice:48,  desc:'Explosive power',            color:'#ff6b47', prestige:0, requiresUpgrade:'alchemyBook' },
  { id:'invisib',    name:'Shadow Vial',       icon:'👻',  cost:{ mushrooms:3, crystals:2 },             brewTime:14000, basePrice:68,  desc:'Now you see me…',            color:'#aaa',    prestige:0, requiresUpgrade:'alchemyBook' },
  { id:'elixirLife', name:'Elixir of Life',    icon:'✨',  cost:{ herbs:3, mushrooms:2, crystals:3 },    brewTime:20000, basePrice:115, desc:'The legendary brew',         color:'#ffd700', prestige:0, requiresUpgrade:'elixirSecret' },
  // Prestige 1 unlocks
  { id:'starDust',   name:'Stardust Vial',     icon:'🌟',  cost:{ herbs:2, essences:1 },                 brewTime:8000,  basePrice:55,  desc:'Bottled starlight',          color:'#c8aaff', prestige:1 },
  { id:'moonWater',  name:'Moonwater',         icon:'🌙',  cost:{ crystals:2, essences:1 },              brewTime:10000, basePrice:75,  desc:'Drawn from lunar springs',   color:'#aaddff', prestige:1 },
  { id:'bloodRage',  name:'Bloodrage Tonic',   icon:'💢',  cost:{ herbs:1, mushrooms:2, essences:1 },    brewTime:13000, basePrice:90,  desc:'Berserker\'s brew',          color:'#cc2222', prestige:1 },
  // Prestige 2 unlocks
  { id:'voidEssence',name:'Void Essence',      icon:'🌀',  cost:{ mushrooms:3, crystals:2, essences:2 }, brewTime:18000, basePrice:145, desc:'Darkness distilled',         color:'#6622cc', prestige:2 },
  { id:'timeFlask',  name:'Temporal Flask',    icon:'⏳',  cost:{ herbs:3, crystals:3, essences:2 },     brewTime:22000, basePrice:190, desc:'Bends time itself',          color:'#22ccaa', prestige:2 },
  // Prestige 3 unlocks
  { id:'soulPotion', name:'Soul Potion',       icon:'👁️',  cost:{ herbs:4, mushrooms:3, crystals:4, essences:3 }, brewTime:30000, basePrice:280, desc:'Contains a bound soul',   color:'#ffaa00', prestige:3 },
  { id:'cosmicBrew', name:'Cosmic Brew',       icon:'🌌',  cost:{ herbs:5, mushrooms:4, crystals:4, essences:4 }, brewTime:40000, basePrice:400, desc:'The universe in a bottle', color:'#4455ff', prestige:3 },
];

// ── Upgrades: minPrestige = prestige level required to see/buy ────────────────
const UPGRADES = [
  // Auto – prestige 0
  { id:'autoStirrer',   cat:'auto',    label:'Auto-Stirrer',      cost:35,   desc:'Auto-brews health potions every 10s.',          icon:'⚙️',  minPrestige:0 },
  { id:'herbGarden',    cat:'auto',    label:'Herb Garden',       cost:55,   desc:'Grows 1 herb every 15s.',                       icon:'🌿',  minPrestige:0 },
  { id:'shroomFarm',    cat:'auto',    label:'Shroom Farm',       cost:90,   desc:'Grows 1 mushroom every 20s.',                   icon:'🍄',  minPrestige:0 },
  { id:'crystalMine',   cat:'auto',    label:'Crystal Mine',      cost:180,  desc:'Mines 1 crystal every 35s.',                    icon:'💎',  minPrestige:0 },
  { id:'masterStirrer', cat:'auto',    label:'Master Stirrer',    cost:300,  desc:'Auto-Stirrer brews twice as fast.',             icon:'🌀',  minPrestige:0 },
  // Auto – prestige 1+
  { id:'essenceWell',   cat:'auto',    label:'Essence Well',      cost:400,  desc:'Generates 1 Essence every 45s.',                icon:'💧',  minPrestige:1 },
  { id:'spiritLoom',    cat:'auto',    label:'Spirit Loom',       cost:700,  desc:'Auto-brews Stardust Vials every 25s.',          icon:'🪡',  minPrestige:1 },
  // Auto – prestige 2+
  { id:'voidCollector', cat:'auto',    label:'Void Collector',    cost:1200, desc:'Essence Well generates 2× essences.',           icon:'🌀',  minPrestige:2 },
  // Brew – prestige 0
  { id:'fastBrewer',    cat:'brew',    label:'Quicken Brew',      cost:70,   desc:'All brew times cut by 35%.',                    icon:'⚡',  minPrestige:0 },
  { id:'doubleBatch',   cat:'brew',    label:'Double Batch',      cost:140,  desc:'Each brew yields 2 potions.',                   icon:'⚗️',  minPrestige:0 },
  { id:'masterBrewer',  cat:'brew',    label:'Master Brewer',     cost:350,  desc:'Brew times halved. Each batch yields 3.',       icon:'🧙',  minPrestige:0 },
  // Brew – prestige 1+
  { id:'parallelCaul',  cat:'brew',    label:'Twin Cauldrons',    cost:600,  desc:'3 simultaneous brew slots.',                    icon:'🪄',  minPrestige:1 },
  { id:'masterCraft',   cat:'brew',    label:'Master Craft',      cost:1500, desc:'Brew times cut by additional 25%.',             icon:'🏺',  minPrestige:2 },
  // Market – prestige 0
  { id:'haggling',      cat:'market',  label:'Haggling',          cost:50,   desc:'Herbs cost 1g less (min 1g).',                  icon:'🤝',  minPrestige:0 },
  { id:'doubleHerb',    cat:'market',  label:'Bulk Herbs',        cost:80,   desc:'Buy 3 herbs at once.',                          icon:'🌱',  minPrestige:0 },
  { id:'goldTouch',     cat:'market',  label:'Gold Touch',        cost:110,  desc:'+3g on every potion sold.',                     icon:'✨',  minPrestige:0 },
  { id:'marketStall',   cat:'market',  label:'Market Stall',      cost:200,  desc:'+6g on every potion sold.',                     icon:'🏪',  minPrestige:0 },
  { id:'auctionHouse',  cat:'market',  label:'Auction House',     cost:500,  desc:'Sell all potions at +20% bonus.',               icon:'🏛️',  minPrestige:0 },
  // Market – prestige 1+
  { id:'blackMarket',   cat:'market',  label:'Black Market',      cost:800,  desc:'Exotic ingredient deals: 20% cheaper shrooms.', icon:'🕶️',  minPrestige:1 },
  { id:'priceGouging',  cat:'market',  label:'Price Gouging',     cost:1800, desc:'+15g on every potion sold.',                    icon:'💰',  minPrestige:2 },
  // Special – prestige 0
  { id:'cauldronXL',    cat:'special', label:'Cauldron XL',       cost:250,  desc:'2 simultaneous brew slots.',                    icon:'🫧',  minPrestige:0 },
  { id:'alchemyBook',   cat:'special', label:'Alchemy Tome',      cost:400,  desc:'Unlocks Fire Essence & Shadow Vial.',           icon:'📖',  minPrestige:0 },
  { id:'elixirSecret',  cat:'special', label:'Ancient Secret',    cost:800,  desc:'Unlocks the Elixir of Life.',                   icon:'🗝️',  minPrestige:0 },
  // Special – prestige 1+
  { id:'starChart',     cat:'special', label:'Star Chart',        cost:1000, desc:'Unlocks all Prestige 1 recipes.',               icon:'🗺️',  minPrestige:1 },
  { id:'voidGrimoire',  cat:'special', label:'Void Grimoire',     cost:2500, desc:'Unlocks all Prestige 2 recipes.',               icon:'📕',  minPrestige:2 },
  { id:'cosmicCodex',   cat:'special', label:'Cosmic Codex',      cost:5000, desc:'Unlocks all Prestige 3 recipes.',               icon:'📚',  minPrestige:3 },
];

const UPGRADE_CATS = [
  { id:'auto',    label:'⚙️ Auto'    },
  { id:'brew',    label:'⚗️ Brew'    },
  { id:'market',  label:'🛒 Market'  },
  { id:'special', label:'✨ Special' },
];

// ── Quests ────────────────────────────────────────────────────────────────────
const QUESTS = [
  { id:'q1',  label:'First Brew',      desc:'Brew your first potion.',                    goal:{ brewed:1 },            reward:{ gold:10 },                     minPrestige:0 },
  { id:'q2',  label:'Vendor',          desc:'Earn 50g total this run.',                   goal:{ totalEarned:50 },      reward:{ gold:20, herbs:5 },             minPrestige:0 },
  { id:'q3',  label:'Herbalist',       desc:'Collect 20 herbs.',                          goal:{ herbsTotal:20 },       reward:{ gold:15, mushrooms:3 },         minPrestige:0 },
  { id:'q4',  label:'Poisoner',        desc:'Brew 3 Venom Flasks.',                       goal:{ brewPoison:3 },        reward:{ gold:30 },                     minPrestige:0 },
  { id:'q5',  label:'Crystal Hoarder', desc:'Collect 10 crystals.',                       goal:{ crystalsTotal:10 },    reward:{ gold:40, crystals:5 },          minPrestige:0 },
  { id:'q6',  label:'Industrialist',   desc:'Own Auto-Stirrer + Herb Garden.',            goal:{ ownAuto:true },        reward:{ gold:50 },                     minPrestige:0 },
  { id:'q7',  label:'Century',         desc:'Earn 100g this run.',                        goal:{ totalEarned:100 },     reward:{ gold:50, mushrooms:5 },         minPrestige:0 },
  { id:'q8',  label:'Legendary',       desc:'Brew 1 Elixir of Life.',                     goal:{ brewElixir:1 },        reward:{ gold:200, prestigePoints:1 },   minPrestige:0 },
  { id:'q9',  label:'Tycoon',          desc:'Earn 500g this run.',                        goal:{ totalEarned:500 },     reward:{ gold:100, prestigePoints:2 },   minPrestige:0 },
  { id:'q10', label:'Star Gazer',      desc:'Brew 5 Stardust Vials.',                     goal:{ brewStar:5 },          reward:{ gold:300, essences:3 },         minPrestige:1 },
  { id:'q11', label:'Void Walker',     desc:'Brew 3 Void Essences.',                      goal:{ brewVoid:3 },          reward:{ gold:500, prestigePoints:1 },   minPrestige:2 },
  { id:'q12', label:'Cosmic',          desc:'Brew 1 Cosmic Brew.',                        goal:{ brewCosmic:1 },        reward:{ gold:1000, prestigePoints:3 },  minPrestige:3 },
  { id:'q13', label:'Grandmaster',     desc:'Earn 2000g in a single run.',                goal:{ totalEarned:2000 },    reward:{ gold:500, prestigePoints:5 },   minPrestige:1 },
  { id:'q14', label:'Eternal',         desc:'Complete 5 prestiges.',                      goal:{ prestige:5 },          reward:{ gold:0, prestigePoints:10 },    minPrestige:4 },
];

// ── Customers ─────────────────────────────────────────────────────────────────
const CUSTOMER_TYPES = [
  { type:'traveler', icon:'🧳', wants:['health','speed'],                 bonus:1.0,  label:'Traveler',  tip:10  },
  { type:'warrior',  icon:'⚔️',  wants:['health','strength','bloodRage'], bonus:1.15, label:'Warrior',   tip:15  },
  { type:'mage',     icon:'🧝',  wants:['wisdom','fire','invisib','moonWater'], bonus:1.3, label:'Mage', tip:20  },
  { type:'merchant', icon:'💼',  wants:['health','speed','poison'],       bonus:1.2,  label:'Merchant',  tip:18  },
  { type:'noble',    icon:'👑',  wants:['elixirLife','wisdom','starDust'],bonus:1.5,  label:'Noble',     tip:30  },
  { type:'demon',    icon:'😈',  wants:['voidEssence','bloodRage','soulPotion'], bonus:1.8, label:'Demon', tip:50 },
  { type:'angel',    icon:'😇',  wants:['elixirLife','moonWater','cosmicBrew'],  bonus:2.0, label:'Angel', tip:80 },
];

// ── Market events ─────────────────────────────────────────────────────────────
const MARKET_EVENTS = [
  { msg:'⚡ Lightning! Herbs spoiled — prices spike.', herb:+2, shroom:0,  crystal:0 },
  { msg:'🌧️ Good rains — herbs abundant and cheap.',    herb:-1, shroom:0,  crystal:0 },
  { msg:'🧟 Plague outbreak! Potions in high demand.',  herb:0,  shroom:0,  crystal:0, demandBonus:1.4 },
  { msg:'💎 Crystal vein found! Crystals cheaper.',     herb:0,  shroom:0,  crystal:-2 },
  { msg:'🍄 Strange spores — mushrooms everywhere.',    herb:0,  shroom:-2, crystal:0 },
  { msg:'🏰 Royal decree: double potion taxes.',       herb:0,  shroom:0,  crystal:0, taxRate:0.8 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcBrewTime(recipe, upgrades) {
  let t = recipe.brewTime;
  if (upgrades.fastBrewer)   t *= 0.65;
  if (upgrades.masterBrewer) t *= 0.50;
  if (upgrades.masterCraft)  t *= 0.75;
  return Math.round(t);
}
function calcBatchSize(upgrades) {
  if (upgrades.masterBrewer) return 3;
  if (upgrades.doubleBatch)  return 2;
  return 1;
}
function calcSellPrice(recipe, upgrades, customerBonus, prestige, eventMult) {
  let p = recipe.basePrice;
  if (upgrades.goldTouch)    p += 3;
  if (upgrades.marketStall)  p += 6;
  if (upgrades.priceGouging) p += 15;
  p = Math.round(p * (1 + (prestige || 0) * 0.10));
  if (customerBonus) p = Math.round(p * customerBonus);
  if (eventMult)     p = Math.round(p * eventMult);
  return p;
}
function calcAscendCost(prestige) {
  // 2000 base, ×2.2 each time: 2000, 4400, 9680, 21296…
  return Math.round(2000 * Math.pow(2.2, prestige));
}
function calcBrewSlots(upgrades) {
  if (upgrades.parallelCaul) return 3;
  if (upgrades.cauldronXL)   return 2;
  return 1;
}

function initState(save) {
  return {
    gold:            save?.gold            ?? 10,
    herbs:           save?.herbs           ?? 5,
    mushrooms:       save?.mushrooms       ?? 0,
    crystals:        save?.crystals        ?? 0,
    essences:        save?.essences        ?? 0,
    inventory:       save?.inventory       ?? {},
    upgrades:        save?.upgrades        ?? {},
    totalEarned:     save?.totalEarned     ?? 0,
    lifetimeEarned:  save?.lifetimeEarned  ?? 0,
    day:             save?.day             ?? 1,
    reputation:      save?.reputation      ?? 0,
    prestige:        save?.prestige        ?? 0,
    prestigePoints:  save?.prestigePoints  ?? 0,
    completedQuests: save?.completedQuests ?? [],
    herbsTotal:      save?.herbsTotal      ?? 0,
    crystalsTotal:   save?.crystalsTotal   ?? 0,
    brewPoison:      save?.brewPoison      ?? 0,
    brewElixir:      save?.brewElixir      ?? 0,
    brewStar:        save?.brewStar        ?? 0,
    brewVoid:        save?.brewVoid        ?? 0,
    brewCosmic:      save?.brewCosmic      ?? 0,
    brewed:          save?.brewed          ?? 0,
    totalBrews:      save?.totalBrews      ?? 0,
    totalSells:      save?.totalSells      ?? 0,
    // ephemeral
    brews: [],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AlchemyShop({ navigate }) {
  const [state, setState]           = useState(() => initState(loadSave()));
  const [log, setLog]               = useState(['🧪 Welcome back, Alchemist.']);
  const [herbPrice, setHerbPrice]   = useState(3);
  const [shroomPrice, setShroomP]   = useState(5);
  const [crystalPrice, setCrystalP] = useState(10);
  const [essencePrice, setEssenceP] = useState(18);
  const [customer, setCustomer]     = useState(null);
  const [custTimer, setCustTimer]   = useState(0);
  const [upgradeCat, setUpgradeCat] = useState('auto');
  const [tab, setTab]               = useState('brew');
  const [eventMult, setEventMult]   = useState(1);
  const [notification, setNotif]    = useState(null);
  const [, forceUpdate]             = useState(0);

  const stateRef    = useRef(state);
  const customerRef = useRef(customer);
  useEffect(() => { stateRef.current = state; },    [state]);
  useEffect(() => { customerRef.current = customer; }, [customer]);

  // Force re-render every 200ms for live brew progress bars
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 200);
    return () => clearInterval(id);
  }, []);

  const addLog = useCallback((msg) => setLog(l => [msg, ...l].slice(0, 25)), []);
  const notify = useCallback((msg, color = 'var(--accent)') => {
    setNotif({ msg, color });
    setTimeout(() => setNotif(null), 2500);
  }, []);

  // Auto-save
  useEffect(() => {
    const id = setInterval(() => writeSave(stateRef.current), 5000);
    return () => clearInterval(id);
  }, []);

  // Brew completion
  useEffect(() => {
    const id = setInterval(() => {
      setState(s => {
        if (!s.brews.length) return s;
        const now = Date.now();
        const remaining = [];
        let ns = s;
        let changed = false;
        for (const brew of s.brews) {
          const recipe = RECIPES.find(r => r.id === brew.recipeId);
          if (!recipe) continue;
          if (now - brew.start >= calcBrewTime(recipe, s.upgrades)) {
            const qty = calcBatchSize(s.upgrades);
            const inv = { ...ns.inventory, [brew.recipeId]: (ns.inventory[brew.recipeId] || 0) + qty };
            ns = {
              ...ns, inventory: inv,
              brewed:     ns.brewed + qty,
              totalBrews: ns.totalBrews + qty,
              brewPoison: brew.recipeId === 'poison'     ? ns.brewPoison + qty : ns.brewPoison,
              brewElixir: brew.recipeId === 'elixirLife' ? ns.brewElixir + qty : ns.brewElixir,
              brewStar:   brew.recipeId === 'starDust'   ? ns.brewStar   + qty : ns.brewStar,
              brewVoid:   brew.recipeId === 'voidEssence'? ns.brewVoid   + qty : ns.brewVoid,
              brewCosmic: brew.recipeId === 'cosmicBrew' ? ns.brewCosmic + qty : ns.brewCosmic,
            };
            addLog(`${recipe.icon} ${recipe.name} ready! ×${qty}`);
            changed = true;
          } else {
            remaining.push(brew);
          }
        }
        if (!changed) return s;
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
        const slots = calcBrewSlots(s.upgrades);
        if (s.brews.length >= slots) return s;
        addLog('⚙️ Auto-Stirrer started a health brew');
        return { ...s, herbs: s.herbs - 1, brews: [...s.brews, { recipeId: 'health', start: Date.now() }] };
      });
    }, ms);
    return () => clearInterval(id);
  }, [state.upgrades.autoStirrer, state.upgrades.masterStirrer, addLog]);

  // Spirit Loom
  useEffect(() => {
    if (!state.upgrades.spiritLoom) return;
    const id = setInterval(() => {
      setState(s => {
        const slots = calcBrewSlots(s.upgrades);
        if (s.brews.length >= slots || s.herbs < 2 || s.essences < 1) return s;
        addLog('🪡 Spirit Loom started a Stardust brew');
        return { ...s, herbs: s.herbs - 2, essences: s.essences - 1, brews: [...s.brews, { recipeId: 'starDust', start: Date.now() }] };
      });
    }, 25000);
    return () => clearInterval(id);
  }, [state.upgrades.spiritLoom, addLog]);

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

  // Essence well
  useEffect(() => {
    if (!state.upgrades.essenceWell) return;
    const qty = state.upgrades.voidCollector ? 2 : 1;
    const id = setInterval(() => {
      setState(s => ({ ...s, essences: s.essences + qty }));
      addLog(`💧 Essence Well generated ${qty} essence${qty > 1 ? 's' : ''}!`);
    }, 45000);
    return () => clearInterval(id);
  }, [state.upgrades.essenceWell, state.upgrades.voidCollector, addLog]);

  // Market prices
  useEffect(() => {
    const id = setInterval(() => {
      setHerbPrice(2 + Math.floor(Math.random() * 4));
      setShroomP(state.upgrades.blackMarket ? 3 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 5));
      setCrystalP(8 + Math.floor(Math.random() * 8));
      setEssenceP(15 + Math.floor(Math.random() * 10));
    }, 20000);
    return () => clearInterval(id);
  }, [state.upgrades.blackMarket]);

  // Day cycle + market events
  useEffect(() => {
    const id = setInterval(() => {
      setState(s => ({ ...s, day: s.day + 1 }));
      const ev = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
      addLog(`🌅 Day ${stateRef.current.day + 1} — ${ev.msg}`);
      setHerbPrice(p => Math.max(1, p + (ev.herb || 0)));
      setShroomP(p  => Math.max(1, p + (ev.shroom || 0)));
      setCrystalP(p => Math.max(1, p + (ev.crystal || 0)));
      if (ev.demandBonus) {
        setEventMult(ev.demandBonus);
        notify(`📯 ${ev.msg}`, '#ffd700');
        setTimeout(() => setEventMult(1), 60000);
      } else if (ev.taxRate) {
        setEventMult(ev.taxRate);
        notify(`📯 ${ev.msg}`, 'var(--accent2)');
        setTimeout(() => setEventMult(1), 60000);
      } else {
        notify(`📯 ${ev.msg}`, '#47c8ff');
      }
    }, 120000);
    return () => clearInterval(id);
  }, [addLog, notify]);

  // Customer spawn — higher prestige = rarer exotic customers
  useEffect(() => {
    const id = setInterval(() => {
      if (!customerRef.current) {
        const prestige = stateRef.current.prestige;
        const pool = CUSTOMER_TYPES.filter(c =>
          c.type !== 'demon' && c.type !== 'angel' ||
          (c.type === 'demon' && prestige >= 2) ||
          (c.type === 'angel' && prestige >= 3)
        );
        const c = { ...pool[Math.floor(Math.random() * pool.length)] };
        const wants = c.wants[Math.floor(Math.random() * c.wants.length)];
        const rec = RECIPES.find(r => r.id === wants);
        if (!rec || rec.prestige > prestige) return; // skip if recipe not yet unlocked tier
        c.wants = wants;
        c.id = Math.random();
        setCustomer(c);
        setCustTimer(30);
        addLog(`${c.icon} A ${c.label} wants ${rec.name}! (×${c.bonus.toFixed(1)} price)`);
      }
    }, 22000);
    return () => clearInterval(id);
  }, [addLog]);

  // Customer countdown
  useEffect(() => {
    if (!customer) return;
    const id = setInterval(() => {
      setCustTimer(t => {
        if (t <= 1) {
          setCustomer(null);
          addLog(`😤 ${customer.icon} Customer left without buying.`);
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
      if (q.minPrestige > s.prestige) continue;
      const g = q.goal;
      let met = false;
      if (g.brewed        !== undefined && s.brewed        >= g.brewed)        met = true;
      if (g.totalEarned   !== undefined && s.totalEarned   >= g.totalEarned)   met = true;
      if (g.herbsTotal    !== undefined && s.herbsTotal    >= g.herbsTotal)     met = true;
      if (g.brewPoison    !== undefined && s.brewPoison    >= g.brewPoison)     met = true;
      if (g.crystalsTotal !== undefined && s.crystalsTotal >= g.crystalsTotal)  met = true;
      if (g.ownAuto       !== undefined && s.upgrades.autoStirrer && s.upgrades.herbGarden) met = true;
      if (g.brewElixir    !== undefined && s.brewElixir    >= g.brewElixir)     met = true;
      if (g.brewStar      !== undefined && s.brewStar      >= g.brewStar)       met = true;
      if (g.brewVoid      !== undefined && s.brewVoid      >= g.brewVoid)       met = true;
      if (g.brewCosmic    !== undefined && s.brewCosmic    >= g.brewCosmic)     met = true;
      if (g.prestige      !== undefined && s.prestige      >= g.prestige)       met = true;
      if (met) {
        const r = q.reward;
        setState(prev => ({
          ...prev,
          gold:            prev.gold            + (r.gold            || 0),
          herbs:           prev.herbs           + (r.herbs           || 0),
          mushrooms:       prev.mushrooms       + (r.mushrooms       || 0),
          crystals:        prev.crystals        + (r.crystals        || 0),
          essences:        prev.essences        + (r.essences        || 0),
          prestigePoints:  prev.prestigePoints  + (r.prestigePoints  || 0),
          completedQuests: [...prev.completedQuests, q.id],
        }));
        const rewardStr = Object.entries(r).filter(([,v]) => v > 0).map(([k,v]) => `+${v} ${k}`).join(', ');
        addLog(`🏆 Quest: "${q.label}" complete! → ${rewardStr}`);
        notify(`🏆 Quest complete: ${q.label}!`, '#ffd700');
      }
    }
  }, [state.brewed, state.totalEarned, state.herbsTotal, state.brewPoison,
      state.crystalsTotal, state.brewElixir, state.brewStar, state.brewVoid,
      state.brewCosmic, state.upgrades.autoStirrer, state.upgrades.herbGarden,
      state.prestige, addLog, notify]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const startBrew = useCallback((recipeId) => {
    setState(s => {
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!recipe) return s;
      const slots = calcBrewSlots(s.upgrades);
      if (s.brews.length >= slots) return s;
      const cost = recipe.cost;
      if ((cost.herbs||0) > s.herbs || (cost.mushrooms||0) > s.mushrooms ||
          (cost.crystals||0) > s.crystals || (cost.essences||0) > s.essences) return s;
      addLog(`🧪 Brewing ${recipe.name}…`);
      return {
        ...s,
        herbs:     s.herbs     - (cost.herbs     || 0),
        mushrooms: s.mushrooms - (cost.mushrooms || 0),
        crystals:  s.crystals  - (cost.crystals  || 0),
        essences:  s.essences  - (cost.essences  || 0),
        brews: [...s.brews, { recipeId, start: Date.now() }],
      };
    });
  }, [addLog]);

  const sellPotion = useCallback((recipeId, cust) => {
    setState(s => {
      const recipe = RECIPES.find(r => r.id === recipeId);
      if (!recipe || !(s.inventory[recipeId] > 0)) return s;
      const price = calcSellPrice(recipe, s.upgrades, cust?.bonus, s.prestige, eventMult);
      addLog(`💰 Sold ${recipe.name} for ${price}g${cust ? ` to ${cust.icon} ${cust.label}` : ''}`);
      if (cust) setCustomer(null);
      const newLifetime = s.lifetimeEarned + price;
      notify(`+${price}g`, '#47ffa0');
      return {
        ...s,
        inventory:      { ...s.inventory, [recipeId]: s.inventory[recipeId] - 1 },
        gold:           s.gold + price,
        totalEarned:    s.totalEarned + price,
        lifetimeEarned: newLifetime,
        totalSells:     s.totalSells + 1,
        reputation:     cust ? s.reputation + (cust.tip || 10) : s.reputation,
      };
    });
  }, [addLog, eventMult, notify]);

  const sellAll = useCallback(() => {
    setState(s => {
      if (!s.upgrades.auctionHouse) return s;
      let earned = 0; let count = 0;
      const inv = { ...s.inventory };
      for (const [rid, qty] of Object.entries(inv)) {
        if (!qty) continue;
        const recipe = RECIPES.find(r => r.id === rid);
        if (!recipe) continue;
        earned += Math.round(calcSellPrice(recipe, s.upgrades, null, s.prestige, eventMult) * qty * 1.2);
        count += qty;
        inv[rid] = 0;
      }
      if (!earned) return s;
      addLog(`🏛️ Auction: ${count} potions sold for ${earned}g!`);
      notify(`🏛️ +${earned}g`, '#ffd700');
      return { ...s, inventory: inv, gold: s.gold + earned, totalEarned: s.totalEarned + earned, lifetimeEarned: s.lifetimeEarned + earned, totalSells: s.totalSells + count };
    });
  }, [addLog, eventMult, notify]);

  const buyIngredient = useCallback((type, price) => {
    setState(s => {
      if (s.gold < price) return s;
      let count = 1;
      if (type === 'herbs' && s.upgrades.doubleHerb) count = 3;
      const icon = { herbs:'🌿', mushrooms:'🍄', crystals:'💎', essences:'💧' }[type];
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
    setState(s => {
      if (s.upgrades[id]) return s;
      if (id === 'prestige') {
        // handled separately
        return s;
      }
      if (s.gold < upg.cost) return s;
      addLog(`🔮 Unlocked: ${upg.label}!`);
      notify(`🔮 ${upg.label} unlocked!`, '#c47aff');
      return { ...s, gold: s.gold - upg.cost, upgrades: { ...s.upgrades, [id]: true } };
    });
  }, [addLog, notify]);

  const doPrestige = useCallback(() => {
    setState(s => {
      const cost = calcAscendCost(s.prestige);
      if (s.gold < cost) return s;
      const newPrestige = s.prestige + 1;
      const pp = s.prestigePoints + 1;
      const newLifetime = s.lifetimeEarned + s.gold;
      const fresh = {
        ...initState(null),
        prestige:        newPrestige,
        prestigePoints:  pp,
        lifetimeEarned:  newLifetime,
        totalBrews:      s.totalBrews,
        totalSells:      s.totalSells,
        // carry over rep as a bonus
        reputation:      Math.floor(s.reputation / 2),
      };
      clearSave();
      stateRef.current = fresh;
      addLog(`🌟 ASCENDED to Prestige ${newPrestige}! +${newPrestige * 10}% gold bonus active.`);
      notify(`🌟 Prestige ${newPrestige}!`, '#ffd700');
      return fresh;
    });
  }, [addLog, notify]);

  const resetGame = useCallback(() => {
    if (!window.confirm('Reset all progress including prestige?')) return;
    const fresh = initState(null);
    clearSave();
    stateRef.current = fresh;
    setState(fresh);
    setCustomer(null);
    setLog(['🧪 Shop wiped. Starting from scratch.']);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const { gold, herbs, mushrooms, crystals, essences, inventory, upgrades,
          totalEarned, lifetimeEarned, day, reputation, prestige, prestigePoints,
          brews, completedQuests, totalBrews, totalSells } = state;

  const slots     = calcBrewSlots(upgrades);
  const totalInv  = Object.values(inventory).reduce((a, b) => a + b, 0);
  const ascendCost = calcAscendCost(prestige);
  const effHerbP  = upgrades.haggling ? Math.max(1, herbPrice - 1) : herbPrice;
  const effShroomP = upgrades.blackMarket ? Math.round(shroomPrice * 0.8) : shroomPrice;

  function recipeUnlocked(recipe) {
    if (recipe.prestige > prestige) return false;
    if (recipe.requiresUpgrade && !upgrades[recipe.requiresUpgrade]) return false;
    // Prestige-tier recipe books
    if (recipe.prestige === 1 && !upgrades.starChart)   return false;
    if (recipe.prestige === 2 && !upgrades.voidGrimoire) return false;
    if (recipe.prestige === 3 && !upgrades.cosmicCodex)  return false;
    return true;
  }

  function canAffordBrew(recipe) {
    const c = recipe.cost;
    return (c.herbs||0) <= herbs && (c.mushrooms||0) <= mushrooms &&
           (c.crystals||0) <= crystals && (c.essences||0) <= essences;
  }

  function getBrewPct(brew) {
    const recipe = RECIPES.find(r => r.id === brew.recipeId);
    if (!recipe) return 0;
    return Math.min(100, ((Date.now() - brew.start) / calcBrewTime(recipe, upgrades)) * 100);
  }

  const visibleUpgrades = useMemo(() => UPGRADES.filter(u => {
    if (u.id === 'prestige') return false; // shown via dedicated button
    if (u.minPrestige > prestige) return false;
    if (upgrades[u.id]) return true;
    if (u.cat === 'special') return totalEarned >= u.cost * 0.25 || gold >= u.cost * 0.35;
    return totalEarned >= u.cost * 0.15 || gold >= u.cost * 0.3;
  }).filter(u => u.cat === upgradeCat), [upgrades, prestige, totalEarned, gold, upgradeCat]);

  const visibleQuests = QUESTS.filter(q => q.minPrestige <= prestige);

  // Prestige recipes to show as "coming soon" teaser
  const nextPrestigeRecipes = RECIPES.filter(r => r.prestige === prestige + 1);

  const inventoryEntries = Object.entries(inventory).filter(([, qty]) => qty > 0);

  return (
    <div className="alc-wrap">
      {/* Floating notification */}
      {notification && (
        <div className="alc-notif" style={{ color: notification.color }}>{notification.msg}</div>
      )}

      {/* Header */}
      <div className="alc-header">
        <button className="alc-back" onClick={() => navigate('home')}>← BACK</button>
        <div className="alc-title-row">
          <span className="alc-tag">// ALCHEMY SHOP</span>
          <span className="alc-day">Day {day}</span>
          {prestige > 0 && <span className="alc-prestige-badge">⭐ P{prestige} · +{prestige * 10}% gold</span>}
          {eventMult !== 1 && (
            <span className="alc-event-badge" style={{ color: eventMult > 1 ? '#47ffa0' : 'var(--accent2)' }}>
              {eventMult > 1 ? `📈 ×${eventMult} prices` : `📉 ×${eventMult} prices`}
            </span>
          )}
        </div>
      </div>

      {/* Resources Bar */}
      <div className="alc-resources">
        {[['🪙','GOLD',gold],['🌿','HERBS',herbs],['🍄','SHROOMS',mushrooms],
          ['💎','CRYSTALS',crystals],
          ...(prestige >= 1 ? [['💧','ESSENCES',essences]] : []),
          ['🧪','POTIONS',totalInv],['⭐','REP',reputation]].map(([icon,label,val]) => (
          <div key={label} className="alc-res">
            <span className="alc-res-icon">{icon}</span>
            <div><div className="alc-res-label">{label}</div><div className="alc-res-val">{val}</div></div>
          </div>
        ))}
        {prestigePoints > 0 && (
          <div className="alc-res prestige-res">
            <span className="alc-res-icon">🏅</span>
            <div><div className="alc-res-label">P.PTS</div><div className="alc-res-val">{prestigePoints}</div></div>
          </div>
        )}
      </div>

      {/* Ascend Banner — shows when affordable */}
      {gold >= ascendCost * 0.5 && (
        <div className={`alc-ascend-bar ${gold >= ascendCost ? 'ready' : ''}`}>
          <div className="alc-ascend-left">
            <span>🌟</span>
            <div>
              <div className="alc-ascend-title">ASCEND TO PRESTIGE {prestige + 1}</div>
              <div className="alc-ascend-sub">
                Resets run · +10% gold bonus per prestige · Unlocks new recipes & upgrades
                {prestige >= 1 && ` · Cost doubles each ascension`}
              </div>
            </div>
          </div>
          <div className="alc-ascend-right">
            <div className="alc-ascend-progress">
              <div className="alc-ascend-fill" style={{ width: `${Math.min(100,(gold/ascendCost)*100)}%` }} />
            </div>
            <button className="alc-ascend-btn" disabled={gold < ascendCost} onClick={doPrestige}>
              {gold >= ascendCost ? `ASCEND · ${ascendCost}g` : `${gold}/${ascendCost}g`}
            </button>
          </div>
        </div>
      )}

      {/* Customer Banner */}
      {customer && (
        <div className="alc-customer">
          <span className="alc-cust-icon">{customer.icon}</span>
          <div className="alc-cust-info">
            <div className="alc-cust-name">{customer.label}</div>
            <div className="alc-cust-want">{RECIPES.find(r=>r.id===customer.wants)?.icon} {RECIPES.find(r=>r.id===customer.wants)?.name}</div>
            <div className="alc-cust-bonus">×{customer.bonus.toFixed(1)} price · +{customer.tip} rep on sale</div>
          </div>
          <div className="alc-cust-right">
            <div className="alc-cust-timer-wrap">
              <div className="alc-cust-timer-fill" style={{ width:`${(custTimer/30)*100}%` }} />
            </div>
            <span className="alc-cust-secs">{custTimer}s</span>
            {(inventory[customer.wants] > 0) && (
              <button className="alc-btn special small" onClick={() => sellPotion(customer.wants, customer)}>
                SELL {RECIPES.find(r=>r.id===customer.wants)?.icon}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main layout: sidebar + content */}
      <div className="alc-layout">

        {/* ── SIDEBAR ── */}
        <div className="alc-sidebar">
          <div className="alc-sidebar-title">🫧 CAULDRONS {brews.length}/{slots}</div>
          {brews.length === 0 && (
            <div className="alc-sidebar-empty">No active brews.<br/>Head to Brew tab.</div>
          )}
          {brews.map((brew, i) => {
            const recipe = RECIPES.find(r => r.id === brew.recipeId);
            if (!recipe) return null;
            const pct = getBrewPct(brew);
            const remaining = Math.max(0, calcBrewTime(recipe, upgrades) - (Date.now() - brew.start));
            const secs = Math.ceil(remaining / 1000);
            return (
              <div key={i} className="alc-sidebar-brew">
                <div className="alc-sb-brew-header">
                  <span className="alc-sb-brew-icon">{recipe.icon}</span>
                  <span className="alc-sb-brew-name">{recipe.name}</span>
                  <span className="alc-sb-brew-time">{secs}s</span>
                </div>
                <div className="alc-sb-bar-wrap">
                  <div className="alc-sb-bar-fill" style={{ width:`${pct}%`, background:recipe.color }} />
                </div>
                <div className="alc-sb-pct">{Math.round(pct)}%{calcBatchSize(upgrades) > 1 ? ` · ×${calcBatchSize(upgrades)}` : ''}</div>
              </div>
            );
          })}

          {/* Empty slot indicators */}
          {Array.from({ length: slots - brews.length }).map((_, i) => (
            <div key={`empty-${i}`} className="alc-sidebar-empty-slot">
              <span>⚗️</span><span>Empty slot</span>
            </div>
          ))}

          <div className="alc-sidebar-divider" />

          {/* Inventory snapshot */}
          <div className="alc-sidebar-title">🧪 INVENTORY</div>
          {inventoryEntries.length === 0 && <div className="alc-sidebar-empty">No potions yet.</div>}
          {inventoryEntries.map(([rid, qty]) => {
            const recipe = RECIPES.find(r => r.id === rid);
            if (!recipe) return null;
            const price = calcSellPrice(recipe, upgrades, null, prestige, eventMult);
            return (
              <div key={rid} className="alc-sidebar-inv-row">
                <span>{recipe.icon}</span>
                <span className="alc-sb-inv-name">{recipe.name}</span>
                <span className="alc-sb-inv-qty">×{qty}</span>
                <button className="alc-btn success tiny" onClick={() => sellPotion(rid)}>+{price}g</button>
              </div>
            );
          })}
          {upgrades.auctionHouse && totalInv > 0 && (
            <button className="alc-sidebar-sell-all" onClick={sellAll}>
              🏛️ SELL ALL
            </button>
          )}

          <div className="alc-sidebar-divider" />

          {/* Stats */}
          <div className="alc-sidebar-title">📊 STATS</div>
          {[
            ['Total Brews', totalBrews],
            ['Total Sells', totalSells],
            ['Lifetime Gold', `${lifetimeEarned}g`],
            ['This Run', `${totalEarned}g`],
            ['Prestige', prestige],
          ].map(([label, val]) => (
            <div key={label} className="alc-sidebar-stat">
              <span className="alc-sb-stat-label">{label}</span>
              <span className="alc-sb-stat-val">{val}</span>
            </div>
          ))}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="alc-main">
          {/* Tabs */}
          <div className="alc-tabs">
            {[['brew','⚗️ Brew'],['market','🛒 Buy'],['upgrades','🔮 Upgrades'],['quests','📜 Quests'],['log','📋 Log']].map(([id,label]) => (
              <button key={id} className={`alc-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          {/* BREW TAB */}
          {tab === 'brew' && (
            <div className="alc-brew-section">
              <div className="alc-brew-hint">
                {brews.length < slots
                  ? `${slots - brews.length} slot${slots-brews.length>1?'s':''} available · ${calcBatchSize(upgrades)}× per brew`
                  : `All ${slots} slots busy — upgrade for more!`}
              </div>
              <div className="alc-brew-grid">
                {RECIPES.map(recipe => {
                  const unlocked   = recipeUnlocked(recipe);
                  const affordable = canAffordBrew(recipe);
                  const qty        = inventory[recipe.id] || 0;
                  const price      = calcSellPrice(recipe, upgrades, null, prestige, eventMult);
                  const isBrewing  = brews.some(b => b.recipeId === recipe.id);
                  const isLocked   = recipe.prestige > prestige;
                  const needsBook  = !isLocked && !unlocked;

                  if (isLocked) {
                    // Show as teaser only if next prestige
                    if (recipe.prestige !== prestige + 1) return null;
                    return (
                      <div key={recipe.id} className="alc-recipe-card locked-tier">
                        <div className="alc-recipe-header">
                          <span className="alc-recipe-emoji locked-emoji">🔒</span>
                          <div>
                            <div className="alc-recipe-name">{recipe.name}</div>
                            <div className="alc-recipe-desc prestige-tease">Unlocks at Prestige {recipe.prestige}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={recipe.id}
                         className={`alc-recipe-card ${needsBook?'needs-book':''} ${isBrewing?'brewing-glow':''}`}
                         style={{'--rc': recipe.color}}>
                      <div className="alc-recipe-header">
                        <span className="alc-recipe-emoji">{needsBook ? '🔒' : recipe.icon}</span>
                        <div>
                          <div className="alc-recipe-name">{recipe.name}</div>
                          <div className="alc-recipe-desc">{needsBook ? 'Buy upgrade to unlock' : recipe.desc}</div>
                        </div>
                        {qty > 0 && <span className="alc-recipe-badge">×{qty}</span>}
                      </div>
                      {!needsBook && (
                        <>
                          <div className="alc-recipe-cost">
                            {Object.entries(recipe.cost).map(([mat, n]) => {
                              const have = { herbs, mushrooms, crystals, essences }[mat] ?? 0;
                              return (
                                <span key={mat} className={`alc-mat-tag ${have < n ? 'short' : ''}`}>
                                  {mat==='herbs'?'🌿':mat==='mushrooms'?'🍄':mat==='crystals'?'💎':'💧'}×{n}
                                </span>
                              );
                            })}
                            <span className="alc-mat-tag sell-tag">→ {price}g{eventMult!==1?` (×${eventMult})`:''}</span>
                          </div>
                          <div className="alc-recipe-actions">
                            <button className="alc-btn primary small"
                                    disabled={!affordable || brews.length >= slots}
                                    onClick={() => startBrew(recipe.id)}>
                              {brews.length >= slots ? 'FULL' : 'BREW'}
                            </button>
                            <button className="alc-btn success small"
                                    disabled={qty < 1}
                                    onClick={() => sellPotion(recipe.id)}>
                              {qty > 0 ? `SELL +${price}g` : 'NONE'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {prestige > 0 && nextPrestigeRecipes.length > 0 && nextPrestigeRecipes[0].prestige > prestige + 1 && (
                <div className="alc-next-prestige-hint">
                  🌟 Ascend again to unlock {nextPrestigeRecipes.length} more recipes!
                </div>
              )}
            </div>
          )}

          {/* MARKET TAB */}
          {tab === 'market' && (
            <div className="alc-market">
              <div className="alc-market-note">Prices shift every 20s · Day events affect prices · {eventMult !== 1 ? <span style={{color:eventMult>1?'#47ffa0':'var(--accent2)'}}>Active event: ×{eventMult} sell prices!</span> : 'No active event'}</div>

              <div className="alc-market-section-title">BUY INGREDIENTS</div>
              {[
                { type:'herbs',     icon:'🌿', label:'Herbs',     price:effHerbP,    extra:upgrades.doubleHerb ? '×3 per buy' : '' },
                { type:'mushrooms', icon:'🍄', label:'Mushrooms', price:effShroomP,  extra:upgrades.blackMarket ? '20% off!' : '' },
                { type:'crystals',  icon:'💎', label:'Crystals',  price:crystalPrice, extra:'' },
                ...(prestige >= 1 ? [{ type:'essences', icon:'💧', label:'Essences', price:essencePrice, extra:'Required for P1+ recipes' }] : []),
              ].map(({ type, icon, label, price, extra }) => (
                <div key={type} className="alc-market-row">
                  <span className="alc-market-icon">{icon}</span>
                  <div className="alc-market-info">
                    <div className="alc-market-name">{label} <span className="alc-market-have">({state[type]} in stock)</span></div>
                    {extra && <div className="alc-market-extra">{extra}</div>}
                  </div>
                  <div className="alc-market-price-tag">{price}g</div>
                  <button className="alc-btn primary" disabled={gold < price} onClick={() => buyIngredient(type, price)}>
                    BUY
                  </button>
                </div>
              ))}

              {inventoryEntries.length > 0 && (
                <>
                  <div className="alc-market-section-title">SELL POTIONS</div>
                  {inventoryEntries.map(([rid, qty]) => {
                    const recipe = RECIPES.find(r => r.id === rid);
                    if (!recipe) return null;
                    const price  = calcSellPrice(recipe, upgrades, null, prestige, eventMult);
                    const custOk = customer?.wants === rid;
                    const custP  = custOk ? calcSellPrice(recipe, upgrades, customer?.bonus, prestige, eventMult) : null;
                    return (
                      <div key={rid} className={`alc-market-row ${custOk ? 'cust-want' : ''}`}>
                        <span className="alc-market-icon">{recipe.icon}</span>
                        <div className="alc-market-info">
                          <div className="alc-market-name">{recipe.name} <span className="alc-market-have">×{qty}</span></div>
                          {custOk && <div className="alc-market-extra">Customer wants this! +{Math.round((customer.bonus-1)*100)}% bonus</div>}
                        </div>
                        <div className="alc-sell-row">
                          <button className="alc-btn success small" onClick={() => sellPotion(rid)}>+{price}g</button>
                          {custOk && <button className="alc-btn special small" onClick={() => sellPotion(rid, customer)}>★ +{custP}g</button>}
                        </div>
                      </div>
                    );
                  })}
                  {upgrades.auctionHouse && (
                    <button className="alc-sell-all" onClick={sellAll}>
                      🏛️ SELL ALL {totalInv} potions at +20% Auction bonus
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* UPGRADES TAB */}
          {tab === 'upgrades' && (
            <div className="alc-upgrades-wrap">
              <div className="alc-upg-cats">
                {UPGRADE_CATS.map(cat => (
                  <button key={cat.id} className={`alc-upg-cat-btn ${upgradeCat===cat.id?'active':''}`}
                          onClick={() => setUpgradeCat(cat.id)}>{cat.label}</button>
                ))}
              </div>
              <div className="alc-upgrades-list">
                {visibleUpgrades.length === 0 && <div className="alc-empty">Earn more gold to reveal upgrades here.</div>}
                {visibleUpgrades.map(upg => {
                  const owned      = !!upgrades[upg.id];
                  const affordable = gold >= upg.cost;
                  const isNew      = upg.minPrestige === prestige && !owned && affordable;
                  return (
                    <div key={upg.id} className={`alc-upgrade ${owned?'owned':''} ${affordable&&!owned?'affordable':''} ${isNew?'new-upg':''}`}>
                      <span className="alc-upg-icon">{upg.icon}</span>
                      <div className="alc-upg-info">
                        <div className="alc-upg-name">
                          {upg.label}
                          {upg.minPrestige > 0 && <span className="alc-upg-tier">P{upg.minPrestige}+</span>}
                        </div>
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
                {/* Locked tier teaser */}
                {UPGRADES.filter(u => u.cat === upgradeCat && u.minPrestige === prestige + 1).length > 0 && (
                  <div className="alc-upg-teaser">
                    🌟 {UPGRADES.filter(u=>u.cat===upgradeCat&&u.minPrestige===prestige+1).length} more upgrades unlock at Prestige {prestige+1}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QUESTS TAB */}
          {tab === 'quests' && (
            <div className="alc-quests">
              <div className="alc-quests-header">
                {completedQuests.length}/{visibleQuests.length} complete
                {prestige < 4 && <span className="alc-quests-more"> · {QUESTS.filter(q=>q.minPrestige>prestige).length} more unlock at higher prestige</span>}
              </div>
              {visibleQuests.map(q => {
                const done = completedQuests.includes(q.id);
                return (
                  <div key={q.id} className={`alc-quest ${done?'done':''}`}>
                    <div className="alc-quest-check">{done ? '✅' : '🔲'}</div>
                    <div className="alc-quest-body">
                      <div className="alc-quest-name">
                        {q.label}
                        {q.minPrestige > 0 && <span className="alc-upg-tier">P{q.minPrestige}+</span>}
                      </div>
                      <div className="alc-quest-desc">{q.desc}</div>
                    </div>
                    <div className="alc-quest-reward">
                      {Object.entries(q.reward).filter(([,v])=>v>0).map(([k,v]) => (
                        <span key={k} className="alc-quest-rew">+{v} {k}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LOG TAB */}
          {tab === 'log' && (
            <div className="alc-log-full">
              {log.map((entry, i) => (
                <div key={i} className={`alc-log-entry ${i===0?'fresh':''}`}>{entry}</div>
              ))}
              <button className="alc-reset-btn" onClick={resetGame}>⚠️ FULL RESET</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
