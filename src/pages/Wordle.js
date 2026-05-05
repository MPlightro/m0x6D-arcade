import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Wordle.css';

// ── Fallback answer pool (used until Datamuse loads / offline) ─
const FALLBACK_WORDS = [
  'about','above','actor','admit','adult','after','agent','agree','ahead','alarm',
  'album','alert','alike','alive','allow','alone','along','alter','angel','anger',
  'angle','angry','ankle','apart','apple','apply','arena','argue','arise','armor',
  'arrow','aside','asset','audio','avoid','awake','award','aware','basic','basis',
  'batch','beard','beast','began','begin','being','below','bench','birth','black',
  'blade','blame','blank','blast','blaze','bleed','bless','blind','block','blood',
  'bloom','board','bonus','boost','booth','bored','bound','brain','brand','brave',
  'bread','break','breed','brick','bride','brief','bring','broad','broke','brown',
  'brush','build','built','burst','buyer','cabin','cable','candy','carry','catch',
  'cause','chain','chair','chaos','charm','chart','chase','cheap','check','chess',
  'chest','chief','child','chunk','civic','civil','claim','clash','class','clean',
  'clear','click','cliff','climb','clock','close','cloud','coach','coast','color',
  'count','court','cover','crack','craft','crane','crash','crazy','cream','crime',
  'cross','crowd','crown','crush','curve','cycle','dance','debut','delay','dense',
  'depth','dirty','ditch','dizzy','dodge','doubt','draft','drain','drama','dream',
  'dress','drift','drink','drive','drone','drown','eagle','early','earth','eight',
  'elect','elite','empty','enemy','enjoy','enter','entry','equal','error','essay',
  'event','every','exact','exist','extra','faint','fairy','faith','false','fancy',
  'fatal','fault','feast','fence','fever','field','fight','final','first','fixed',
  'flame','flash','fleet','flesh','float','flood','floor','fluid','focus','force',
  'forge','forum','found','frame','fraud','fresh','front','frost','fruit','funny',
  'ghost','giant','given','glass','globe','glory','glove','going','grace','grade',
  'grain','grand','grant','grasp','grass','grave','great','greed','green','grief',
  'group','grown','guess','guest','guide','guild','guilt','habit','hands','happy',
  'harsh','heart','heavy','herbs','honor','horse','hotel','house','human','humor',
  'hurry','ideal','image','inner','input','irony','ivory','jewel','judge','jumbo',
  'karma','kayak','knife','knock','known','label','large','laser','later','laugh',
  'layer','learn','leave','legal','lemon','level','light','limit','liver','logic',
  'loose','lover','lower','lucky','lunar','lunch','magic','major','maker','march',
  'marry','match','mayor','media','mercy','merit','metal','might','minor','mixed',
  'model','money','month','moral','motor','mouth','movie','music','nerve','never',
  'night','noble','noise','north','novel','nurse','occur','offer','often','olive',
  'orbit','order','organ','other','outer','paint','panel','panic','paper','party',
  'pasta','patch','pause','peace','peach','pearl','penny','phase','phone','photo',
  'piano','piece','pilot','pinch','pixel','pizza','place','plain','plane','plant',
  'plate','point','power','press','price','pride','prime','print','prize','proof',
  'prose','proud','prove','pulse','punch','queen','quest','quick','quiet','quota',
  'quote','radio','raise','rally','ranch','range','rapid','ratio','reach','ready',
  'realm','rebel','reign','relax','reply','rider','right','rigid','risky','rival',
  'river','robot','rocky','rough','round','route','royal','ruler','rusty','saint',
  'salad','sauce','scale','scene','scope','score','scout','sense','serve','seven',
  'shade','shake','shame','shape','share','shark','sharp','shelf','shell','shift',
  'shine','shirt','shock','shoot','shore','short','shout','sight','silly','since',
  'skill','slate','sleep','slice','slide','slope','smart','smile','smoke','snake',
  'solar','solve','sorry','sound','south','space','spark','speak','speed','spell',
  'spend','spine','split','spoon','sport','spray','squad','stack','staff','stage',
  'stain','stair','stand','stark','start','state','steal','steam','steel','stick',
  'still','stock','stone','storm','story','stove','strap','straw','study','stuff',
  'style','sugar','sunny','super','surge','swamp','swear','sweep','sweet','swift',
  'sword','table','taste','teach','theme','thick','thing','think','third','those',
  'three','thumb','tiger','tight','timer','title','today','tooth','topic','total',
  'touch','tough','tower','toxic','track','trade','trail','train','trick','troop',
  'truck','truly','trunk','trust','truth','tulip','twice','twist','ultra','under',
  'union','unity','until','upper','upset','urban','usage','usual','valid','valor',
  'value','vault','video','vigor','viral','visit','vital','vivid','vocal','voice',
  'waste','watch','water','weary','wedge','weird','whale','wheat','wheel','while',
  'white','whole','witch','woman','women','world','worry','worst','worth','would',
  'wrath','write','wrote','yacht','yield','young','youth','zebra',
];

// ── Word pool state (module-level — persists across re-renders) ─
let answerPool   = [...FALLBACK_WORDS];
let validWordSet = new Set(FALLBACK_WORDS);
let poolLoaded   = false;

// ── Fetch ~1000 common 5-letter words from Datamuse ───────────
// sp=????? = exactly 5 letters, md=f = include frequency tags
async function loadWordPool() {
  if (poolLoaded) return;
  try {
    const res = await fetch('https://api.datamuse.com/words?sp=?????&md=f&max=1000');
    if (!res.ok) return;
    const data = await res.json();

    // keep only purely alphabetic words that have a frequency score
    const words = data
      .filter(w => /^[a-z]{5}$/.test(w.word) && w.tags?.some(t => t.startsWith('f:')))
      .map(w => w.word);

    if (words.length > 100) {
      answerPool   = words;
      validWordSet = new Set([...words, ...FALLBACK_WORDS]);
      poolLoaded   = true;
    }
  } catch (_) {
    // stay on fallback silently
  }
}

// ── Per-word validation via Free Dictionary API ───────────────
// Returns: 'valid' | 'invalid' | 'offline'
const validationCache = new Map();
async function validateWord(word) {
  if (validWordSet.has(word)) return 'valid';
  if (validationCache.has(word)) return validationCache.get(word);

  try {
    const res    = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const result = res.ok ? 'valid' : 'invalid';
    validationCache.set(word, result);
    if (result === 'valid') validWordSet.add(word); // cache hit for next time
    return result;
  } catch (_) {
    return 'offline'; // let the player guess freely when offline
  }
}

function pickWord() {
  return answerPool[Math.floor(Math.random() * answerPool.length)];
}

// ── Game logic helpers ────────────────────────────────────────
function evaluateGuess(guess, target) {
  const result = Array(5).fill('absent');
  const pool   = target.split('');
  for (let i = 0; i < 5; i++) {
    if (guess[i] === pool[i]) { result[i] = 'correct'; pool[i] = null; }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const idx = pool.indexOf(guess[i]);
    if (idx !== -1) { result[i] = 'present'; pool[idx] = null; }
  }
  return result;
}

function buildKeyMap(guesses) {
  const map      = {};
  const priority = { correct: 3, present: 2, absent: 1 };
  for (const { letters, result } of guesses) {
    letters.forEach((l, i) => {
      const cur = map[l];
      if (!cur || priority[result[i]] > priority[cur]) map[l] = result[i];
    });
  }
  return map;
}

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

const MAX_GUESSES = 6;

function initState() {
  return {
    target:     pickWord(),
    guesses:    [],
    current:    [],
    status:     'playing',  // playing | won | lost
    invalid:    false,
    invalidMsg: '',
    checking:   false,      // true while dictionary API call in-flight
  };
}

// ── Component ─────────────────────────────────────────────────
export default function Wordle({ navigate }) {
  const [game, setGame]             = useState(initState);
  const [streak, setStreak]         = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [poolReady, setPoolReady]   = useState(poolLoaded);
  const checkingRef = useRef(false); // prevent double-submit during async

  // load Datamuse word pool on mount
  useEffect(() => {
    loadWordPool().then(() => setPoolReady(true));
  }, []);

  const triggerInvalid = useCallback((msg) => {
    checkingRef.current = false;
    setGame(g => ({ ...g, invalid: true, invalidMsg: msg, checking: false }));
    setTimeout(() => setGame(g => ({ ...g, invalid: false, invalidMsg: '' })), 650);
  }, []);

  const submitGuess = useCallback(() => {
    // read current state synchronously via functional updater
    setGame(g => {
      if (g.status !== 'playing' || g.checking || checkingRef.current) return g;
      if (g.current.length !== 5) {
        setTimeout(() => triggerInvalid('NOT ENOUGH LETTERS'), 0);
        return g;
      }

      const word = g.current.join('').toLowerCase();
      checkingRef.current = true;

      // async validation — doesn't block state
      validateWord(word).then(validity => {
        checkingRef.current = false;

        if (validity === 'invalid') {
          triggerInvalid('NOT IN DICTIONARY');
          return;
        }

        // valid or offline — commit the guess
        setGame(prev => {
          if (prev.status !== 'playing') return prev;
          const result     = evaluateGuess(word, prev.target);
          const newGuesses = [...prev.guesses, { letters: word.split(''), result }];
          const won        = result.every(r => r === 'correct');
          const lost       = !won && newGuesses.length >= MAX_GUESSES;

          if (won)  setStreak(s => s + 1);
          if (lost) setStreak(() => 0);

          return {
            ...prev,
            guesses:  newGuesses,
            current:  [],
            invalid:  false,
            checking: false,
            status:   won ? 'won' : lost ? 'lost' : 'playing',
          };
        });
      });

      return { ...g, checking: true };
    });
  }, [triggerInvalid]);

  const type = useCallback((key) => {
    setGame(g => {
      if (g.status !== 'playing' || g.checking) return g;
      if (key === 'ENTER') return g;
      if (key === '⌫' || key === 'BACKSPACE')
        return { ...g, current: g.current.slice(0, -1), invalid: false };
      if (g.current.length >= 5) return g;
      return { ...g, current: [...g.current, key.toUpperCase()], invalid: false };
    });
  }, []);

  const newGame = useCallback(() => {
    checkingRef.current = false;
    setShowAnswer(false);
    setGame(() => initState());
  }, []);

  // physical keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (k === 'ENTER')    { e.preventDefault(); submitGuess(); }
      else if (k === 'BACKSPACE') type('BACKSPACE');
      else if (k.length === 1 && k >= 'A' && k <= 'Z') type(k);
      else if (k === 'R' && (game.status === 'won' || game.status === 'lost')) newGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitGuess, type, newGame, game.status]);

  const keyMap    = buildKeyMap(game.guesses);
  const activeRow = game.guesses.length;

  return (
    <div className="wd-page">
      {/* Topbar */}
      <div className="wd-topbar">
        <button className="wd-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="wd-game-label">WORDLE</span>
        {streak > 0 && <span className="wd-streak">🔥 {streak}</span>}
        {!poolReady && <span className="wd-loading">loading words…</span>}
        <button className="wd-new" onClick={newGame} title="New game (R)">NEW GAME</button>
      </div>

      {/* Toasts */}
      {game.invalid && game.invalidMsg && (
        <div className="wd-toast">{game.invalidMsg}</div>
      )}
      {game.checking && (
        <div className="wd-toast wd-toast-check">CHECKING…</div>
      )}

      {/* Main */}
      <div className="wd-main">
        {/* Grid */}
        <div className="wd-grid">
          {Array.from({ length: MAX_GUESSES }, (_, ri) => {
            const guess     = game.guesses[ri];
            const isActive  = ri === activeRow && game.status === 'playing';
            const letters   = guess ? guess.letters : isActive ? game.current : [];
            const result    = guess ? guess.result  : [];
            const isInvalid = isActive && game.invalid;

            return (
              <div key={ri} className={`wd-row ${isInvalid ? 'wd-shake' : ''}`}>
                {Array.from({ length: 5 }, (_, ci) => {
                  const letter = letters[ci] || '';
                  const state  = result[ci] || (letter ? 'filled' : '');
                  const flip   = !!guess;
                  return (
                    <div
                      key={ci}
                      className={`wd-tile wd-${state} ${flip ? 'wd-flip' : ''}`}
                      style={flip ? { animationDelay: `${ci * 80}ms` } : undefined}
                    >
                      {letter}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Result banner */}
        {game.status !== 'playing' && (
          <div className={`wd-banner ${game.status === 'won' ? 'wd-banner-win' : 'wd-banner-lose'}`}>
            {game.status === 'won'
              ? <>
                  <span className="wd-banner-title">
                    {['GENIUS','MAGNIFICENT','IMPRESSIVE','SPLENDID','GREAT','PHEW'][game.guesses.length - 1]}
                  </span>
                  <span className="wd-banner-sub">in {game.guesses.length}/6</span>
                </>
              : <>
                  <span className="wd-banner-title">GAME OVER</span>
                  {!showAnswer
                    ? <button className="wd-reveal-btn" onClick={() => setShowAnswer(true)}>REVEAL ANSWER</button>
                    : <span className="wd-answer">{game.target.toUpperCase()}</span>
                  }
                </>
            }
            <button className="wd-play-again" onClick={newGame}>PLAY AGAIN →</button>
          </div>
        )}
      </div>

      {/* Keyboard */}
      <div className="wd-keyboard">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="wd-kb-row">
            {row.map(key => {
              const state = keyMap[key] || '';
              const wide  = key === 'ENTER' || key === '⌫';
              return (
                <button
                  key={key}
                  className={`wd-key wd-key-${state} ${wide ? 'wd-key-wide' : ''}`}
                  onClick={() => key === 'ENTER' ? submitGuess() : type(key)}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}