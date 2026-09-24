// Canonical Catalyst FORGE choices. Keep this in sync with the approved tree.
(function (root) {
  const split = value => value.split('|');
  const races = {
    Hero: split('Android|Human|Hybrid|Machine|Mutant|Giant Robot|Artificial Intelligence|Snake|Fish|Plant|Dinosaur|Reptile|Insect|Dragon|Beast'),
    Villain: split('Android|Human|Hybrid|Machine|Mutant|Giant Robot|Artificial Intelligence|Snake|Fish|Plant|Dinosaur|Reptile|Insect|Dragon|Beast'),
    God: split('Psychic|Titan|Celestial|Elemental'),
    'Demi-God': split('Hybrid|Psychic|Sea Serpent|Aquatic'),
    Angel: split('Winged Beast|Hybrid|Fairy|Elf'),
    Demon: split('Vampire|Elf|Zombie|Mutant|Hybrid|Fiend'),
    Djinn: split('Construct|Alter|Union|Trickster|Pyric|Aquatic|Geological|Aeric'),
    Spirit: split('Construct|Alter|Union|Guardian|Ghost|Pyric|Geological|Aeric|Aquatic')
  };
  const skills = {
    Aeric: split('Normal|Zephyr|Tempest|Gale Caller'),
    Alter: split('Normal|Shifter|Alter User|Alter Union'),
    Android: split('Normal|Cybernetic|Warrior|Ninja|Gunman|Swordsman|Healer|Hacker'),
    Aquatic: split('Normal|Torrential|Tideshifter|Ninja|Mage'),
    'Artificial Intelligence': split('Normal|Sentient|Gunman|Hacker|Virus|Healer'),
    Beast: split('Normal|Feral|Warrior|Ninja|Predator'),
    Celestial: split('Normal|Astral|Mage|Healer'),
    Construct: split('Normal|Golemite|Mage|Virus|Artificer'),
    Dinosaur: split('Normal|Primeval|Behemoth|Apex'),
    Dragon: split('Normal|Draconic|Wyrmlord|Dreadnought'),
    Elemental: split('Normal|Primordial|Mage|Shaper'),
    Elf: split('Normal|Sylvan|Warrior|Mage'),
    Fairy: split('Normal|Fae|Warrior|Mage'),
    Fiend: split('Normal|Infernal|Warrior|Gunman'),
    Fish: split('Normal|Marine|Warrior|Abyssal'),
    Geological: split('Normal|Tectonic|Earthshaker|Monolith'),
    Ghost: split('Normal|Ethereal|Haunter|Phantasm'),
    'Giant Robot': split('Normal|Titan Mech|Gunman|Juggernaut'),
    Guardian: split('Normal|Aegis|Warden|Ninja|Mage|Healer'),
    Human: split('Normal|Mortal|Warrior|Ninja|Mage|Witch|Warlock|Hacker|Gunman'),
    Hybrid: split('Normal|Chimera|Warrior|Ninja|Mage|Witch|Warlock|Hacker|Gunman|Virus'),
    Insect: split('Normal|Chitinous|Warrior|Swarm'),
    Machine: split('Normal|Automaton|Gunman|Hacker'),
    Mutant: split('Normal|Deviant|Warrior|Ninja|Mage|Gunman'),
    Plant: split('Normal|Botanical|Healer|Thornweaver'),
    Psychic: split('Normal|Psionic|Mage|Witch|Warlock|Gunman|Healer'),
    Pyric: split('Normal|Cinder|Igniter|Ashlord'),
    Reptile: split('Normal|Scaled|Warrior|Ninja'),
    'Sea Serpent': split('Normal|Abyssal Wyrm|Warrior|Leviathan'),
    Snake: split('Normal|Serpentine|Warrior|Venomist'),
    Titan: split('Normal|Colossal|Warrior|Colossus'),
    Trickster: split('Normal|Mirage|Mage|Witch|Warlock'),
    Union: split('Normal|Harmonizer|Conduit|Weaver'),
    Vampire: split('Normal|Sanguine|Warrior|Bloodbinder'),
    'Winged Beast': split('Normal|Avian|Warrior|Aerialist'),
    Zombie: split('Normal|Dread|Undying')
  };
  const demiGodAquaticSkills = split('Normal|Pelagic|Warrior|Ninja|Mage');
  const alignments = Object.keys(races);
  const racesFor = alignment => races[alignment] || [];
  const skillsFor = (alignment, race) =>
    race === 'Aquatic' && alignment === 'Demi-God' ? demiGodAquaticSkills :
    racesFor(alignment).includes(race) ? (skills[race] || []) : [];
  const validPath = (alignment, race, skill) =>
    racesFor(alignment).includes(race) && skillsFor(alignment, race).includes(skill);
  root.CTF_FORGE_TREE = Object.freeze({alignments, racesFor, skillsFor, validPath});
})(window);
