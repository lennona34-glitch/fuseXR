/**
 * ZX Spectrum XR & Fuse Broadcast Studio
 * Easy Cheat Engine (Preset Cheats, .POK Trainers, Custom POKE/PEEK, Live Pokefinder)
 * & Legitimate ZX Spectrum Archives Browser (Internet Archive, Spectrum Computing ZXDB, WoS Mirror, Local Library)
 */

export const CHEAT_DATABASE = [
  {
    id: 'target-renegade',
    title: 'Target: Renegade',
    publisher: 'Imagine / Ocean (1988)',
    model: '128K / +3',
    matchKeys: ['target renegade', 'renegade 2', 'renegade2'],
    cheats: [
      { name: 'Infinite Lives (Player 1)', desc: 'Lock Player 1 lives counter', pokes: [{ bank: 8, addr: 35899, val: 0 }] },
      { name: 'Infinite Energy (Player 1)', desc: 'Player 1 health bar never depletes', pokes: [{ bank: 8, addr: 35136, val: 201 }] },
      { name: 'Infinite Time', desc: 'Disable stage timer countdown', pokes: [{ bank: 8, addr: 36019, val: 0 }] },
      { name: 'One-Hit Knockouts', desc: 'Enemies drop in a single strike', pokes: [{ bank: 8, addr: 37328, val: 255 }] }
    ]
  },
  {
    id: 'renegade',
    title: 'Renegade',
    publisher: 'Imagine / Ocean (1987)',
    model: '48K / 128K',
    matchKeys: ['renegade'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Never lose a life when knocked down', pokes: [{ bank: 8, addr: 36685, val: 0 }] },
      { name: 'Infinite Time', desc: 'Stage timer never runs out', pokes: [{ bank: 8, addr: 35743, val: 0 }] },
      { name: 'Infinite Energy', desc: 'Take zero damage from gang members', pokes: [{ bank: 8, addr: 38262, val: 0 }] }
    ]
  },
  {
    id: 'robocop-2',
    title: 'RoboCop 2',
    publisher: 'Ocean Software (1990)',
    model: '128K / +3',
    matchKeys: ['robocop 2', 'robocop2'],
    cheats: [
      { name: 'Infinite Lives', desc: 'OCP titanium chassis — unlimited lives', pokes: [{ bank: 8, addr: 38252, val: 0 }] },
      { name: 'Infinite Energy', desc: 'Armor plating absorbs all gunfire', pokes: [{ bank: 8, addr: 40112, val: 0 }] },
      { name: 'Infinite Time', desc: 'No mission timer limit', pokes: [{ bank: 8, addr: 38410, val: 0 }] }
    ]
  },
  {
    id: 'robocop',
    title: 'RoboCop',
    publisher: 'Ocean Software (1988)',
    model: '48K / 128K',
    matchKeys: ['robocop'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited RoboCop units', pokes: [{ bank: 8, addr: 43273, val: 0 }] },
      { name: 'Infinite Energy', desc: 'Invulnerable to bullets and melee', pokes: [{ bank: 8, addr: 40504, val: 0 }, { bank: 8, addr: 40505, val: 0 }, { bank: 8, addr: 40506, val: 0 }] },
      { name: 'Infinite Time', desc: 'Freeze mission countdown clock', pokes: [{ bank: 8, addr: 39604, val: 0 }] },
      { name: 'Infinite Ammo', desc: 'Special weapon ammo never decreases', pokes: [{ bank: 8, addr: 41667, val: 0 }] }
    ]
  },
  {
    id: 'turrican',
    title: 'Turrican',
    publisher: 'Rainbow Arts (1990)',
    model: '128K',
    matchKeys: ['turric_1', 'turrican'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited Turrican assault suits', pokes: [{ bank: 8, addr: 44767, val: 0 }] },
      { name: 'Infinite Energy', desc: 'Shield energy never drops', pokes: [{ bank: 8, addr: 44675, val: 0 }, { bank: 8, addr: 44700, val: 0 }] },
      { name: 'Infinite Time', desc: 'Explore levels without time pressure', pokes: [{ bank: 8, addr: 29560, val: 0 }] },
      { name: 'Infinite Gyro / Lines', desc: 'Unlimited special attacks & morphs', pokes: [{ bank: 8, addr: 43123, val: 0 }] }
    ]
  },
  {
    id: 'turrican-2',
    title: 'Turrican II: The Final Fight',
    publisher: 'Rainbow Arts (1991)',
    model: '128K / +3',
    matchKeys: ['turrican 2', 'turrican ii', 'turrican2'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited lives across all worlds', pokes: [{ bank: 8, addr: 25134, val: 0 }] },
      { name: 'Infinite Energy', desc: 'Invulnerable to enemy projectiles', pokes: [{ bank: 8, addr: 29258, val: 0 }, { bank: 8, addr: 29892, val: 0 }] },
      { name: 'Infinite Smart Bombs', desc: 'Unlimited screen-clearing super weapons', pokes: [{ bank: 8, addr: 25982, val: 0 }] }
    ]
  },
  {
    id: 'emlyn-hughes',
    title: 'Emlyn Hughes International Soccer',
    publisher: 'Audiogenic Software (1989)',
    model: '128K / +3',
    matchKeys: ['emlyn hughes', 'soccer'],
    cheats: [
      { name: 'Max Player Stamina / Speed Boost', desc: 'Keep squad fitness at peak level', pokes: [{ bank: 8, addr: 51200, val: 255 }] },
      { name: 'Freeze Match Clock (90 Min)', desc: 'Extend match play time', pokes: [{ bank: 8, addr: 49812, val: 0 }] }
    ]
  },
  {
    id: 'manic-miner',
    title: 'Manic Miner',
    publisher: 'Bug-Byte / Software Projects (1983)',
    model: '48K',
    matchKeys: ['manic miner', 'manic'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Miner Willy never runs out of lives', pokes: [{ bank: 8, addr: 35136, val: 0 }] },
      { name: 'Infinite Air Supply', desc: 'Cavern oxygen bar never depletes', pokes: [{ bank: 8, addr: 34804, val: 0 }] },
      { name: 'Walk Through Guardians (Immunity)', desc: 'Total immunity to cavern monsters & spikes', pokes: [{ bank: 8, addr: 36108, val: 0 }, { bank: 8, addr: 35897, val: 0 }] },
      { name: 'Enable 6031769 Teleporter Cheat', desc: 'Unlock classic Bug-Byte level select', pokes: [{ bank: 8, addr: 33882, val: 0 }] }
    ]
  },
  {
    id: 'jet-set-willy',
    title: 'Jet Set Willy',
    publisher: 'Software Projects (1984)',
    model: '48K',
    matchKeys: ['jet set willy', 'jsw'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Willy can explore the mansion forever', pokes: [{ bank: 8, addr: 35899, val: 0 }] },
      { name: 'Immunity to Monsters', desc: 'Pass safely through all guardians', pokes: [{ bank: 8, addr: 37982, val: 0 }, { bank: 8, addr: 38000, val: 0 }] },
      { name: 'Safe Fall From Any Height', desc: 'Disable fatal fall height check', pokes: [{ bank: 8, addr: 36479, val: 0 }] },
      { name: 'Fix Attic / Banyan Tree Bugs', desc: 'Official POKEs to make all 60 items completable', pokes: [{ bank: 8, addr: 59901, val: 84 }, { bank: 8, addr: 56876, val: 4 }] }
    ]
  },
  {
    id: 'jack-the-nipper',
    title: 'Jack the Nipper',
    publisher: 'Gremlin Graphics (1986)',
    model: '48K',
    matchKeys: ['jacknip1', 'jack the nipper'],
    cheats: [
      { name: 'Total Immunity (No Naughty Rash)', desc: 'Naughty meter never fills from ghosts or adults', pokes: [{ bank: 8, addr: 44278, val: 58 }, { bank: 8, addr: 44285, val: 58 }] }
    ]
  },
  {
    id: 'jack-the-nipper-2',
    title: 'Jack the Nipper II: In Coconut Capers',
    publisher: 'Gremlin Graphics (1987)',
    model: '48K / 128K',
    matchKeys: ['jacknip2', 'coconut capers'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited lives in the jungle', pokes: [{ bank: 8, addr: 37619, val: 0 }] },
      { name: 'Immunity to Jungle Hazards', desc: 'Take zero damage from enemies', pokes: [{ bank: 8, addr: 38112, val: 0 }] }
    ]
  },
  {
    id: 'wonderful-dizzy',
    title: 'Dizzy VIII: Wonderful Dizzy',
    publisher: 'The Oliver Twins (2020)',
    model: '128K',
    matchKeys: ['wonderful dizzy', 'dizzy viii', 'dizzy 8'],
    cheats: [
      { name: 'Infinite Lives (9 Lives)', desc: 'Keep Dizzy at max lives in the Land of Oz', pokes: [{ bank: 8, addr: 49162, val: 9 }] }
    ]
  },
  {
    id: 'dizzy-series',
    title: 'Dizzy / Treasure Island / Fantasy World Dizzy',
    publisher: 'Codemasters (1987–1991)',
    model: '48K / 128K',
    matchKeys: ['dizzy', 'treasure island', 'fantasy world', 'magicland'],
    cheats: [
      { name: 'Dizzy I — Infinite Lives', desc: 'Original Dizzy: The Ultimate Cartoon Adventure', pokes: [{ bank: 8, addr: 62598, val: 0 }] },
      { name: 'Treasure Island Dizzy — Immunity', desc: 'Walk through water and traps safely', pokes: [{ bank: 8, addr: 56247, val: 195 }] },
      { name: 'Fantasy World Dizzy — Infinite Lives', desc: 'Unlimited lives in Fantasy World', pokes: [{ bank: 8, addr: 36301, val: 0 }] },
      { name: 'Magicland Dizzy — Infinite Lives & Energy', desc: 'Never lose lives or energy bar', pokes: [{ bank: 8, addr: 36858, val: 0 }] }
    ]
  },
  {
    id: 'chuckie-egg',
    title: 'Chuckie Egg',
    publisher: 'A&F Software (1983)',
    model: '48K',
    matchKeys: ['chuckie egg', 'chuckie'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Hen-House Harry never runs out of lives', pokes: [{ bank: 8, addr: 45135, val: 0 }] },
      { name: 'Infinite Bonus Timer', desc: 'Clock never counts down', pokes: [{ bank: 8, addr: 44643, val: 0 }] }
    ]
  },
  {
    id: 'chase-hq',
    title: 'Chase H.Q.',
    publisher: 'Ocean Software / Taito (1989)',
    model: '128K',
    matchKeys: ['chase h.q.', 'chase hq', 'chasehq'],
    cheats: [
      { name: 'Infinite Time', desc: 'Never run out of pursuit time', pokes: [{ bank: 8, addr: 38297, val: 0 }] },
      { name: 'Infinite Turbos (99 Nitros)', desc: 'Unlimited turbo boosts per stage', pokes: [{ bank: 8, addr: 39140, val: 0 }] }
    ]
  },
  {
    id: 'r-type',
    title: 'R-Type',
    publisher: 'Electric Dreams / Activision (1988)',
    model: '48K / 128K',
    matchKeys: ['r-type', 'rtype'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited R-9 Arrowhead fighters', pokes: [{ bank: 8, addr: 37338, val: 0 }] },
      { name: 'Invincibility (Hull Shield)', desc: 'Pass through Bydo Empire fire & walls', pokes: [{ bank: 8, addr: 47292, val: 201 }, { bank: 8, addr: 47692, val: 201 }] }
    ]
  },
  {
    id: 'sabre-wulf',
    title: 'Sabre Wulf',
    publisher: 'Ultimate Play the Game (1984)',
    model: '48K',
    matchKeys: ['sabre wulf', 'sabrewulf'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Sabreman never loses a life', pokes: [{ bank: 8, addr: 44808, val: 0 }] },
      { name: 'Permanent Blue Orchid Speed & Immunity', desc: 'Stay invincible in the jungle', pokes: [{ bank: 8, addr: 42369, val: 201 }] }
    ]
  },
  {
    id: 'knight-lore',
    title: 'Knight Lore',
    publisher: 'Ultimate Play the Game (1984)',
    model: '48K',
    matchKeys: ['knight lore', 'knightlore'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Sabreman never runs out of lives', pokes: [{ bank: 8, addr: 57188, val: 0 }] },
      { name: 'Immunity to Traps & Enemies', desc: 'Walk across spikes and monsters safely', pokes: [{ bank: 8, addr: 56026, val: 0 }] },
      { name: 'Infinite 40 Days Timer', desc: 'Cauldron curse deadline never expires', pokes: [{ bank: 8, addr: 50076, val: 0 }] }
    ]
  },
  {
    id: 'jetpac',
    title: 'Jetpac',
    publisher: 'Ultimate Play the Game (1983)',
    model: '16K / 48K',
    matchKeys: ['jetpac'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Jetman never runs out of lives', pokes: [{ bank: 8, addr: 30107, val: 0 }] },
      { name: 'Invincibility', desc: 'Aliens pass straight through Jetman', pokes: [{ bank: 8, addr: 29972, val: 0 }] }
    ]
  },
  {
    id: 'atic-atac',
    title: 'Atic Atac',
    publisher: 'Ultimate Play the Game (1983)',
    model: '48K',
    matchKeys: ['atic atac', 'aticatac'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited lives in the castle', pokes: [{ bank: 8, addr: 36307, val: 0 }] },
      { name: 'Infinite Roast Chicken Energy', desc: 'Health never drains', pokes: [{ bank: 8, addr: 38246, val: 0 }] },
      { name: 'Walk Through Locked Doors', desc: 'Pass through any colored door without keys', pokes: [{ bank: 8, addr: 33696, val: 0 }] }
    ]
  },
  {
    id: 'head-over-heels',
    title: 'Head Over Heels',
    publisher: 'Ocean Software (1987)',
    model: '48K / 128K',
    matchKeys: ['head over heels'],
    cheats: [
      { name: 'Infinite Lives (Head & Heels)', desc: 'Both characters have unlimited lives', pokes: [{ bank: 8, addr: 35306, val: 0 }] },
      { name: 'Infinite Doughnuts (Ammo)', desc: 'Unlimited hooter shots to freeze enemies', pokes: [{ bank: 8, addr: 33409, val: 0 }] },
      { name: 'Permanent Shield & High Jump', desc: 'Keep power-ups active forever', pokes: [{ bank: 8, addr: 35418, val: 0 }, { bank: 8, addr: 35432, val: 0 }] }
    ]
  },
  {
    id: 'myth',
    title: 'Myth: History in the Making',
    publisher: 'System 3 (1989)',
    model: '48K / 128K',
    matchKeys: ['myth'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited lives across all mythological eras', pokes: [{ bank: 8, addr: 39188, val: 0 }] },
      { name: 'Infinite Energy', desc: 'Invulnerable to skeletons, dragons & bosses', pokes: [{ bank: 8, addr: 39150, val: 0 }] }
    ]
  },
  {
    id: 'exolon',
    title: 'Exolon',
    publisher: 'Hewson Consultants (1987)',
    model: '48K / 128K',
    matchKeys: ['exolon'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Vitorc never runs out of lives', pokes: [{ bank: 8, addr: 32510, val: 0 }] },
      { name: 'Infinite Ammo & Grenades', desc: 'Unlimited blaster & rocket rounds', pokes: [{ bank: 8, addr: 30322, val: 0 }, { bank: 8, addr: 34406, val: 0 }] }
    ]
  },
  {
    id: 'cybernoid',
    title: 'Cybernoid: The Fighting Machine',
    publisher: 'Hewson Consultants (1988)',
    model: '48K / 128K',
    matchKeys: ['cybernoid'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited Cybernoid ships', pokes: [{ bank: 8, addr: 30133, val: 0 }] },
      { name: 'Infinite Time', desc: 'Disable pirate cargo timer', pokes: [{ bank: 8, addr: 30222, val: 0 }] },
      { name: 'Infinite Rear Shield / Bouncers / Bombs', desc: 'All special weapons never run out', pokes: [{ bank: 8, addr: 31727, val: 0 }, { bank: 8, addr: 31802, val: 0 }] }
    ]
  },
  {
    id: 'green-beret',
    title: 'Green Beret',
    publisher: 'Imagine / Konami (1986)',
    model: '48K',
    matchKeys: ['green beret', 'rush n attack'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited commando lives', pokes: [{ bank: 8, addr: 44445, val: 0 }] },
      { name: 'Infinite Flamethrower / Bazooka / Grenades', desc: 'Special weapons never run out of ammo', pokes: [{ bank: 8, addr: 41664, val: 0 }] }
    ]
  },
  {
    id: 'ghosts-n-goblins',
    title: "Ghosts 'n Goblins",
    publisher: 'Elite Systems (1986)',
    model: '48K',
    matchKeys: ['ghosts n goblins', 'ghosts'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Sir Arthur never runs out of lives', pokes: [{ bank: 8, addr: 37412, val: 0 }] },
      { name: 'Infinite Time', desc: 'Graveyard timer never expires', pokes: [{ bank: 8, addr: 38262, val: 0 }] }
    ]
  },
  {
    id: 'rainbow-islands',
    title: 'Rainbow Islands',
    publisher: 'Ocean Software / Taito (1990)',
    model: '48K / 128K',
    matchKeys: ['rainbow islands', 'rainbow'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Bubby & Bobby never run out of lives', pokes: [{ bank: 8, addr: 39267, val: 0 }] },
      { name: 'Permanent Triple Fast Rainbows', desc: 'Start with max rainbow magic & speed shoes', pokes: [{ bank: 8, addr: 37846, val: 1 }, { bank: 8, addr: 37848, val: 2 }] }
    ]
  },
  {
    id: 'bubble-bobble',
    title: 'Bubble Bobble',
    publisher: 'Firebird / Taito (1987)',
    model: '48K / 128K',
    matchKeys: ['bubble bobble', 'bubble'],
    cheats: [
      { name: 'Infinite Lives (P1 & P2)', desc: 'Bub and Bob have unlimited lives', pokes: [{ bank: 8, addr: 39836, val: 0 }] }
    ]
  },
  {
    id: 'bomb-jack',
    title: 'Bomb Jack',
    publisher: 'Elite Systems (1986)',
    model: '48K',
    matchKeys: ['bomb jack', 'bombjack'],
    cheats: [
      { name: 'Infinite Lives', desc: 'Unlimited Bomb Jack lives', pokes: [{ bank: 8, addr: 53654, val: 0 }] },
      { name: 'Immunity to Enemies', desc: 'Mummies and birds cannot harm Jack', pokes: [{ bank: 8, addr: 50533, val: 201 }] }
    ]
  },
  {
    id: 'elite',
    title: 'Elite',
    publisher: 'Firebird (1985)',
    model: '48K / 128K',
    matchKeys: ['elite'],
    cheats: [
      { name: 'Infinite Shields & Energy Banks', desc: 'Cobra Mk III shields never fail in combat', pokes: [{ bank: 8, addr: 45125, val: 0 }] },
      { name: 'Max Cash (999,999.9 CR)', desc: 'Rich Commander credits for all equipment', pokes: [{ bank: 8, addr: 23782, val: 255 }, { bank: 8, addr: 23783, val: 255 }] }
    ]
  },
  {
    id: 'skool-daze',
    title: 'Skool Daze & Back to Skool',
    publisher: 'Microsphere (1984–1985)',
    model: '48K',
    matchKeys: ['skool daze', 'back to skool', 'skool'],
    cheats: [
      { name: 'Zero Lines (Never Expelled)', desc: 'Mr Rockitt & teachers never add lines', pokes: [{ bank: 8, addr: 31797, val: 24 }] }
    ]
  },
  {
    id: 'xeno',
    title: 'Xeno',
    publisher: 'Binary Design / A&F (1986)',
    model: '48K',
    matchKeys: ['xeno'],
    cheats: [
      { name: 'Infinite Lives / Turns', desc: 'Official XENO.POK trainer', pokes: [{ bank: 8, addr: 22225, val: 1 }] }
    ]
  }
];

export const VERIFIED_ARCHIVES = [
  {
    id: 'internet-archive',
    name: 'Internet Archive — ZX Spectrum Library',
    badge: '12,305 Games • Direct Play & Download',
    url: 'https://archive.org/details/softwarelibrary_zx_spectrum',
    searchTab: 'ia',
    desc: 'Official 501(c)(3) non-profit digital library preservation collection containing 12,305 ZX Spectrum snapshots (.Z80, .SNA), tapes (.TAP, .TZX), and disks (.DSK) with open CORS streaming.'
  },
  {
    id: 'spectrum-computing',
    name: 'Spectrum Computing (ZXDB) & World of Spectrum Mirror',
    badge: '29,000+ Releases + Official .POK Trainers',
    url: 'https://spectrumcomputing.co.uk/',
    searchTab: 'zxdb',
    desc: 'The definitive open relational database of every Sinclair ZX Spectrum release, magazine covertape, and official .POK trainer file, backed by the World of Spectrum preservation archive.'
  },
  {
    id: 'world-of-spectrum',
    name: 'World of Spectrum (Official Preservation Archive)',
    badge: 'Endorsed by Amstrad / Sinclair Preservation',
    url: 'https://worldofspectrum.org/',
    searchTab: 'zxdb',
    desc: 'Historic Sinclair archive granted formal distribution endorsement by Amstrad (Cliff Lawson, 1999) for preserving ZX Spectrum heritage.'
  },
  {
    id: 'itch-io-zx',
    name: 'itch.io — Modern ZX Spectrum Homebrew & Indie Games',
    badge: 'New 2020–2026 Releases (.TAP / .TZX / .DSK)',
    url: 'https://itch.io/games/tag-zx-spectrum',
    searchTab: null,
    desc: 'Hundreds of brand-new legitimate freeware and commercial ZX Spectrum games created by modern indie developers and Next/128K creators.'
  },
  {
    id: 'zx-art',
    name: 'ZX-Art — Demoscene, Homebrew, Graphics & AY Music',
    badge: 'Demoscene & Party Releases',
    url: 'https://zxart.ee/eng/software/',
    searchTab: null,
    desc: 'Open archive of ZX Spectrum demoscene productions, modern party games, pixel artscreens, and PT3/AY chiptunes.'
  },
  {
    id: 'planeta-sinclair',
    name: 'Planeta Sinclair — International Preservation Portal',
    badge: 'Curated Releases & Articles',
    url: 'https://planetasinclair.blogspot.com/',
    searchTab: null,
    desc: 'Long-running preservation portal cataloging newly discovered prototypes, international releases, and modern homebrew.'
  },
  {
    id: 'tipshop',
    name: 'The Tipshop — Classic ZX Spectrum Pokes & Maps',
    badge: 'Thousands of .POK & Multiface Pokes',
    url: 'http://www.the-tipshop.co.uk/',
    searchTab: null,
    desc: 'Classic archive of magazine tips, Multiface POKEs, game maps, and complete walkthroughs.'
  }
];

export const BUNDLED_GAMES_CATALOG = [
  { name: 'Emlyn Hughes International Soccer (+3 Disk)', relPath: '/games/Emlyn Hughes International Soccer (1990)(Audiogenic Software).dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Emlyn Hughes International Soccer (128K Snapshot)', relPath: '/games/Emlyn Hughes International Soccer (1989)(Audiogenic Software).z80', format: 'z80', is128K: true, category: 'Bundled Snapshot' },
  { name: 'Emlyn Hughes International Soccer (Tape)', relPath: '/games/Emlyn Hughes International Soccer (1989)(Audiogenic Software).tap', format: 'tap', is128K: true, category: 'Bundled Tape' },
  { name: 'Target: Renegade (+3 Disk)', relPath: '/games/Renegade 2 - Target Renegade.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Target: Renegade (Tape)', relPath: '/games/Renegade2.tap', format: 'tap', is128K: true, category: 'Bundled Tape' },
  { name: 'Target: Renegade (TZX Tape)', relPath: '/games/TargetRenegade.tzx', format: 'tzx', is128K: true, category: 'Bundled TZX' },
  { name: 'Renegade (+3 Disk)', relPath: '/games/Renegade.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Renegade (Tape)', relPath: '/games/Renegade.tap', format: 'tap', is128K: true, category: 'Bundled Tape' },
  { name: 'RoboCop 2 (+3 Disk)', relPath: '/games/Robocop 2.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'RoboCop 3 (+3 Disk)', relPath: '/games/Robocop 3.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Turrican (128K Snapshot)', relPath: '/games/TURRIC_1.Z80', format: 'z80', is128K: true, category: 'Bundled Snapshot' },
  { name: 'Turrican (+3 Disk Side A)', relPath: '/games/Turrican - Side A.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Turrican II: The Final Fight (+3 Disk Side A)', relPath: '/games/Turrican 2 - Side A.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Dizzy VIII: Wonderful Dizzy (2020 v1.5)', relPath: '/games/Dizzy VIII - Wonderful Dizzy (2020) v1.5.tap', format: 'tap', is128K: true, category: 'Bundled Homebrew' },
  { name: 'Fantasy World Dizzy (+3 Disk)', relPath: '/games/Dizzy 3 - Fantasy World Dizzy.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Magicland Dizzy (+3 Disk)', relPath: '/games/Dizzy 4 - Magicland Dizzy.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Spellbound Dizzy (+3 Disk)', relPath: '/games/Dizzy 5 - Spellbound Dizzy.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Prince of the Yolkfolk (+3 Disk)', relPath: '/games/Dizzy 6 - Prince of the Yolkfolk.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Crystal Kingdom Dizzy (+3 Disk)', relPath: '/games/Dizzy 7 - Crystal Kingdom Dizzy.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Jack the Nipper (Tape)', relPath: '/games/JACKNIP1.TAP', format: 'tap', is128K: false, category: 'Bundled Tape', pokFile: '/games/JACKNIP1.POK' },
  { name: 'Jack the Nipper II: In Coconut Capers (Tape)', relPath: '/games/JACKNIP2.TAP', format: 'tap', is128K: false, category: 'Bundled Tape', pokFile: '/games/JACKNIP2.POK' },
  { name: 'Chase H.Q. (Tape)', relPath: '/games/Chase H.Q..tap', format: 'tap', is128K: true, category: 'Bundled Tape' },
  { name: 'Chase H.Q. II: Special Criminal Investigation (+3 Disk)', relPath: '/games/Chase H.Q. II - Special Criminal Investigation.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'R-Type (Tape)', relPath: '/games/R-Type.tap', format: 'tap', is128K: false, category: 'Bundled Tape' },
  { name: 'Myth: History in the Making (+3 Disk)', relPath: '/games/Myth - History in the Making.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Midnight Resistance (+3 Disk)', relPath: '/games/Midnight Resistance.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Operation Wolf (+3 Disk)', relPath: '/games/Operation Wolf.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Pang (+3 Disk)', relPath: '/games/Pang.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Rainbow Islands (+3 Disk)', relPath: '/games/Rainbow Islands.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Rick Dangerous (+3 Disk)', relPath: '/games/Rick Dangerous.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Rick Dangerous 2 (+3 Disk)', relPath: '/games/Rick Dangerous 2.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Golden Axe (+3 Disk)', relPath: '/games/Golden Axe.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Shadow Warriors / Ninja Gaiden (+3 Disk)', relPath: '/games/Shadow Warriors.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Shinobi (+3 Disk)', relPath: '/games/Shinobi.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: ' Prince of Persia (+3 Disk)', relPath: '/games/Prince of Persia.dsk', format: 'dsk', is128K: true, category: 'Bundled +3 Disk' },
  { name: 'Dune II Demo (Pentagon TR-DOS)', relPath: '/games/DUNE2_D.TRD', format: 'trd', is128K: true, category: 'Bundled TR-DOS' },
  { name: 'Fire & Ice (Pentagon TR-DOS)', relPath: '/games/Fire&Ice.trd', format: 'trd', is128K: true, category: 'Bundled TR-DOS' },
  { name: 'Xeno (Snapshot)', relPath: '/games/XENO2.Z80', format: 'z80', is128K: false, category: 'Bundled Snapshot', pokFile: '/games/XENO.POK' }
];

/**
 * Pure-JS Minimal ZIP Extractor (Supports Stored method=0 and Deflate method=8 via DecompressionStream)
 */
export async function extractPlayableFromZip(zipUint8) {
  const view = new DataView(zipUint8.buffer, zipUint8.byteOffset, zipUint8.byteLength);
  const decoder = new TextDecoder('utf-8');
  const entries = [];
  let offset = 0;

  while (offset + 30 <= zipUint8.length) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) break; // Local file header signature
    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const uncompSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const name = decoder.decode(zipUint8.subarray(offset + 30, offset + 30 + nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > zipUint8.length) break;

    entries.push({ name, method, compSize, uncompSize, compData: zipUint8.subarray(dataStart, dataEnd) });
    offset = dataEnd;
  }

  const priorityExts = ['z80', 'sna', 'szx', 'tap', 'tzx', 'dsk', 'trd', 'scl', 'pok'];
  entries.sort((a, b) => {
    const extA = (a.name.split('.').pop() || '').toLowerCase();
    const extB = (b.name.split('.').pop() || '').toLowerCase();
    const idxA = priorityExts.indexOf(extA);
    const idxB = priorityExts.indexOf(extB);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  const target = entries.find(e => {
    const ext = (e.name.split('.').pop() || '').toLowerCase();
    return priorityExts.includes(ext);
  });

  if (!target) return null;

  let rawBytes = null;
  if (target.method === 0) {
    rawBytes = new Uint8Array(target.compData);
  } else if (target.method === 8 && typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(target.compData);
    writer.close();
    const resp = new Response(ds.readable);
    const ab = await resp.arrayBuffer();
    rawBytes = new Uint8Array(ab);
  }

  if (!rawBytes) return null;
  const ext = (target.name.split('.').pop() || '').toLowerCase();
  return { name: target.name.split('/').pop(), ext, bytes: rawBytes };
}

/**
 * Standard ZX Spectrum .POK File Parser
 */
export function parsePokFile(text, sourceLabel = 'Trainer.pok') {
  const lines = (text || '').split(/\r?\n/);
  const trainers = [];
  let current = null;

  for (const rawLine of lines) {
    if (!rawLine || rawLine.length === 0) continue;
    const tag = rawLine[0];
    const rest = rawLine.slice(1).trim();

    if (tag === 'N' || tag === 'n') {
      current = {
        name: rest || 'Unnamed Trainer',
        source: sourceLabel,
        active: false,
        askValue: false,
        customValue: 255,
        pokes: []
      };
      trainers.push(current);
    } else if ((tag === 'M' || tag === 'Z' || tag === 'm' || tag === 'z') && current) {
      const parts = rest.split(/\s+/).map(Number);
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const bank = parts[0];
        const addr = parts[1];
        const val = parts[2];
        const orig = parts.length >= 4 && !isNaN(parts[3]) ? parts[3] : 0;
        if (val === 256) current.askValue = true;
        current.pokes.push({ bank, addr, val, orig });
      }
    } else if (tag === 'Y' || tag === 'y') {
      break;
    }
  }
  return trainers;
}

export class CheatAndArchiveManager {
  constructor(app) {
    this.app = app;
    this.spectrum = app.spectrum;
    this.gamesLibrary = app.gamesLibrary;

    // Saved original bytes keyed by `${bank}:${addr}` so any cheat/poke can be cleanly undone
    this.originalBytes = new Map();
    // Active preset cheat keys (`${gameId}:${cheatIdx}`)
    this.activePresetCheats = new Set();
    // Loaded .POK trainers
    this.pokTrainers = [];
    // Active custom POKEs list
    this.customPokes = [];

    // Local JS Pokefinder state (mirrors Fuse pokefinder.c across 16384..65535)
    this.pfSnapshot = new Uint8Array(65536);
    this.pfPossible = new Uint8Array(65536);
    this.pfCount = 0;
    this.pfInitialized = false;

    // Whether we are connected to Fuse C native backend (`fuse.exe`)
    this.fuseBackendAvailable = false;

    this.initModals();
    this.detectFuseBackend();
    this.preloadBundledPoks();
  }

  async detectFuseBackend() {
    try {
      const res = await fetch('/status.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.port === 'number') {
          this.fuseBackendAvailable = true;
          window.__FUSE_NATIVE_BACKEND__ = true;
          console.log('[CheatAndArchiveManager] Connected to Fuse C Native Backend on port', data.port);
        }
      }
    } catch (_) {
      this.fuseBackendAvailable = false;
    }
  }

  async preloadBundledPoks() {
    const pokFiles = [
      { path: '/games/JACKNIP1.POK', label: 'Jack the Nipper (JACKNIP1.POK)' },
      { path: '/games/JACKNIP2.POK', label: 'Jack the Nipper II (JACKNIP2.POK)' },
      { path: '/games/XENO.POK', label: 'Xeno (XENO.POK)' }
    ];
    for (const pf of pokFiles) {
      try {
        const res = await fetch(pf.path);
        if (res.ok) {
          const txt = await res.text();
          const parsed = parsePokFile(txt, pf.label);
          this.pokTrainers.push(...parsed);
        }
      } catch (_) {}
    }
    this.renderPokTrainers();
  }

  peekByte(bank, addr) {
    addr &= 0xffff;
    if (bank >= 0 && bank < 8 && this.spectrum && this.spectrum.pagedMemory) {
      return this.spectrum.pagedMemory.ram[bank][addr & 0x3fff];
    }
    return this.spectrum ? this.spectrum.readByte(addr) : 0;
  }

  pokeByte(bank, addr, val, label = 'Custom POKE', recordCustom = false) {
    addr &= 0xffff;
    val &= 0xff;
    const key = `${bank}:${addr}`;
    const current = this.peekByte(bank, addr);
    if (!this.originalBytes.has(key)) {
      this.originalBytes.set(key, current);
    }
    const orig = this.originalBytes.get(key);

    if (bank >= 0 && bank < 8 && this.spectrum && this.spectrum.pagedMemory) {
      this.spectrum.pagedMemory.ram[bank][addr & 0x3fff] = val;
    } else if (this.spectrum) {
      this.spectrum.writeByte(addr, val);
    }

    if (this.fuseBackendAvailable) {
      fetch(`/api/cheats/action?cmd=poke&bank=${bank}&addr=${addr}&val=${val}&name=${encodeURIComponent(label)}`).catch(() => {});
    }

    if (recordCustom) {
      const existing = this.customPokes.find(p => p.bank === bank && p.addr === addr);
      if (existing) {
        existing.val = val;
        existing.label = label;
      } else {
        this.customPokes.unshift({ bank, addr, val, orig, label });
      }
      this.renderCustomPokes();
    }
    this.updateActiveCheatBadge();
    return orig;
  }

  restoreByte(bank, addr) {
    addr &= 0xffff;
    const key = `${bank}:${addr}`;
    if (this.originalBytes.has(key)) {
      const orig = this.originalBytes.get(key);
      if (bank >= 0 && bank < 8 && this.spectrum && this.spectrum.pagedMemory) {
        this.spectrum.pagedMemory.ram[bank][addr & 0x3fff] = orig & 0xff;
      } else if (this.spectrum) {
        this.spectrum.writeByte(addr, orig & 0xff);
      }
      this.originalBytes.delete(key);
    }
    if (this.fuseBackendAvailable) {
      fetch(`/api/cheats/action?cmd=unpoke&bank=${bank}&addr=${addr}`).catch(() => {});
    }
    this.customPokes = this.customPokes.filter(p => !(p.bank === bank && p.addr === addr));
    this.renderCustomPokes();
    this.updateActiveCheatBadge();
  }

  clearAllCheats() {
    for (const [key] of Array.from(this.originalBytes.entries())) {
      const [bStr, aStr] = key.split(':');
      this.restoreByte(Number(bStr), Number(aStr));
    }
    this.activePresetCheats.clear();
    this.pokTrainers.forEach(t => { t.active = false; });
    this.customPokes = [];
    if (this.fuseBackendAvailable) {
      fetch('/api/cheats/action?cmd=clear_all').catch(() => {});
    }
    this.renderPresetCheats();
    this.renderPokTrainers();
    this.renderCustomPokes();
    this.updateActiveCheatBadge();
  }

  updateActiveCheatBadge() {
    const totalActive = this.activePresetCheats.size +
      this.pokTrainers.filter(t => t.active).length +
      this.customPokes.length;
    const badgeEl = document.getElementById('cheat-active-count');
    const headerBtn = document.getElementById('btn-open-cheats');
    if (badgeEl) {
      badgeEl.textContent = totalActive > 0 ? `${totalActive} Active` : 'Ready';
      badgeEl.style.background = totalActive > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)';
      badgeEl.style.color = totalActive > 0 ? '#34d399' : '#94a3b8';
    }
    if (headerBtn) {
      const txtEl = headerBtn.querySelector('.btn-text');
      if (txtEl) txtEl.textContent = totalActive > 0 ? `Easy Cheat (${totalActive})` : 'Easy Cheat';
    }
  }

  /* ==========================================================================
   * Live Pokefinder (Memory Value / Infinite Lives Finder)
   * ========================================================================== */
  pokefinderReset() {
    this.pfPossible.fill(1, 0x4000, 0x10000);
    this.pfPossible.fill(0, 0, 0x4000);
    for (let a = 0x4000; a < 0x10000; a++) {
      this.pfSnapshot[a] = this.peekByte(8, a);
    }
    this.pfCount = 49152;
    this.pfInitialized = true;
    if (this.fuseBackendAvailable) {
      fetch('/api/cheats/action?cmd=pf_reset').catch(() => {});
    }
    this.renderPokefinderResults();
  }

  pokefinderSearchExact(targetVal) {
    targetVal &= 0xff;
    if (!this.pfInitialized) this.pokefinderReset();
    let count = 0;
    for (let a = 0x4000; a < 0x10000; a++) {
      if (!this.pfPossible[a]) continue;
      const cur = this.peekByte(8, a);
      if (cur === targetVal) {
        this.pfSnapshot[a] = cur;
        count++;
      } else {
        this.pfPossible[a] = 0;
      }
    }
    this.pfCount = count;
    if (this.fuseBackendAvailable) {
      fetch(`/api/cheats/action?cmd=pf_search&val=${targetVal}`).catch(() => {});
    }
    this.renderPokefinderResults();
  }

  pokefinderDelta(mode) {
    if (!this.pfInitialized) this.pokefinderReset();
    let count = 0;
    for (let a = 0x4000; a < 0x10000; a++) {
      if (!this.pfPossible[a]) continue;
      const cur = this.peekByte(8, a);
      const prev = this.pfSnapshot[a];
      const match = (mode === 'dec') ? (cur < prev) : (cur > prev);
      if (match) {
        this.pfSnapshot[a] = cur;
        count++;
      } else {
        this.pfPossible[a] = 0;
      }
    }
    this.pfCount = count;
    if (this.fuseBackendAvailable) {
      fetch(`/api/cheats/action?cmd=${mode === 'dec' ? 'pf_dec' : 'pf_inc'}`).catch(() => {});
    }
    this.renderPokefinderResults();
  }

  /* ==========================================================================
   * Modals & UI Wiring
   * ========================================================================== */
  initModals() {
    this.initEasyCheatModal();
    this.initArchivesModal();
  }

  initEasyCheatModal() {
    const modal = document.getElementById('cheat-modal');
    const btnOpen = document.getElementById('btn-open-cheats');
    const btnFsOpen = document.getElementById('btn-fs-cheats');
    const btnClose = document.getElementById('btn-close-cheats');
    const btnClearAll = document.getElementById('btn-cheat-clear-all');
    const searchInput = document.getElementById('cheat-search-input');

    const openModal = () => {
      if (!modal) return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      modal.classList.add('visible');
      this.renderPresetCheats(searchInput ? searchInput.value : '');
      this.renderPokTrainers();
      this.renderCustomPokes();
      this.renderPokefinderResults();
    };

    const closeModal = () => {
      if (modal) modal.classList.remove('visible');
    };

    if (btnOpen) btnOpen.addEventListener('click', openModal);
    if (btnFsOpen) btnFsOpen.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }
    if (btnClearAll) {
      btnClearAll.addEventListener('click', () => this.clearAllCheats());
    }

    // Tab switching inside Easy Cheat modal
    const tabs = document.querySelectorAll('#cheat-modal .cheat-tab');
    const panels = document.querySelectorAll('#cheat-modal .cheat-panel');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        const panel = document.getElementById(targetId);
        if (panel) panel.classList.add('active');
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.renderPresetCheats(searchInput.value);
      });
    }

    // .POK file upload button & ZXDB .POK auto-finder
    const btnUploadPok = document.getElementById('btn-upload-pok');
    const btnFindZxdbPok = document.getElementById('btn-find-zxdb-pok');
    const zxdbPokInput = document.getElementById('pok-zxdb-query');

    if (btnUploadPok) {
      btnUploadPok.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pok,.txt';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const text = await file.text();
          const trainers = parsePokFile(text, file.name);
          this.pokTrainers.unshift(...trainers);
          this.renderPokTrainers();
          if (this.fuseBackendAvailable) {
            const buf = await file.arrayBuffer();
            fetch(`/api/upload?name=${encodeURIComponent(file.name)}`, {
              method: 'POST',
              body: buf
            }).catch(() => {});
          }
        };
        input.click();
      });
    }

    if (btnFindZxdbPok) {
      btnFindZxdbPok.addEventListener('click', () => {
        const activeTitle = document.getElementById('program_name')?.textContent || '';
        const q = (zxdbPokInput && zxdbPokInput.value.trim()) ||
          activeTitle.replace(/\(.*?\)|\..*$/g, '').replace(/Sinclair.*BASIC/i, '').trim() ||
          'Target Renegade';
        if (zxdbPokInput) zxdbPokInput.value = q;
        this.fetchPokFromZxdb(q);
      });
    }

    // Custom POKE & PEEK buttons
    const btnApplyPokeString = document.getElementById('btn-apply-poke-str');
    const pokeStringInput = document.getElementById('custom-poke-str');
    const btnApplySinglePoke = document.getElementById('btn-apply-single-poke');
    const btnPeekAddr = document.getElementById('btn-peek-addr');

    if (btnApplyPokeString && pokeStringInput) {
      const applyStr = () => {
        const raw = pokeStringInput.value.trim();
        if (!raw) return;
        const segments = raw.split(/[:;\n]+/);
        let applied = 0;
        for (const seg of segments) {
          const m = seg.match(/(?:POKE\s+)?(\$?[0-9a-fA-F]+|0x[0-9a-fA-F]+)\s*,\s*(\$?[0-9a-fA-F]+|0x[0-9a-fA-F]+)/i);
          if (m) {
            const parseNum = (s) => s.startsWith('$') ? parseInt(s.slice(1), 16) : parseInt(s, 0);
            const addr = parseNum(m[1]);
            const val = parseNum(m[2]);
            if (addr >= 16384 && addr <= 65535 && val >= 0 && val <= 255) {
              this.pokeByte(8, addr, val, `POKE ${addr},${val}`, true);
              applied++;
            }
          }
        }
        if (applied > 0) pokeStringInput.value = '';
      };
      btnApplyPokeString.addEventListener('click', applyStr);
      pokeStringInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyStr();
      });
    }

    if (btnApplySinglePoke) {
      btnApplySinglePoke.addEventListener('click', () => {
        const bank = Number(document.getElementById('custom-poke-bank')?.value ?? 8);
        const addrStr = (document.getElementById('custom-poke-addr')?.value || '').trim();
        const valStr = (document.getElementById('custom-poke-val')?.value || '').trim();
        const label = (document.getElementById('custom-poke-label')?.value || '').trim() || 'Custom POKE';
        const addr = addrStr.startsWith('$') ? parseInt(addrStr.slice(1), 16) : parseInt(addrStr, 0);
        const val = valStr.startsWith('$') ? parseInt(valStr.slice(1), 16) : parseInt(valStr, 0);
        if (!isNaN(addr) && addr >= 0 && addr <= 65535 && !isNaN(val) && val >= 0 && val <= 255) {
          this.pokeByte(bank, addr, val, label, true);
        }
      });
    }

    if (btnPeekAddr) {
      btnPeekAddr.addEventListener('click', () => {
        const addrStr = (document.getElementById('peek-addr-input')?.value || '35899').trim();
        const addr = addrStr.startsWith('$') ? parseInt(addrStr.slice(1), 16) : parseInt(addrStr, 0);
        const outEl = document.getElementById('peek-result-box');
        if (!outEl || isNaN(addr) || addr < 0 || addr > 65535) return;
        const bytes = [];
        for (let i = 0; i < 8; i++) {
          const a = (addr + i) & 0xffff;
          const b = this.peekByte(8, a);
          bytes.push(`${a} ($${a.toString(16).toUpperCase().padStart(4, '0')}): <strong style="color:#00ffaa;">${b}</strong> ($${b.toString(16).toUpperCase().padStart(2, '0')})`);
        }
        outEl.innerHTML = bytes.join(' &bull; ');
      });
    }

    // Pokefinder buttons
    document.getElementById('btn-pf-reset')?.addEventListener('click', () => this.pokefinderReset());
    document.getElementById('btn-pf-search')?.addEventListener('click', () => {
      const val = parseInt(document.getElementById('pf-search-val')?.value || '3', 10);
      if (!isNaN(val)) this.pokefinderSearchExact(val);
    });
    document.getElementById('btn-pf-dec')?.addEventListener('click', () => this.pokefinderDelta('dec'));
    document.getElementById('btn-pf-inc')?.addEventListener('click', () => this.pokefinderDelta('inc'));

    this.renderPresetCheats();
    this.renderCustomPokes();
    this.renderPokefinderResults();
  }

  renderPresetCheats(filterQuery = '') {
    const container = document.getElementById('cheat-preset-list');
    if (!container) return;

    const activeProgram = (document.getElementById('program_name')?.textContent || '').toLowerCase();
    const q = (filterQuery || '').trim().toLowerCase();

    const games = [...CHEAT_DATABASE].sort((a, b) => {
      const aMatch = a.matchKeys.some(k => activeProgram.includes(k));
      const bMatch = b.matchKeys.some(k => activeProgram.includes(k));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return a.title.localeCompare(b.title);
    });

    const filtered = games.filter(g => {
      if (!q) return true;
      return g.title.toLowerCase().includes(q) ||
        g.publisher.toLowerCase().includes(q) ||
        g.cheats.some(c => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
    });

    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:#94a3b8;">No preset cheats match "${filterQuery}". Use the <b>.POK Trainers</b> tab to auto-fetch from Spectrum Computing (ZXDB) or the <b>Live Pokefinder</b> tab!</div>`;
      return;
    }

    filtered.forEach(game => {
      const isCurrentGame = game.matchKeys.some(k => activeProgram.includes(k));
      const card = document.createElement('div');
      card.className = 'cheat-game-card' + (isCurrentGame ? ' current-game' : '');

      const header = document.createElement('div');
      header.className = 'cheat-game-header';
      header.innerHTML = `
        <div>
          <div class="cheat-game-title">
            ${isCurrentGame ? '<span class="badge-active-game">🎯 ACTIVE GAME</span> ' : ''}
            ${game.title}
            <span class="badge-128" style="margin-left:6px;">${game.model}</span>
          </div>
          <div style="font-size:0.75rem; color:#8b92a8; margin-top:2px;">${game.publisher}</div>
        </div>
      `;

      const activateAllBtn = document.createElement('button');
      activateAllBtn.className = 'mini-btn';
      activateAllBtn.style.cssText = 'background:rgba(16,185,129,0.18); color:#34d399; border-color:rgba(16,185,129,0.4); font-weight:700;';
      activateAllBtn.textContent = '⚡ Toggle All';
      activateAllBtn.addEventListener('click', () => {
        const allActive = game.cheats.every((_, idx) => this.activePresetCheats.has(`${game.id}:${idx}`));
        game.cheats.forEach((c, idx) => {
          this.setPresetCheatState(game, idx, c, !allActive);
        });
        this.renderPresetCheats(filterQuery);
      });
      header.appendChild(activateAllBtn);
      card.appendChild(header);

      const list = document.createElement('div');
      list.className = 'cheat-items-grid';

      game.cheats.forEach((cheat, idx) => {
        const key = `${game.id}:${idx}`;
        const isActive = this.activePresetCheats.has(key);
        const item = document.createElement('div');
        item.className = 'cheat-toggle-row' + (isActive ? ' active' : '');

        const pokeSummary = cheat.pokes.map(p => `POKE ${p.addr},${p.val}`).join(' : ');
        item.innerHTML = `
          <div style="min-width:0;">
            <div style="font-size:0.84rem; font-weight:700; color:${isActive ? '#34d399' : '#e2e8f0'};">${cheat.name}</div>
            <div style="font-size:0.73rem; color:#94a3b8;">${cheat.desc}</div>
            <div style="font-size:0.68rem; font-family:monospace; color:#38bdf8; margin-top:2px;">${pokeSummary}</div>
          </div>
        `;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'cheat-switch-btn' + (isActive ? ' on' : '');
        toggleBtn.textContent = isActive ? 'ON ✓' : 'OFF';
        toggleBtn.addEventListener('click', () => {
          this.setPresetCheatState(game, idx, cheat, !isActive);
          this.renderPresetCheats(filterQuery);
        });

        item.appendChild(toggleBtn);
        list.appendChild(item);
      });

      card.appendChild(list);
      container.appendChild(card);
    });
  }

  setPresetCheatState(game, idx, cheat, enable) {
    const key = `${game.id}:${idx}`;
    if (enable) {
      this.activePresetCheats.add(key);
      for (const p of cheat.pokes) {
        this.pokeByte(p.bank ?? 8, p.addr, p.val, `${game.title}: ${cheat.name}`, false);
      }
    } else {
      this.activePresetCheats.delete(key);
      for (const p of cheat.pokes) {
        this.restoreByte(p.bank ?? 8, p.addr);
      }
    }
    this.updateActiveCheatBadge();
  }

  renderPokTrainers() {
    const container = document.getElementById('pok-trainer-list');
    if (!container) return;
    container.innerHTML = '';

    if (this.pokTrainers.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:#94a3b8;">No .POK trainers loaded yet. Click <b>Auto-Find .POK on ZXDB</b> or upload a local <code>.POK</code> file!</div>`;
      return;
    }

    this.pokTrainers.forEach((trainer) => {
      const row = document.createElement('div');
      row.className = 'cheat-toggle-row' + (trainer.active ? ' active' : '');

      const pokeStr = trainer.pokes.map(p => `POKE ${p.addr},${p.val === 256 ? trainer.customValue : p.val}`).join(' : ');
      const info = document.createElement('div');
      info.innerHTML = `
        <div style="font-size:0.86rem; font-weight:700; color:${trainer.active ? '#34d399' : '#f1f5f9'};">${trainer.name}</div>
        <div style="font-size:0.72rem; color:#94a3b8;">Source: ${trainer.source}</div>
        <div style="font-size:0.68rem; font-family:monospace; color:#38bdf8; margin-top:2px;">${pokeStr}</div>
      `;

      const rightBox = document.createElement('div');
      rightBox.style.cssText = 'display:flex; align-items:center; gap:6px;';

      if (trainer.askValue) {
        const valInput = document.createElement('input');
        valInput.type = 'number';
        valInput.min = '0';
        valInput.max = '255';
        valInput.value = String(trainer.customValue ?? 255);
        valInput.style.cssText = 'width:58px; background:#12151f; color:#fff; border:1px solid #334155; border-radius:4px; padding:4px 6px; font-size:0.78rem;';
        valInput.addEventListener('change', () => {
          trainer.customValue = Math.max(0, Math.min(255, Number(valInput.value) || 0));
        });
        rightBox.appendChild(valInput);
      }

      const btn = document.createElement('button');
      btn.className = 'cheat-switch-btn' + (trainer.active ? ' on' : '');
      btn.textContent = trainer.active ? 'ACTIVE ✓' : 'ACTIVATE';
      btn.addEventListener('click', () => {
        trainer.active = !trainer.active;
        for (const p of trainer.pokes) {
          const v = (p.val === 256) ? (trainer.customValue ?? 255) : p.val;
          if (trainer.active) {
            this.pokeByte(p.bank ?? 8, p.addr, v, trainer.name, false);
          } else {
            this.restoreByte(p.bank ?? 8, p.addr);
          }
        }
        this.renderPokTrainers();
      });

      rightBox.appendChild(btn);
      row.appendChild(info);
      row.appendChild(rightBox);
      container.appendChild(row);
    });
  }

  async fetchPokFromZxdb(query) {
    const statusEl = document.getElementById('pok-zxdb-status');
    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#00d2ff;">🔍 Searching Spectrum Computing (ZXDB) for "${query}" .POK trainers...</span>`;
    }
    try {
      const searchRes = await fetch(`https://api.zxinfo.dk/v3/search?query=${encodeURIComponent(query)}&mode=compact&size=10&offset=0`);
      if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
      const searchData = await searchRes.json();
      const hits = searchData?.hits?.hits || [];
      let loadedCount = 0;

      for (const hit of hits.slice(0, 5)) {
        const entryId = hit._id;
        const title = hit._source?.title || query;
        const fullRes = await fetch(`https://api.zxinfo.dk/v3/games/${entryId}?mode=full`);
        if (!fullRes.ok) continue;
        const fullData = await fullRes.json();
        const addls = fullData?._source?.additionalDownloads || [];
        const pokFiles = addls.filter(a => (a.path || '').toLowerCase().endsWith('.pok'));

        for (const pf of pokFiles) {
          const urls = [
            `https://cors.archive.org/cors/World_of_Spectrum_June_2017_Mirror/World%20of%20Spectrum%20June%202017%20Mirror.zip/World%20of%20Spectrum%20June%202017%20Mirror${pf.path.replace(/^\/pub/, '')}`,
            `https://spectrumcomputing.co.uk${pf.path}`
          ];
          for (const u of urls) {
            try {
              const r = await fetch(u);
              if (r.ok) {
                const txt = await r.text();
                const parsed = parsePokFile(txt, `${title} (${pf.path.split('/').pop()})`);
                if (parsed.length > 0) {
                  this.pokTrainers.unshift(...parsed);
                  loadedCount += parsed.length;
                  break;
                }
              }
            } catch (_) {}
          }
        }
        if (loadedCount > 0) break;
      }

      this.renderPokTrainers();
      if (statusEl) {
        if (loadedCount > 0) {
          statusEl.innerHTML = `<span style="color:#34d399;">✅ Loaded ${loadedCount} official .POK trainer(s) from Spectrum Computing!</span>`;
        } else {
          statusEl.innerHTML = `<span style="color:#facc15;">ℹ️ No separate .POK file found on ZXDB for "${query}" — check the Instant Game Cheats tab or Live Pokefinder!</span>`;
        }
      }
    } catch (err) {
      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#ef4444;">⚠️ Could not reach ZXDB API (${err.message}). Local .POK trainers remain available.</span>`;
      }
    }
  }

  renderCustomPokes() {
    const container = document.getElementById('custom-poke-list');
    if (!container) return;
    container.innerHTML = '';

    if (this.customPokes.length === 0) {
      container.innerHTML = `<div style="padding:1rem; color:#7b8196; text-align:center; font-size:0.82rem;">No custom POKEs active. Enter a POKE above (e.g. <code>POKE 35899, 0</code>) to patch live Z80 RAM.</div>`;
      return;
    }

    this.customPokes.forEach(p => {
      const row = document.createElement('div');
      row.className = 'cheat-toggle-row active';
      row.innerHTML = `
        <div>
          <div style="font-size:0.84rem; font-weight:700; color:#34d399;">${p.label}</div>
          <div style="font-size:0.74rem; font-family:monospace; color:#38bdf8;">
            Bank ${p.bank === 8 ? '48K/Active' : p.bank} &bull; Addr ${p.addr} ($${p.addr.toString(16).toUpperCase().padStart(4, '0')}) &bull; Value: <b>${p.val}</b> (Original: ${p.orig})
          </div>
        </div>
      `;
      const undoBtn = document.createElement('button');
      undoBtn.className = 'mini-btn warn-btn';
      undoBtn.style.marginLeft = '0';
      undoBtn.textContent = '↩️ Restore (' + p.orig + ')';
      undoBtn.addEventListener('click', () => {
        this.restoreByte(p.bank, p.addr);
      });
      row.appendChild(undoBtn);
      container.appendChild(row);
    });
  }

  renderPokefinderResults() {
    const countEl = document.getElementById('pf-candidate-count');
    const listEl = document.getElementById('pf-candidate-list');
    if (countEl) {
      countEl.textContent = this.pfInitialized ? `${this.pfCount.toLocaleString()} addresses` : 'Not started (Click Search Value or Reset)';
    }
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!this.pfInitialized) {
      listEl.innerHTML = `<div style="padding:1.25rem; color:#94a3b8; text-align:center; font-size:0.82rem;">
        <b>How to find Infinite Lives in any game:</b><br/>
        1. Start your game and see how many lives you have (e.g. <code>3</code>). Enter <code>3</code> above and click <b>🎯 Search Exact Value</b>.<br/>
        2. Lose 1 life in the game, then come back and click <b>📉 Decreased (-1)</b> (or search <code>2</code>).<br/>
        3. Repeat once more and click <b>🔒 Lock / POKE 255</b> on the matching address!
      </div>`;
      return;
    }

    const candidates = [];
    for (let a = 0x4000; a < 0x10000 && candidates.length < 35; a++) {
      if (this.pfPossible[a]) {
        candidates.push({ addr: a, cur: this.peekByte(8, a), prev: this.pfSnapshot[a] });
      }
    }

    if (candidates.length === 0) {
      listEl.innerHTML = `<div style="padding:1.25rem; color:#ef4444; text-align:center;">0 candidate addresses remaining. Click <b>🔄 Reset Finder</b> to start a new scan.</div>`;
      return;
    }

    candidates.forEach(c => {
      const row = document.createElement('div');
      row.className = 'cheat-toggle-row';
      row.innerHTML = `
        <div style="font-family:monospace; font-size:0.82rem;">
          <strong style="color:#38bdf8;">Addr ${c.addr}</strong> ($${c.addr.toString(16).toUpperCase().padStart(4, '0')})
          &bull; Current: <strong style="color:#00ffaa;">${c.cur}</strong> (Last: ${c.prev})
        </div>
      `;
      const btnBox = document.createElement('div');
      btnBox.style.cssText = 'display:flex; gap:6px;';

      const lock9Btn = document.createElement('button');
      lock9Btn.className = 'mini-btn';
      lock9Btn.textContent = `🔒 POKE ${c.addr}, 9`;
      lock9Btn.addEventListener('click', () => {
        this.pokeByte(8, c.addr, 9, `Pokefinder Lock (${c.addr}=9)`, true);
      });

      const lock255Btn = document.createElement('button');
      lock255Btn.className = 'mini-btn';
      lock255Btn.style.cssText = 'background:rgba(16,185,129,0.2); color:#34d399; border-color:rgba(16,185,129,0.45);';
      lock255Btn.textContent = `🔒 POKE ${c.addr}, 255`;
      lock255Btn.addEventListener('click', () => {
        this.pokeByte(8, c.addr, 255, `Pokefinder Lock (${c.addr}=255)`, true);
      });

      const nopBtn = document.createElement('button');
      nopBtn.className = 'mini-btn';
      nopBtn.title = 'Useful if preceding byte is DEC (HL) / DEC A instruction';
      nopBtn.textContent = `⚡ POKE ${c.addr}, 0`;
      nopBtn.addEventListener('click', () => {
        this.pokeByte(8, c.addr, 0, `Pokefinder NOP (${c.addr}=0)`, true);
      });

      btnBox.appendChild(lock9Btn);
      btnBox.appendChild(lock255Btn);
      btnBox.appendChild(nopBtn);
      row.appendChild(btnBox);
      listEl.appendChild(row);
    });
  }

  /* ==========================================================================
   * Legitimate ZX Spectrum Archives & Multi-Source Search (#tosec-modal)
   * ========================================================================== */
  initArchivesModal() {
    const modal = document.getElementById('tosec-modal');
    const searchInput = document.getElementById('tosec-search-input');
    const btnSearch = document.getElementById('btn-tosec-search');
    const sourceTabs = document.querySelectorAll('.archive-source-tab');
    const pills = document.querySelectorAll('.tosec-filter-pills .pill');
    const quickTags = document.querySelectorAll('.quick-tag');

    this.archiveSource = 'ia'; // 'ia' | 'zxdb' | 'local' | 'portals'
    this.archiveCategory = 'all';

    sourceTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sourceTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.archiveSource = tab.dataset.source;
        this.executeArchiveSearch(searchInput ? searchInput.value.trim() : '');
      });
    });

    pills.forEach(p => {
      p.addEventListener('click', () => {
        pills.forEach(x => x.classList.remove('active'));
        p.classList.add('active');
        this.archiveCategory = p.dataset.cat;
        this.executeArchiveSearch(searchInput ? searchInput.value.trim() : '');
      });
    });

    quickTags.forEach(tag => {
      tag.addEventListener('click', () => {
        if (searchInput) searchInput.value = tag.dataset.query;
        this.executeArchiveSearch(tag.dataset.query);
      });
    });

    if (btnSearch) {
      btnSearch.addEventListener('click', () => {
        this.executeArchiveSearch(searchInput ? searchInput.value.trim() : '');
      });
    }

    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          this.executeArchiveSearch(searchInput.value.trim());
        }
      });
    }

    const btnOpen = document.getElementById('btn-open-tosec');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        if (modal) modal.classList.add('visible');
        const q = (searchInput && searchInput.value.trim()) || 'Target Renegade';
        if (searchInput && !searchInput.value.trim()) searchInput.value = q;
        this.executeArchiveSearch(q);
      });
    }
  }

  async executeArchiveSearch(query = '') {
    const resultsContainer = document.getElementById('tosec-results-list');
    if (!resultsContainer) return;

    if (this.archiveSource === 'portals') {
      this.renderVerifiedPortals(resultsContainer);
      return;
    }

    if (this.archiveSource === 'local') {
      await this.searchLocalAndTosec(query, resultsContainer);
      return;
    }

    if (this.archiveSource === 'zxdb') {
      await this.searchSpectrumComputingZxdb(query || 'Renegade', resultsContainer);
      return;
    }

    // Default: Internet Archive ZX Spectrum Software Library (12,305 games)
    await this.searchInternetArchive(query || 'Target Renegade', resultsContainer);
  }

  renderVerifiedPortals(container) {
    container.innerHTML = '';
    const intro = document.createElement('div');
    intro.style.cssText = 'padding:0.65rem 0.9rem; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); border-radius:10px; color:#d1fae5; font-size:0.82rem; margin-bottom:0.4rem;';
    intro.innerHTML = `<b>🏛️ Legitimate ZX Spectrum Preservation Archives:</b> Unlike other 8-bit systems, Sir Clive Sinclair / Amstrad formally granted preservation distribution permission to the ZX Spectrum community in 1999. Browse directly in-app or visit the official portals below:`;
    container.appendChild(intro);

    VERIFIED_ARCHIVES.forEach(portal => {
      const row = document.createElement('div');
      row.className = 'tosec-item';
      row.innerHTML = `
        <div style="flex:1; min-width:0;">
          <div class="tosec-item-title" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span>${portal.name}</span>
            <span class="badge-128" style="background:rgba(56,189,248,0.18); color:#38bdf8;">${portal.badge}</span>
          </div>
          <div style="font-size:0.78rem; color:#94a3b8; margin-top:4px; line-height:1.35;">${portal.desc}</div>
          <div style="font-size:0.72rem; font-family:monospace; color:#10b981; margin-top:3px;">${portal.url}</div>
        </div>
      `;

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex; gap:6px; flex-shrink:0; align-items:center;';

      if (portal.searchTab) {
        const inAppBtn = document.createElement('button');
        inAppBtn.className = 'hud-btn btn-random';
        inAppBtn.textContent = '🔍 Browse In-App';
        inAppBtn.addEventListener('click', () => {
          const tab = document.querySelector(`.archive-source-tab[data-source="${portal.searchTab}"]`);
          if (tab) tab.click();
        });
        actions.appendChild(inAppBtn);
      }

      const link = document.createElement('a');
      link.href = portal.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'hud-btn btn-tosec';
      link.style.textDecoration = 'none';
      link.textContent = '🌐 Open Site ↗';
      actions.appendChild(link);

      row.appendChild(actions);
      container.appendChild(row);
    });
  }

  async searchLocalAndTosec(query, container) {
    container.innerHTML = `<div style="text-align:center; padding:2rem; color:#00d2ff;">Searching Local Bundled Games & TOSEC Library...</div>`;
    const q = (query || '').toLowerCase();

    const localMatches = BUNDLED_GAMES_CATALOG.filter(item => {
      if (this.archiveCategory !== 'all' && item.format !== this.archiveCategory) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });

    let serverResults = [];
    try {
      const data = await this.gamesLibrary.searchTosec(query, this.archiveCategory, 40);
      if (data && Array.isArray(data.results)) {
        serverResults = data.results;
      }
    } catch (_) {}

    const combined = [...localMatches, ...serverResults];
    container.innerHTML = '';

    if (combined.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:2.5rem; color:#94a3b8;">No local games matched "${query}". Switch to the <b>🌐 Internet Archive (12k)</b> or <b>🏛️ Spectrum Computing (29k)</b> tab above to stream & download from online archives!</div>`;
      return;
    }

    combined.forEach(item => {
      const row = document.createElement('div');
      row.className = 'tosec-item';
      row.innerHTML = `
        <div>
          <div class="tosec-item-title">${item.name}</div>
          <div class="tosec-item-badges">
            <span class="format-badge format-${item.format}">${item.format.toUpperCase()}</span>
            ${item.is128K ? '<span class="badge-128">128K / +3</span>' : '<span class="badge-128" style="background:rgba(148,163,184,0.2);color:#cbd5e1;">48K</span>'}
            <span style="font-size:0.72rem; color:#94a3b8;">${item.category || 'Local Archive'}</span>
          </div>
        </div>
      `;

      const btnGroup = document.createElement('div');
      btnGroup.style.cssText = 'display:flex; gap:6px; align-items:center;';

      if (item.pokFile) {
        const pokBtn = document.createElement('button');
        pokBtn.className = 'mini-btn';
        pokBtn.style.cssText = 'background:rgba(168,85,247,0.2); color:#d8b4fe; border-color:rgba(168,85,247,0.45); font-weight:700;';
        pokBtn.textContent = '🧬 Cheats';
        pokBtn.addEventListener('click', () => {
          document.getElementById('tosec-modal')?.classList.remove('visible');
          document.getElementById('btn-open-cheats')?.click();
        });
        btnGroup.appendChild(pokBtn);
      }

      const dlLink = document.createElement('a');
      dlLink.href = item.relPath.startsWith('/') ? item.relPath : `/api/tosec/download?path=${encodeURIComponent(item.relPath)}`;
      dlLink.download = item.name + '.' + item.format;
      dlLink.className = 'mini-btn';
      dlLink.style.textDecoration = 'none';
      dlLink.textContent = '⬇️ Save';
      btnGroup.appendChild(dlLink);

      const playBtn = document.createElement('button');
      playBtn.className = 'hud-btn btn-random';
      playBtn.textContent = '▶ Play';
      playBtn.addEventListener('click', async () => {
        document.getElementById('tosec-modal')?.classList.remove('visible');
        if (item.relPath.startsWith('/games/')) {
          const model = item.format === 'dsk' ? 'SpectrumPlus3' : (item.format === 'trd' ? 'Pentagon128' : (item.is128K ? 'Spectrum128K' : 'Spectrum48K'));
          this.app.updateModelBadge(model);
          this.gamesLibrary.loadGameByPath(item.relPath, item.format, model);
          if (this.fuseBackendAvailable) {
            fetch(`/api/control?action=load_local&file=${encodeURIComponent(item.relPath.replace('/games/', ''))}`).catch(() => {});
          }
        } else {
          this.gamesLibrary.loadTosecGame(item.relPath, item.format, item.name, item.is128K);
        }
      });
      btnGroup.appendChild(playBtn);

      row.appendChild(btnGroup);
      container.appendChild(row);
    });
  }

  async searchInternetArchive(query, container) {
    container.innerHTML = `<div style="text-align:center; padding:2.5rem; color:#00d2ff;">🌐 Searching Internet Archive ZX Spectrum Software Library (12,305 titles) for "${query}"...</div>`;
    try {
      const safeQ = query.replace(/["()]/g, ' ').trim() || 'Renegade';
      const url = `https://archive.org/advancedsearch.php?q=collection:(softwarelibrary_zx_spectrum)+AND+title:(${encodeURIComponent(safeQ)})&fl[]=identifier,title,creator,year&rows=35&page=1&output=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const docs = data?.response?.docs || [];

      container.innerHTML = '';
      if (docs.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:2.5rem; color:#94a3b8;">No Internet Archive items matched "${query}". Try searching on the <b>🏛️ Spectrum Computing (ZXDB)</b> tab!</div>`;
        return;
      }

      docs.forEach(doc => {
        const id = doc.identifier;
        const title = doc.title || id;
        const creator = Array.isArray(doc.creator) ? doc.creator.join(', ') : (doc.creator || 'Sinclair Preservation');
        const year = doc.year || '198x';
        const is128 = /128|\+3|plus 3/i.test(title);

        const row = document.createElement('div');
        row.className = 'tosec-item';
        row.innerHTML = `
          <div style="min-width:0; flex:1;">
            <div class="tosec-item-title">${title}</div>
            <div class="tosec-item-badges">
              <span class="format-badge format-z80">ARCHIVE.ORG</span>
              ${is128 ? '<span class="badge-128">128K</span>' : '<span class="badge-128" style="background:rgba(148,163,184,0.2);color:#cbd5e1;">48K/128K</span>'}
              <span style="font-size:0.73rem; color:#94a3b8;">${creator} (${year})</span>
            </div>
          </div>
        `;

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex; gap:6px; align-items:center; flex-shrink:0;';

        const pageLink = document.createElement('a');
        pageLink.href = `https://archive.org/details/${encodeURIComponent(id)}`;
        pageLink.target = '_blank';
        pageLink.rel = 'noopener noreferrer';
        pageLink.className = 'mini-btn';
        pageLink.style.textDecoration = 'none';
        pageLink.title = 'View Archive.org Preservation Page';
        pageLink.textContent = '🏛️ Page ↗';

        const dlBtn = document.createElement('button');
        dlBtn.className = 'mini-btn';
        dlBtn.textContent = '⬇️ Download';
        dlBtn.addEventListener('click', () => this.downloadOrPlayInternetArchiveItem(id, title, dlBtn, true));

        const playBtn = document.createElement('button');
        playBtn.className = 'hud-btn btn-random';
        playBtn.textContent = '▶ Play Now';
        playBtn.addEventListener('click', () => this.downloadOrPlayInternetArchiveItem(id, title, playBtn, false));

        btnGroup.appendChild(pageLink);
        btnGroup.appendChild(dlBtn);
        btnGroup.appendChild(playBtn);
        row.appendChild(btnGroup);
        container.appendChild(row);
      });
    } catch (err) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">⚠️ Internet Archive search error: ${err.message}. Try the Local Library or Spectrum Computing tab.</div>`;
    }
  }

  async downloadOrPlayInternetArchiveItem(identifier, title, btnEl, saveToDiskOnly = false) {
    const origLabel = btnEl.textContent;
    btnEl.textContent = '⏳ Fetching...';
    btnEl.disabled = true;
    try {
      const metaRes = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
      if (!metaRes.ok) throw new Error(`Metadata HTTP ${metaRes.status}`);
      const meta = await metaRes.json();
      const files = meta?.files || [];

      const playableExts = ['z80', 'sna', 'tap', 'tzx', 'dsk', 'trd'];
      const candidate = files.find(f => {
        const ext = ((f.name || '').split('.').pop() || '').toLowerCase();
        return playableExts.includes(ext);
      }) || files.find(f => (f.name || '').toLowerCase().endsWith('.zip'));

      if (!candidate) throw new Error('No playable ZX Spectrum image found in archive item');

      const corsUrl = `https://cors.archive.org/cors/${encodeURIComponent(identifier)}/${encodeURIComponent(candidate.name).replace(/%2F/g, '/')}`;
      if (saveToDiskOnly) {
        const a = document.createElement('a');
        a.href = corsUrl;
        a.download = candidate.name.split('/').pop();
        document.body.appendChild(a);
        a.click();
        a.remove();
        btnEl.textContent = '✅ Saved';
        setTimeout(() => { btnEl.textContent = origLabel; btnEl.disabled = false; }, 1500);
        return;
      }

      const binRes = await fetch(corsUrl);
      if (!binRes.ok) throw new Error(`Download HTTP ${binRes.status}`);
      const ab = await binRes.arrayBuffer();
      let bytes = new Uint8Array(ab);
      let fileName = candidate.name.split('/').pop();
      let ext = (fileName.split('.').pop() || '').toLowerCase();

      if (ext === 'zip') {
        const extracted = await extractPlayableFromZip(bytes);
        if (!extracted) throw new Error('Could not extract playable image from ZIP');
        bytes = extracted.bytes;
        fileName = extracted.name;
        ext = extracted.ext;
      }

      await this.bootBinaryInEmulatorAndFuse(bytes, fileName, ext, title);
      document.getElementById('tosec-modal')?.classList.remove('visible');
    } catch (err) {
      console.error('[InternetArchive] Load error:', err);
      btnEl.textContent = '⚠️ Error';
    } finally {
      setTimeout(() => { btnEl.textContent = origLabel; btnEl.disabled = false; }, 1200);
    }
  }

  async searchSpectrumComputingZxdb(query, container) {
    container.innerHTML = `<div style="text-align:center; padding:2.5rem; color:#00d2ff;">🏛️ Querying Spectrum Computing (ZXDB) & World of Spectrum Mirror for "${query}"...</div>`;
    try {
      const res = await fetch(`https://api.zxinfo.dk/v3/search?query=${encodeURIComponent(query)}&mode=compact&size=25&offset=0`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hits = data?.hits?.hits || [];

      container.innerHTML = '';
      if (hits.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:2.5rem; color:#94a3b8;">No Spectrum Computing (ZXDB) entries matched "${query}".</div>`;
        return;
      }

      hits.forEach(hit => {
        const src = hit._source || {};
        const id = hit._id;
        const title = src.title || 'Unknown Title';
        const pub = src.publishers?.[0]?.name || src.authors?.[0]?.name || 'Sinclair Release';
        const year = src.originalYearOfRelease || '198x';
        const mach = src.machineType || 'ZX-Spectrum 48K';
        const is128 = /128|\+3|\+2/i.test(mach);
        const avail = src.availability || 'Available';

        const row = document.createElement('div');
        row.className = 'tosec-item';
        row.innerHTML = `
          <div style="min-width:0; flex:1;">
            <div class="tosec-item-title">${title}</div>
            <div class="tosec-item-badges">
              <span class="format-badge format-tzx">ZXDB #${id}</span>
              ${is128 ? '<span class="badge-128">128K</span>' : '<span class="badge-128" style="background:rgba(148,163,184,0.2);color:#cbd5e1;">48K</span>'}
              <span style="font-size:0.73rem; color:#94a3b8;">${pub} (${year}) &bull; ${avail}</span>
            </div>
          </div>
        `;

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex; gap:6px; align-items:center; flex-shrink:0;';

        const pokBtn = document.createElement('button');
        pokBtn.className = 'mini-btn';
        pokBtn.style.cssText = 'background:rgba(168,85,247,0.18); color:#d8b4fe; border-color:rgba(168,85,247,0.4); font-weight:700;';
        pokBtn.textContent = '🧬 .POK';
        pokBtn.title = 'Fetch Official .POK Trainers from ZXDB';
        pokBtn.addEventListener('click', async () => {
          document.getElementById('tosec-modal')?.classList.remove('visible');
          document.getElementById('btn-open-cheats')?.click();
          const pokTab = document.querySelector('#cheat-modal .cheat-tab[data-tab="panel-pok-files"]');
          if (pokTab) pokTab.click();
          await this.fetchPokFromZxdb(title);
        });

        const zxdbLink = document.createElement('a');
        zxdbLink.href = `https://spectrumcomputing.co.uk/entry/${encodeURIComponent(id)}`;
        zxdbLink.target = '_blank';
        zxdbLink.rel = 'noopener noreferrer';
        zxdbLink.className = 'mini-btn';
        zxdbLink.style.textDecoration = 'none';
        zxdbLink.textContent = '🏛️ ZXDB ↗';

        const dlBtn = document.createElement('button');
        dlBtn.className = 'mini-btn';
        dlBtn.textContent = '⬇️ Save';
        dlBtn.addEventListener('click', () => this.downloadOrPlayZxdbItem(id, title, is128, dlBtn, true));

        const playBtn = document.createElement('button');
        playBtn.className = 'hud-btn btn-random';
        playBtn.textContent = '▶ Play Now';
        playBtn.addEventListener('click', () => this.downloadOrPlayZxdbItem(id, title, is128, playBtn, false));

        btnGroup.appendChild(pokBtn);
        btnGroup.appendChild(zxdbLink);
        btnGroup.appendChild(dlBtn);
        btnGroup.appendChild(playBtn);
        row.appendChild(btnGroup);
        container.appendChild(row);
      });
    } catch (err) {
      container.innerHTML = `<div style="text-align:center; padding:2rem; color:#ef4444;">⚠️ ZXDB API error: ${err.message}</div>`;
    }
  }

  async downloadOrPlayZxdbItem(entryId, title, is128, btnEl, saveToDiskOnly = false) {
    const origLabel = btnEl.textContent;
    btnEl.textContent = '⏳ Loading...';
    btnEl.disabled = true;
    try {
      const res = await fetch(`https://api.zxinfo.dk/v3/games/${encodeURIComponent(entryId)}?mode=full`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const src = data?._source || {};

      // Auto-load any .POK trainer files attached to this ZXDB entry!
      const addls = src.additionalDownloads || [];
      const pokEntry = addls.find(a => (a.path || '').toLowerCase().endsWith('.pok'));
      if (pokEntry && !saveToDiskOnly) {
        const wosPokUrl = `https://cors.archive.org/cors/World_of_Spectrum_June_2017_Mirror/World%20of%20Spectrum%20June%202017%20Mirror.zip/World%20of%20Spectrum%20June%202017%20Mirror${pokEntry.path.replace(/^\/pub/, '')}`;
        fetch(wosPokUrl).then(r => r.ok ? r.text() : null).then(txt => {
          if (txt) {
            const parsed = parsePokFile(txt, `${title} (${pokEntry.path.split('/').pop()})`);
            if (parsed.length > 0) {
              this.pokTrainers.unshift(...parsed);
              this.renderPokTrainers();
            }
          }
        }).catch(() => {});
      }

      // Find playable release file
      const allFiles = [];
      for (const rel of (src.releases || [])) {
        for (const f of (rel.files || [])) {
          if (f.path) allFiles.push(f);
        }
      }
      if (allFiles.length === 0) {
        throw new Error('No downloadable release file on WoS mirror — trying Internet Archive fallback');
      }

      const fileObj = allFiles.find(f => /\.(z80|sna|tap|tzx|dsk|trd)\.zip$/i.test(f.path)) || allFiles[0];
      const relSinclairPath = fileObj.path.replace(/^\/pub\/sinclair\//, 'sinclair/').replace(/^\//, '');
      const wosMirrorUrl = `https://cors.archive.org/cors/World_of_Spectrum_June_2017_Mirror/World%20of%20Spectrum%20June%202017%20Mirror.zip/World%20of%20Spectrum%20June%202017%20Mirror/${relSinclairPath}`;

      if (saveToDiskOnly) {
        const a = document.createElement('a');
        a.href = wosMirrorUrl;
        a.download = fileObj.path.split('/').pop();
        document.body.appendChild(a);
        a.click();
        a.remove();
        btnEl.textContent = '✅ Saved';
        return;
      }

      const binRes = await fetch(wosMirrorUrl);
      if (!binRes.ok) throw new Error(`WoS Mirror HTTP ${binRes.status}`);
      const ab = await binRes.arrayBuffer();
      let bytes = new Uint8Array(ab);
      let fileName = fileObj.path.split('/').pop();
      let ext = (fileName.split('.').pop() || '').toLowerCase();

      if (ext === 'zip') {
        const extracted = await extractPlayableFromZip(bytes);
        if (!extracted) throw new Error('Failed to extract game from ZIP');
        bytes = extracted.bytes;
        fileName = extracted.name;
        ext = extracted.ext;
      }

      await this.bootBinaryInEmulatorAndFuse(bytes, fileName, ext, title, is128);
      document.getElementById('tosec-modal')?.classList.remove('visible');
    } catch (err) {
      console.warn('[ZXDB] Falling back to Internet Archive for:', title, err);
      const iaContainer = document.getElementById('tosec-results-list');
      await this.searchInternetArchive(title, iaContainer);
    } finally {
      setTimeout(() => { btnEl.textContent = origLabel; btnEl.disabled = false; }, 1200);
    }
  }

  async bootBinaryInEmulatorAndFuse(bytes, fileName, ext, displayTitle, prefer128K = null) {
    // 1. Send binary to Fuse C Native Backend (`fuse.exe`) if connected
    if (this.fuseBackendAvailable || window.__FUSE_NATIVE_BACKEND__) {
      fetch(`/api/upload?name=${encodeURIComponent(fileName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes
      }).catch(() => {});
    }

    // 2. Also load into the local WebXR emulator instance
    this.spectrum.audio.unlock();
    const copyBuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await this.gamesLibrary.loadBinaryBuffer(copyBuf, displayTitle || fileName, ext, prefer128K);
    this.app.updateModelBadge(this.spectrum.model);
  }
}
