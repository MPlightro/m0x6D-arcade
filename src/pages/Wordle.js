import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Wordle.css';

// ── Word list (common 5-letter words) ─────────────────────────
const WORDS = [
  'about','above','abuse','actor','acute','admit','adopt','adult','after','again',
  'agent','agree','ahead','alarm','album','alert','alike','align','alive','alley',
  'allow','alone','along','aloud','alter','angel','anger','angle','angry','anime',
  'ankle','annex','apart','apple','apply','arena','argue','arise','armor','array',
  'arrow','aside','asset','atlas','audio','audit','avoid','awake','award','aware',
  'badly','baker','basic','basis','batch','beard','beast','began','begin','being',
  'below','bench','billy','birth','black','blade','blame','bland','blank','blast',
  'blaze','bleed','bless','blind','block','blood','bloom','blown','blown','blues',
  'blunt','board','boast','bonus','boost','booth','bored','bound','boxer','brain',
  'brand','brave','bread','break','breed','brick','bride','brief','bring','broad',
  'broke','brook','brown','brush','build','built','burst','buyer','cabin','cable',
  'camel','candy','cargo','carry','catch','cause','cease','chain','chair','chaos',
  'charm','chart','chase','cheap','check','cheek','chess','chest','chief','child',
  'china','choir','chunk','cider','civic','civil','claim','clash','class','clean',
  'clear','clerk','click','cliff','climb','cling','clock','clone','close','cloth',
  'cloud','coach','coast','color','combo','comic','comma','coral','couch','could',
  'count','court','cover','crack','craft','crane','crash','crazy','cream','creek',
  'crime','cross','crowd','crown','crush','curve','cycle','daily','dance','darts',
  'datum','deals','debut','delay','delta','dense','depot','depth','derby','devil',
  'dirty','disco','ditch','diver','dizzy','dodge','doing','doubt','dough','douse',
  'draft','drain','drama','drank','drawn','dream','dress','drift','drink','drive',
  'drone','drove','drown','drugs','drums','dryer','dwarf','eagle','early','earth',
  'eight','elect','elite','email','empty','ended','enemy','enjoy','enter','entry',
  'equal','error','essay','evade','event','every','exact','exist','extra','fable',
  'faced','faint','fairy','faith','false','fancy','fatal','fault','feast','fence',
  'fever','fiber','field','fifth','fifty','fight','final','first','fixed','flame',
  'flash','flask','fleet','flesh','float','flood','floor','flour','flown','fluid',
  'flute','focus','foggy','force','forge','forth','forum','found','frame','frank',
  'fraud','fresh','front','frost','froze','fruit','fully','funny','gains','games',
  'gauge','ghost','giant','given','glare','glass','gleam','glide','globe','gloom',
  'glory','glove','gnome','going','grace','grade','grain','grand','grant','grasp',
  'grass','grave','great','greed','green','greet','grief','grind','groan','groin',
  'gross','group','grove','grown','gruel','guess','guest','guide','guild','guilt',
  'gusto','habit','hands','happy','harsh','haste','haven','heart','heavy','heist',
  'herbs','hinge','hippo','hoist','holly','honor','horse','hotel','hound','house',
  'human','humor','hurry','hyper','ideal','image','imply','inbox','indie','infer',
  'inner','input','irony','ivory','jewel','joker','joust','judge','jumbo','juice',
  'karma','kayak','kebab','kneel','knife','knock','known','label','lance','large',
  'laser','later','laugh','layer','learn','lease','least','leave','legal','lemon',
  'level','light','limit','linen','liver','llama','logic','loose','lotto','lousy',
  'lover','lower','lucky','lunar','lunch','lying','magic','major','maker','manor',
  'march','marry','match','mayor','media','mercy','merit','metal','might','minor',
  'minus','mixed','model','money','month','moral','motor','motto','mount','mourn',
  'mouth','movie','muddy','music','naive','nerve','never','night','ninja','noble',
  'noise','north','noted','novel','nurse','nymph','occur','offer','often','olive',
  'onset','optic','orbit','order','organ','other','outer','oxide','ozone','paint',
  'panel','panic','paper','party','pasta','patch','pause','peace','peach','pearl',
  'pedal','penny','perch','phase','phone','photo','piano','piece','pilot','pinch',
  'pixel','pizza','place','plain','plane','plant','plate','plaza','plead','pluck',
  'plumb','plume','plump','plunge','plus','point','polar','polka','posed','power',
  'press','price','pride','prime','print','prior','prize','probe','prone','proof',
  'prose','proud','prove','psalm','pubic','pulse','punch','pupil','purse','pushy',
  'queen','quest','queue','quick','quiet','quota','quote','radar','radio','raise',
  'rally','ranch','range','rapid','ratio','reach','ready','realm','rebel','refer',
  'reign','relax','remix','repay','repel','reply','rerun','reset','rider','ridge',
  'right','rigid','risky','rival','river','robot','rocky','rogue','roman','roomy',
  'rough','round','route','royal','ruler','rural','rusty','sadly','saint','salad',
  'sauce','scale','scare','scene','scope','score','scout','screw','seize','sense',
  'serve','seven','shade','shaft','shake','shall','shame','shape','share','shark',
  'sharp','sheer','shelf','shell','shift','shine','shirt','shock','shoes','shoot',
  'shore','short','shout','shove','sight','sigma','silly','since','sixth','sixty',
  'sized','skill','skull','slate','sleep','slice','slide','slime','slope','sloth',
  'smart','smell','smile','smoke','snake','solar','solve','sonic','sorry','sound',
  'south','space','spark','spawn','speak','speed','spell','spend','spill','spine',
  'spite','split','spoke','spoon','spore','sport','spray','squad','stack','staff',
  'stage','stain','stair','stake','stale','stalk','stand','stark','start','state',
  'stays','steal','steam','steel','steep','steer','stern','stick','stiff','still',
  'stock','stomp','stone','stood','storm','story','stout','stove','strap','straw',
  'stray','study','stuff','stump','style','sugar','suite','sunny','super','surge',
  'swamp','swarm','swear','sweep','sweet','swift','sword','sworn','synth','table',
  'taste','taxes','teach','tears','theme','there','thick','thing','think','third',
  'thorn','those','three','threw','throw','thumb','tidal','tiger','tight','timer',
  'title','today','token','tonic','tooth','topic','total','touch','tough','tower',
  'toxic','track','trade','trail','train','trait','tramp','trash','trial','tribe',
  'trick','tried','troop','trove','truce','truck','truly','trump','trunk','trust',
  'truth','tulip','tumor','tuner','tutor','twice','twirl','twist','tying','ultra',
  'umbra','under','unify','union','unity','until','upper','upset','urban','usage',
  'usual','utter','vague','valid','valor','value','valve','vault','video','vigor',
  'viral','visit','vista','vital','vivid','vocal','voice','voter','vague','wager',
  'waste','watch','water','weary','wedge','weird','whale','wheat','wheel','where',
  'while','white','whole','whose','wider','witch','woman','women','woods','world',
  'worry','worst','worth','would','wound','wrath','write','wrote','yacht','yield',
  'young','yours','youth','zebra','zonal',
].filter(w => w.length === 5);

const WORD_SET = new Set(WORDS);
// Extra valid guesses (common 5-letter words not in answer list)
const EXTRA_VALID = new Set([
  'aahed','aalii','abaci','abaft','abase','abash','abbey','abbot','abhor','abide',
  'abler','abode','abort','abuzz','abyss','acids','ached','aches','acorn','acrid',
  'aeons','afoul','agape','agave','aghast','aglow','agony','agora','aided','aimer',
  'aired','airth','airts','aisle','algae','alibi','aloft','amaze','amble','amend',
  'amiss','amity','ample','amuck','annoy','antic','anvil','aptly','arbor','ardor',
  'argot','aroma','arson','artsy','ascot','askew','aspen','atone','attic','augur',
  'avail','avian','avid','axion','axiom','azure','babel','baffy','balmy','banjo',
  'barge','baron','basal','baste','bated','bayou','beefy','belle','beret','berth',
  'bezel','biome','bison','bitty','blare','bleat','bliss','bloat','bloke','bluff',
  'bogus','botch','brawl','brawn','braze','brisk','broth','budge','bully','bumpy',
  'buxom','byway','cabal','cairn','cameo','canny','caper','carat','carve','catty',
  'caulk','cavil','chafe','champ','chant','chard','chide','chili','chive','choir',
  'chore','cinch','clack','clamp','clang','clank','cleat','cleft','clipt','cloak',
  'clomp','clout','clove','cluck','clump','coaly','coign','colic','colon','comer',
  'comfy','conch','condo','coney','conga','conic','conus','cooky','corny','covet',
  'cower','coyly','creak','crick','croon','crumb','cruse','crypt','cubit','cuckoo',
  'cupid','curly','cutie','cutsy','cynic','daddy','daffy','daily','daisy','dandy',
  'dazed','deafy','decal','decoy','decry','deify','deign','delta','delve','depot',
  'depot','derby','deter','detox','deuce','diary','dicey','dingo','dingy','diode',
  'dowdy','dowel','dowry','drank','dregs','dried','drier','drool','droop','duchy',
  'duvet','dwelt','eager','ebony','edify','effin','elbow','emcee','emoji','envoy',
  'equip','erase','ergot','ethic','ethos','evict','extol','exult','fable','facet',
  'farce','fated','fatty','fazed','feign','feral','fetid','fiery','finch','fiord',
  'fishy','fizzy','flank','flare','fleck','flier','flinch','floss','flout',
  'foamy','folio','folly','foray','forgo','forte','fudge','fugue','fungi','funky',
  'gaily','gawky','gauzy','gecko','genial','giddy','girly','glint','gloat','glyph',
  'gnarl','gorge','gouge','gourd','graft','graze','gripe','grist','groan','gruff',
  'guile','guise','gulch','gully','gumbo','gusto','gutsy','gypsy','hippy','hoary',
  'hobby','booby','hokey','homer','hooch','hooky','horny','huffy','humus','hydra',
  'idyll','iambs','inane','inept','inert','inked','inlet','inter','intone','irate',
  'itchy','jaded','jaggy','jammy','jaunty','jazzy','jerky','jiffy','jingo','jittery',
  'jokey','jolly','jumpy','juicy','kabob','kapow','kapok','knack','knave','knead',
  'knelt','knoll','knots','kudos','laden','ladle','lanky','lapel','lapse','larva',
  'latte','leery','lemur','liege','lithe','livid','llano','loamy','loath','lofty',
  'lowly','lumpy','lusty','mangy','manly','matey','mealy','melee','messy','mimic',
  'minty','mirth','misty','mogul','moldy','molten','moody','moped','mossy','motif',
  'mousy','mucky','muddle','muggy','murky','musty','myrrh','newsy','nexus','nifty',
  'nitty','nippy','nobly','nonce','noodle','notch','nutty','oakum','odder','oddly',
  'offal','offbeat','okapi','ombre','oomph','orchid','ovary','ovoid','owing','oxide',
  'pagan','palsy','parka','parry','parse','patsy','pauper','peaky','peeve','penne',
  'peppy','perky','pesky','petty','pewit','phage','phial','pinky','pithy','plaid',
  'plait','plank','pricy','primp','privy','prowl','proxy','prude','prune','psalm',
  'puffy','puggy','pulpy','punky','pushy','pygmy','quaff','quail','qualm','qualm',
  'quash','quaff','qubit','rabid','ramen','randy','reedy','refit','repot','retro',
  'reuse','revel','rhyme','ribald','riffle','rinky','ritzy','robin','rodeo','rowdy',
  'ruddy','rugby','runny','rupee','saber','sabot','salty','sandy','sapid','sassy',
  'sauna','savor','savvy','scald','scalp','scaly','scant','scoff','scone','scoop',
  'scour','scowl','scrub','scuff','seedy','seep','serum','shady','shaky','shawl',
  'sheen','skate','skier','skimp','skipper','skulk','slain','slant','slave','sleek',
  'sleet','sloth','slunk','slurp','smack','smear','smelt','smite','smock','smoky',
  'smolt','snack','snail','snaky','snare','snark','sneer','snide','sniff','snore',
  'snort','snout','snowy','snuck','snuff','soggy','sonny','soppy','sordid','spark',
  'spank','spare','spasm','speck','spicy','spiel','spiky','spire','squab','squat',
  'squib','staid','stoic','stomp','stony','stooge','strap','studs','sulky','sully',
  'scamp','sullen','surly','sushi','sward','tacit','taffy','tangy','tapir','tardy',
  'taunt','taupe','tawny','terse','testy','thane','thews','thuds','tipsy','titan',
  'tizzy','toady','tepid','tolly','torte','tossy','tipsy','toxic','totem','troth',
  'tromp','truss','tuber','tufty','tunic','turbid','twerp','twang','typal','typic',
  'ulcer','ulnar','uncut','undue','unduly','ungainly','unmet','unwed','unwrap','upend',
  'vapid','venal','verge','vexed','viper','visor','vocab','vodka','vomit','vying',
  'wacky','waddle','wader','walkway','wanly','warty','waver','weedy','whelp','whiff',
  'whirl','wimpy','windy','wispy','witty','wooly','wormy','wrack','wraith','wring',
  'yokel','zippy','zappy','zesty','zilch','zingy','zombie',
].filter(w => w.length === 5));

function isValidWord(w) {
  return WORD_SET.has(w) || EXTRA_VALID.has(w);
}

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

// ── Tile states ───────────────────────────────────────────────
// '' | 'correct' | 'present' | 'absent'

function evaluateGuess(guess, target) {
  const result = Array(5).fill('absent');
  const pool   = target.split('');

  // Pass 1: exact matches
  for (let i = 0; i < 5; i++) {
    if (guess[i] === pool[i]) {
      result[i] = 'correct';
      pool[i] = null;
    }
  }
  // Pass 2: present
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const idx = pool.indexOf(guess[i]);
    if (idx !== -1) {
      result[i] = 'present';
      pool[idx] = null;
    }
  }
  return result;
}

function buildKeyMap(guesses) {
  const map = {};
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
    target: pickWord(),
    guesses: [],          // [{letters, result}]
    current: [],          // current typed letters
    status: 'playing',    // playing | won | lost
    invalid: false,       // shake animation trigger
    streak: 0,
  };
}

export default function Wordle({ navigate }) {
  const [game, setGame]       = useState(initState);
  const [streak, setStreak]   = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const shakeRef = useRef(false);

  const submitGuess = useCallback(() => {
    setGame(g => {
      if (g.status !== 'playing') return g;
      if (g.current.length !== 5) return { ...g, invalid: true };

      const word = g.current.join('').toLowerCase();
      if (!isValidWord(word)) return { ...g, invalid: true };

      const result = evaluateGuess(word, g.target);
      const newGuesses = [...g.guesses, { letters: word.split(''), result }];
      const won  = result.every(r => r === 'correct');
      const lost = !won && newGuesses.length >= MAX_GUESSES;

      return {
        ...g,
        guesses:  newGuesses,
        current:  [],
        invalid:  false,
        status:   won ? 'won' : lost ? 'lost' : 'playing',
      };
    });
  }, []);

  const type = useCallback((key) => {
    setGame(g => {
      if (g.status !== 'playing') return g;
      if (key === 'ENTER') return g; // handled separately
      if (key === '⌫' || key === 'BACKSPACE') {
        return { ...g, current: g.current.slice(0, -1), invalid: false };
      }
      if (g.current.length >= 5) return g;
      return { ...g, current: [...g.current, key.toUpperCase()], invalid: false };
    });
  }, []);

  const newGame = useCallback(() => {
    setShowAnswer(false);
    setGame(g => ({ ...initState(), streak: g.status === 'won' ? g.streak + 1 : 0 }));
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toUpperCase();
      if (k === 'ENTER') { e.preventDefault(); submitGuess(); }
      else if (k === 'BACKSPACE') type('BACKSPACE');
      else if (k.length === 1 && k >= 'A' && k <= 'Z') type(k);
      else if (k === 'R' && (game.status === 'won' || game.status === 'lost')) newGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitGuess, type, newGame, game.status]);

  // clear invalid after shake
  useEffect(() => {
    if (game.invalid) {
      const t = setTimeout(() => setGame(g => ({ ...g, invalid: false })), 600);
      return () => clearTimeout(t);
    }
  }, [game.invalid]);

  const keyMap = buildKeyMap(game.guesses);
  const rows   = MAX_GUESSES;
  const activeRow = game.guesses.length;

  return (
    <div className="wd-page">
      <div className="wd-topbar">
        <button className="wd-back" onClick={() => navigate('home')}>← BACK</button>
        <span className="wd-game-label">WORDLE</span>
        {streak > 0 && <span className="wd-streak">🔥 {streak}</span>}
        <button className="wd-new" onClick={newGame} title="New game (R)">NEW GAME</button>
      </div>

      {/* Grid */}
      <div className="wd-main">
        <div className="wd-grid">
          {Array.from({ length: rows }, (_, ri) => {
            const guess   = game.guesses[ri];
            const isActive = ri === activeRow && game.status === 'playing';
            const letters  = guess ? guess.letters : isActive ? game.current : [];
            const result   = guess ? guess.result  : [];
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