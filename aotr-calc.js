// =============================================
// AOT:R Trade Calculator — Full Item List
// =============================================

const ITEMS = [
  { id: 'third_eye', name: 'Third Eye', value: 200000, source: 'LB Aura' },
  { id: 'eclipse', name: 'Eclipse', value: 90000, source: 'LB Aura' },
  { id: 'seraphic', name: 'Seraphic', value: 37000, source: 'LB Aura' },
  { id: 'toji_attire', name: 'Toji Attire', value: 10530, source: 'JJK Crate' },
  { id: 'bambietta_wings', name: 'Bambietta Wings', value: 9450, source: 'Bleach Crate' },
  { id: 'ulquiorra_wings', name: 'Ulquiorra Wings', value: 8370, source: 'Bleach Crate' },
  { id: 'black_flash_aura', name: 'Black Flash Aura', value: 6210, source: 'JJK Crate' },
  { id: 'zangetsu', name: 'Zangetsu', value: 5130, source: 'Bleach Crate' },
  { id: 'primera_attire', name: 'Primera Attire', value: 4050, source: 'Bleach Crate' },
  { id: 'cursed_markings', name: 'Cursed Markings', value: 2400, source: 'JJK Crate' },
  { id: 'helos', name: 'Helos', value: 2160, source: 'Family' },
  { id: 'mahoraga_wheel', name: 'Mahoraga Wheel', value: 1890, source: 'JJK Crate' },
  { id: 'fritz', name: 'Fritz', value: 1620, source: 'Family' },
  { id: 'onikiri_eren', name: 'Onikiri Eren', value: 1200, source: 'Battle Pass (Season 1)' },
  { id: 'captain_attire', name: 'CaptainAttire', value: 1080, source: 'Bleach Crate' },
  { id: 'jotunn', name: 'Jotunn', value: 420, source: 'Battle Pass (Season 2)' },
  { id: 'soul_split_katana', name: 'Soul Split Katana', value: 375, source: 'JJK Crate' },
  { id: 'quincy_attire', name: 'Quincy Attire', value: 350, source: 'Bleach Crate' },
  { id: 'katen_kyokotsu', name: 'Katen Kyokotsu', value: 325, source: 'Bleach Crate' },
  { id: 'geto_attire', name: 'Geto Attire', value: 300, source: 'JJK Crate' },
  { id: 'icarus_spear_gear', name: 'Icarus Spear Gear', value: 270, source: 'Battle Pass (Season 2)' },
  { id: 'icarus_spear_equipment', name: 'Icarus Spear Equipment', value: 270, source: 'Battle Pass (Season 2)' },
  { id: 'vizard_mask', name: 'Vizard Mask', value: 270, source: 'Mission Exclusives' },
  { id: 'equinox_moon', name: 'Equinox Moon', value: 200, source: 'Easter Event' },
  { id: 'jjk_crate', name: 'JJK Crate', value: 150, source: 'Crates' },
  { id: 'forsaken', name: 'Forsaken', value: 140, source: 'Halloween Event' },
  { id: 'ulquiorra_attire', name: 'Ulquiorra Attire', value: 130, source: 'Bleach Crate' },
  { id: 'bleach_crate', name: 'Bleach Crate', value: 120, source: 'Crates' },
  { id: 'kazeshini', name: 'Kazeshini', value: 120, source: 'Bleach Crate' },
  { id: 'soul_reaper_attire', name: 'Soul Reaper Attire', value: 100, source: 'Bleach Crate' },
  { id: 'isoh', name: 'ISOH', value: 100, source: 'JJK Crate' },
  { id: 'cursed_energy_aura', name: 'Cursed Energy Aura', value: 100, source: 'JJK Crate' },
  { id: 'cosmic_nova', name: 'Cosmic Nova', value: 90, source: 'Blade Burst Crate' },
  { id: 'astolfo_attire', name: 'Astolfo Attire', value: 90, source: 'Fate Crate' },
  { id: 'giyuu_attire', name: 'Giyuu Attire', value: 90, source: 'Demon Slayer Crate' },
  { id: 'nichrin_cleaver', name: 'Nichrin Cleaver', value: 80, source: 'Demon Slayer Crate' },
  { id: 'gilgamesh_attire', name: 'Gilgamesh Attire', value: 80, source: 'Fate Crate' },
  { id: 'sorcerer_attire', name: 'Sorcerer Attire', value: 80, source: 'JJK Crate' },
  { id: 'maid_attire', name: 'Maid Attire', value: 80, source: 'Scout Fashion Crate' },
  { id: 'azure_flame', name: 'Azure Flame', value: 80, source: 'Blade Burst Crate' },
  { id: 'grumpy', name: 'Grumpy', value: 80, source: 'Halloween Event' },
  { id: 'kisuke_attire', name: 'Kisuke Attire', value: 80, source: 'Bleach Crate' },
  { id: 'ignited', name: 'Ignited', value: 80, source: 'Blade Burst Crate' },
  { id: 'titanstrike', name: 'Titanstrike', value: 80, source: 'Blade Burst Crate' },
  { id: 'tengen_attire', name: 'Tengen Attire', value: 80, source: 'Demon Slayer Crate' },
  { id: 'white_skeleton_attire', name: 'White Skeleton Attire', value: 70, source: 'Halloween Event' },
  { id: 'cat_ears', name: 'Cat Ears', value: 70, source: 'Scout Fashion Crate' },
  { id: 'vulcano_cagligorante', name: 'Vulcano Cagligorante', value: 70, source: 'Fate Crate' },
  { id: 'candy_cane_blades', name: 'Candy Cane Blades', value: 60, source: 'Christmas Event' },
  { id: 'explosion_art', name: 'Explosion Art', value: 60, source: 'Demon Slayer Crate' },
  { id: 'moai_armour_skin', name: 'Moai Armour Skin', value: 60, source: 'Easter Event' },
  { id: 'ackerman', name: 'Ackerman', value: 60, source: 'Family' },
  { id: 'yeager', name: 'Yeager', value: 60, source: 'Family' },
  { id: 'military_attire', name: 'Military Attire', value: 60, source: 'Achievement Exclusive' },
  { id: 'butcher_blade', name: 'Butcher Blade', value: 50, source: 'Halloween Event' },
  { id: 'zangetsu_m', name: 'Zangetsu M', value: 50, source: 'Bleach Crate' },
  { id: 'deus_ex_machina', name: 'Deus Ex Machina', value: 50, source: 'Battle Pass (Season 3)' },
  { id: 'blade_head', name: 'Blade Head', value: 50, source: 'Halloween Event' },
  { id: 'elderflame_sheath', name: 'Elderflame Sheath', value: 46, source: 'Battle Pass (Season 2)' },
  { id: 'elderflame_gear', name: 'Elderflame Gear', value: 46, source: 'Battle Pass (Season 2)' },
  { id: 'elderflame_blade', name: 'Elderflame Blade', value: 46, source: 'Battle Pass (Season 2)' },
  { id: 'green_skeleton_attire', name: 'Green Skeleton Attire', value: 40, source: 'Halloween Event' },
  { id: 'jotunn_spear_equipment', name: 'Jotunn Spear Equipment', value: 40, source: 'Raid Drop' },
  { id: 'spirit_gear', name: 'Spirit Gear', value: 40, source: 'Battle Pass (Season 1)' },
  { id: 'spirit_sheath', name: 'Spirit Sheath', value: 40, source: 'Battle Pass (Season 1)' },
  { id: 'spirit_blade', name: 'Spirit Blade', value: 40, source: 'Battle Pass (Season 1)' },
  { id: 'jotunn_spear_gear', name: 'Jotunn Spear Gear', value: 40, source: 'Raid Drop' },
  { id: 'art_of_war', name: 'Art Of War', value: 30, source: 'Perk' },
  { id: 'onikiri_spear_gear', name: 'Onikiri Spear Gear', value: 30, source: 'Raid Drop' },
  { id: 'benihime', name: 'Benihime', value: 30, source: 'Bleach Crate' },
  { id: 'jotunn_gear', name: 'Jotunn Gear', value: 30, source: 'Raid Drop' },
  { id: 'jotunn_sheath', name: 'Jotunn Sheath', value: 30, source: 'Raid Drop' },
  { id: 'chicken', name: 'Chicken', value: 30, source: 'Easter Event' },
  { id: 'utahime_attire', name: 'Utahime Attire', value: 30, source: 'JJK Crate' },
  { id: 'santa_sack', name: 'Santa Sack', value: 30, source: 'Christmas Event' },
  { id: 'onikiri_spear_equipment', name: 'Onikiri Spear Equipment', value: 30, source: 'Raid Drop' },
  { id: 'female_serum', name: 'Female Serum', value: 30, source: 'Raid Drop' },
  { id: 'demon_glaze', name: 'Demon Glaze', value: 25, source: 'Blade Burst Crate' },
  { id: 'black_flash', name: 'Black Flash', value: 25, source: 'Perk' },
  { id: 'rosepetal', name: 'RosePetal', value: 25, source: 'Blade Burst Crate' },
  { id: 'christmas_sheath', name: 'Christmas Sheath', value: 25, source: 'Christmas Event' },
  { id: 'blood_letting', name: 'Blood letting', value: 25, source: 'Blade Burst Crate' },
  { id: 'pointy_candy_cane', name: 'Pointy Candy Cane Blades', value: 25, source: 'Christmas Event' },
  { id: 'gojo_blindfold', name: 'Gojo Blindfold', value: 25, source: 'JJK Crate' },
  { id: 'founder_blessing', name: 'Founder Blessing', value: 25, source: 'Perk' },
  { id: 'archer_attire', name: 'Archer Attire', value: 25, source: 'Fate Crate' },
  { id: 'starry_night', name: 'Starry Night', value: 25, source: 'Blade Burst Crate' },
  { id: 'christmas_gear', name: 'Christmas Gear', value: 25, source: 'Christmas Event' },
  { id: 'gae_bolg', name: 'Gae Bolg', value: 25, source: 'Fate Crate' },
  { id: 'aincrad_blade', name: 'Aincrad Blade', value: 25, source: 'Battle Pass (Season 2)' },
  { id: 'aincrad_sheath', name: 'Aincrad Sheath', value: 25, source: 'Battle Pass (Season 2)' },
  { id: 'immortal', name: 'Immortal', value: 25, source: 'Perk' },
  { id: 'aincrad_gear', name: 'Aincrad Gear', value: 25, source: 'Battle Pass (Season 2)' },
  { id: 'katana', name: 'Katana', value: 25, source: 'JJK Crate' },
  { id: 'kengo', name: 'Kengo', value: 23, source: 'Perk' },
  { id: 'jotunn_blade', name: 'Jotunn Blade', value: 20, source: 'Raid Drop' },
  { id: 'lightning_breath', name: 'Lightning Breath', value: 20, source: 'Demon Slayer Crate' },
  { id: 'font_of_inspiration', name: 'Font Of Inspiration', value: 20, source: 'Perk' },
  { id: 'nightfall_aura', name: 'Nightfall Aura', value: 20, source: 'Achievement Exclusive' },
  { id: 'ski_mask', name: 'Ski Mask', value: 20, source: 'Halloween Event' },
  { id: 'witch_hat', name: 'Witch Hat', value: 20, source: 'Halloween Event' },
  { id: '12fps', name: '12FPS', value: 20, source: 'GP' },
  { id: 'elf_hat', name: 'Elf Hat', value: 20, source: 'Christmas Event' },
  { id: 'santa_hat', name: 'Santa Hat', value: 20, source: 'Christmas Event' },
  { id: 'jack_o_lantern', name: 'Jack O Lantern', value: 20, source: 'Halloween Event' },
  { id: 'axe_head', name: 'Axe Head', value: 20, source: 'Halloween Event' },
  { id: 'luck_boost_2hr', name: 'Luck Boost 2HR', value: 20, source: 'Market' },
  { id: 'snowman_head', name: 'SnowmanHead', value: 20, source: 'Christmas Event' },
  { id: 'reiss', name: 'Reiss', value: 20, source: 'Family' },
  { id: 'armour_serum', name: 'Armour Serum', value: 20, source: 'Raid Drop' },
  { id: 'maximum_firepower', name: 'Maximum Firepower', value: 20, source: 'Perk' },
  { id: 'flame_breath', name: 'Flame Breath', value: 20, source: 'Demon Slayer Crate' },
  { id: 'kyokokukamusari', name: 'Kyokokukamusari', value: 20, source: 'Demon Slayer Crate' },
  { id: 'rengoku_attire', name: 'Rengoku Attire', value: 20, source: 'Demon Slayer Crate' },
  { id: 'green_aura_flies', name: 'Green Aura With Flies', value: 20, source: 'Halloween Event' },
  { id: 'adaptation', name: 'Adaptation', value: 20, source: 'Perk' },
  { id: 'attack_serum', name: 'Attack Serum', value: 20, source: 'Raid Drop' },
  { id: 'explosive_fortune', name: 'Explosive Fortune', value: 19, source: 'Perk' },
  { id: 'tatsujin', name: 'Tatsujin', value: 18, source: 'Perk' },
  { id: 'soul_feed', name: 'Soul Feed', value: 18, source: 'Perk' },
  { id: 'easter_bunny_attire', name: 'EasterBunnyAttire', value: 15, source: 'Easter Event' },
  { id: 'scars', name: 'Scars', value: 15, source: 'Artifact' },
  { id: 'boar_mask', name: 'Boar Mask', value: 15, source: 'Demon Slayer Crate' },
  { id: 'pulsar_spear_equipment', name: 'Pulsar Spear Equipment', value: 15, source: 'Battle Pass (Season 3)' },
  { id: 'pulsar_spear_gear', name: 'Pulsar Spear Gear', value: 15, source: 'Battle Pass (Season 3)' },
  { id: 'onikiri_gear', name: 'Onikiri Gear', value: 15, source: 'Raid Drop' },
  { id: 'onikiri_blade', name: 'Onikiri Blade', value: 15, source: 'Raid Drop' },
  { id: 'onikiri_sheath', name: 'Onikiri Sheath', value: 15, source: 'Raid Drop' },
  { id: 'bunny_ears', name: 'BunnyEars', value: 15, source: 'Easter Event' },
  { id: 'farmer_attire', name: 'Farmer Attire', value: 15, source: 'Easter Event' },
  { id: 'rabbit_foot_necklace', name: 'Rabbit Foot Necklace', value: 15, source: 'Easter Event' },
  { id: 'carrot', name: 'Carrot', value: 15, source: 'Easter Event' },
  { id: 'easter_spear_gear', name: 'Easter Spear Gear', value: 15, source: 'Easter Event' },
  { id: 'moai_head', name: 'MoaiHead', value: 15, source: 'Easter Event' },
  { id: 'cracked_shell', name: 'Cracked Shell', value: 15, source: 'Easter Event' },
  { id: 'easter_spear_equipment', name: 'Easter Spear Equipment', value: 15, source: 'Easter Event' },
  { id: 'gold_boost_2hr', name: 'Gold Boost 2HR', value: 14, source: 'Market' },
  { id: 'scarf', name: 'Scarf', value: 13, source: 'Artifact' },
  { id: 'cookie', name: 'Cookie', value: 10, source: 'Christmas Event' },
  { id: 'gingerbread_blades', name: 'Gingerbread Blades', value: 10, source: 'Christmas Event' },
  { id: 'heavenly_restriction', name: 'Heavenly Restriction', value: 10, source: 'Perk' },
  { id: 'pulsar_blade', name: 'Pulsar Blade', value: 10, source: 'Battle Pass (Season 3)' },
  { id: 'pulsar_gear', name: 'Pulsar Gear', value: 10, source: 'Battle Pass (Season 3)' },
  { id: 'hot_chocolate', name: 'Hot Chocolate', value: 10, source: 'Christmas Event' },
  { id: 'radiant_headband', name: 'Radiant Headband', value: 10, source: 'Mission Exclusives' },
  { id: 'everlasting_flame', name: 'Everlasting Flame', value: 10, source: 'Perk' },
  { id: 'jetblack_sword', name: 'JetBlack Sword', value: 10, source: 'JJK Crate' },
  { id: 'pulsar_sheath', name: 'Pulsar Sheath', value: 10, source: 'Battle Pass (Season 3)' },
  { id: 'kisuke_hat', name: 'Kisuke Hat', value: 10, source: 'Bleach Crate' },
  { id: 'kenny_attire', name: 'Kenny Attire', value: 10, source: 'Scout Fashion Crate' },
  { id: 'arlert', name: 'Arlert', value: 10, source: 'Family' },
  { id: 'leonhart', name: 'Leonhart', value: 10, source: 'Family' },
  { id: 'quincy_hat', name: 'Quincy Hat', value: 10, source: 'Bleach Crate' },
  { id: 'demonic_gaze', name: 'Demonic Gaze', value: 10, source: 'Blade Burst Crate' },
  { id: 'toshiro_scarf', name: 'Toshiro Scarf', value: 10, source: 'Bleach Crate' },
  { id: 'exp_boost_2hr', name: 'EXP Boost 2HR', value: 7, source: 'Market' },
  { id: 'female_shard', name: 'Female Shard', value: 6, source: 'Raid Drop' },
  { id: 'finger', name: 'Finger', value: 5, source: 'Family' },
  { id: 'ksaver', name: 'Ksaver', value: 5, source: 'Family' },
  { id: 'zoe', name: 'Zoe', value: 5, source: 'Family' },
  { id: 'sunforge_spear_equipment', name: 'Sunforge Spear Equipment', value: 5, source: 'Battle Pass (Season 3)' },
  { id: 'kitsune_mask', name: 'kitsuneMask', value: 5, source: 'Mission Exclusives' },
  { id: 'headband', name: 'Headband', value: 5, source: 'Achievement Exclusive' },
  { id: 'bladed_gauntlet', name: 'Bladed Gauntlet', value: 5, source: 'Achievement Exclusive' },
  { id: 'crown', name: 'Crown', value: 5, source: 'Achievement Exclusive' },
  { id: 'sunforge_spear_gear', name: 'Sunforge Spear Gear', value: 5, source: 'Battle Pass (Season 3)' },
  { id: 'armour_shard', name: 'Armour Shard', value: 5, source: 'Raid Drop' },
  { id: 'tybur', name: 'Tybur', value: 5, source: 'Family' },
  { id: 'galliard', name: 'Galliard', value: 5, source: 'Family' },
  { id: 'braun', name: 'Braun', value: 5, source: 'Family' },
  { id: 'sunforge_blade', name: 'Sunforge Blade', value: 3, source: 'Battle Pass (Season 3)' },
  { id: 'sunforge_gear', name: 'Sunforge Gear', value: 3, source: 'Battle Pass (Season 3)' },
  { id: 'attack_shard', name: 'Attack Shard', value: 3, source: 'Raid Drop' },
  { id: 'prestige_scroll', name: 'Prestige Scroll', value: 3, source: 'Market' },
  { id: 'sword_of_rupture', name: 'Sword Of Rupture', value: 3, source: 'Fate Crate' },
  { id: 'demon_slayer_crate', name: 'Demon Slayer', value: 3, source: 'Crates' },
  { id: 'blade_burst_crate', name: 'Blade Burst Crate', value: 3, source: 'Crates' },
  { id: 'fate_crate', name: 'Fate Crate', value: 3, source: 'Crates' },
  { id: 'sunforge_sheath', name: 'Sunforge Sheath', value: 3, source: 'Battle Pass (Season 3)' },
  { id: 'raid_aura', name: 'Raid Aura', value: 2, source: 'Raid Drop' },
  { id: 'dripyy_glasses', name: 'Dripyy Glasses', value: 2, source: 'Achievement Exclusive' },
  { id: 'onyx_blade', name: 'Onyx Blade', value: 2, source: 'Achievement Exclusive' },
  { id: 'onyx_sheath', name: 'Onyx Sheath', value: 2, source: 'Achievement Exclusive' },
  { id: 'saber_attire', name: 'Saber Attire', value: 1, source: 'Fate Crate' },
  { id: 'ninja_attire', name: 'Ninja Attire', value: 1, source: 'Scout Fashion Crate' },
  { id: 'shinobu_attire', name: 'Shinobu Attire', value: 1, source: 'Demon Slayer Crate' },
  { id: 'grimmjow_mask', name: 'Grimmjow Mask', value: 1, source: 'Mission Exclusives' },
  { id: 'water_breath', name: 'Water Breath', value: 1, source: 'Demon Slayer Crate' },
  { id: 'tanjiro_attire', name: 'Tanjiro Attire', value: 1, source: 'Demon Slayer Crate' },
  { id: 'bikini_attire', name: 'Bikini Attire', value: 1, source: 'Fate Crate' },
  { id: 'hoddie', name: 'Hoddie', value: 1, source: 'Artifact' },
  { id: 'kenny_hat', name: 'Kenny Hat', value: 1, source: 'Scout Fashion Crate' },
  { id: 'scour_fashion_crate', name: 'Scour Fashion Crate', value: 1, source: 'Crates' },
  { id: 'blood_sickle', name: 'Blood Sickle', value: 1, source: 'Demon Slayer Crate' },
  { id: 'key', name: 'Key', value: 1, source: 'Market' },
  { id: 'blood_art', name: 'Blood Art', value: 1, source: 'Demon Slayer Crate' },
  { id: 'young_reiner_attire', name: 'Young Reiner Attire', value: 1, source: 'Artifact' },
  { id: 'gojo_glassess', name: 'Gojo Glassess', value: 1, source: 'JJK Crate' },
  { id: 'warior_medalilion', name: 'Warior Medalilion', value: 1, source: 'Mission Exclusives' },
];
// --- STATE ---
// Each slot: null  OR  { item, qty }
const state = {
  you:  Array(9).fill(null),
  them: Array(9).fill(null),
  activeSide: null,
  activeSlot: null,
};

// --- QTY LIMITS by category ---
function getMaxQty(item) {
  const name = item.name.toLowerCase();
  const src  = (item.source || '').toLowerCase();
  // Shards: up to 6
  if (name.includes('shard')) return 6;
  // Scrolls: up to 30
  if (name.includes('scroll')) return 30;
  // Keys: up to 30
  if (name === 'key' || name.includes('crate')) return 30;
  // Serums: up to 10
  if (name.includes('serum')) return 10;
  // Boosts: up to 20
  if (name.includes('boost')) return 20;
  // Default: 1
  return 1;
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  renderSlots('you');
  renderSlots('them');
  updateResult();
});

// --- RENDER SLOTS ---
function renderSlots(side) {
  const container = document.getElementById(side + 'Slots');
  container.innerHTML = '';

  state[side].forEach((entry, i) => {
    const slot = document.createElement('div');
    slot.className = 'calc-slot' + (entry ? ' calc-slot--filled' : ' calc-slot--empty');

    if (entry) {
      const { item, qty } = entry;
      const maxQty = getMaxQty(item);
      const totalVal = item.value * qty;
      const showQty = maxQty > 1;

      slot.innerHTML = `
        <button class="slot-remove" onclick="removeItem('${side}', ${i})">✕</button>
        <div class="slot-item-name">${item.name}</div>
        <div class="slot-item-value">${totalVal.toLocaleString()}</div>
        ${showQty ? `
        <div class="slot-qty-ctrl" onclick="event.stopPropagation()">
          <button class="qty-btn" onclick="changeQty('${side}', ${i}, -1)" ${qty <= 1 ? 'disabled' : ''}>−</button>
          <input
            class="qty-input"
            type="number"
            min="1"
            max="${maxQty}"
            value="${qty}"
            onchange="setQty('${side}', ${i}, this.value)"
            onclick="this.select()"
          />
          <button class="qty-btn" onclick="changeQty('${side}', ${i}, 1)" ${qty >= maxQty ? 'disabled' : ''}>+</button>
        </div>
        ` : ''}
      `;
    } else {
      slot.innerHTML = `<span class="slot-plus">+</span>`;
      slot.addEventListener('click', () => openPicker(side, i));
    }

    container.appendChild(slot);
  });

  const filled = state[side].filter(Boolean).length;
  document.getElementById(side + 'Count').textContent = filled;
}

// --- QTY CONTROLS ---
function changeQty(side, index, delta) {
  const entry = state[side][index];
  if (!entry) return;
  const max = getMaxQty(entry.item);
  entry.qty = Math.min(max, Math.max(1, entry.qty + delta));
  renderSlots(side);
  updateResult();
}

function setQty(side, index, rawVal) {
  const entry = state[side][index];
  if (!entry) return;
  const max = getMaxQty(entry.item);
  let val = parseInt(rawVal, 10);
  if (isNaN(val) || val < 1) val = 1;
  if (val > max) val = max;
  entry.qty = val;
  renderSlots(side);
  updateResult();
}

// --- OPEN / CLOSE PICKER ---
function openPicker(side, index) {
  state.activeSide = side;
  state.activeSlot = index;
  document.getElementById('pickerSearch').value = '';
  filterItems();
  document.getElementById('itemPicker').classList.add('open');
  document.getElementById('pickerOverlay').classList.add('open');
  setTimeout(() => document.getElementById('pickerSearch').focus(), 50);
}

function closePicker() {
  document.getElementById('itemPicker').classList.remove('open');
  document.getElementById('pickerOverlay').classList.remove('open');
  state.activeSide = null;
  state.activeSlot = null;
}

// --- FILTER ITEMS ---
function filterItems() {
  const query = document.getElementById('pickerSearch').value.toLowerCase();
  const list = document.getElementById('pickerList');
  const filtered = ITEMS.filter(item => item.name.toLowerCase().includes(query));

  if (filtered.length === 0) {
    list.innerHTML = `<div class="picker-empty"><span>No items found.</span></div>`;
    return;
  }

  list.innerHTML = filtered.map(item => {
    const max = getMaxQty(item);
    const qtyBadge = max > 1 ? `<span class="picker-qty-badge">×${max} max</span>` : '';
    return `
      <div class="picker-item" onclick="selectItem('${item.id}')">
        <div class="picker-item-info">
          <span class="picker-item-name">${item.name}</span>
          <span class="picker-item-source">${item.source}</span>
          ${qtyBadge}
        </div>
        <span class="picker-item-value">🔑 ${item.value.toLocaleString()}</span>
      </div>
    `;
  }).join('');
}

// --- SELECT ITEM ---
function selectItem(itemId) {
  const item = ITEMS.find(i => i.id === itemId);
  if (!item || state.activeSide === null) return;
  state[state.activeSide][state.activeSlot] = { item, qty: 1 };
  renderSlots(state.activeSide);
  updateResult();
  closePicker();
}

// --- REMOVE ITEM ---
function removeItem(side, index) {
  state[side][index] = null;
  renderSlots(side);
  updateResult();
}

// --- CLEAR SIDE ---
function clearSide(side) {
  state[side] = Array(9).fill(null);
  renderSlots(side);
  updateResult();
}

// --- UPDATE RESULT ---
function updateResult() {
  const youVal  = state.you.reduce((s, e)  => s + (e ? e.item.value * e.qty : 0), 0);
  const themVal = state.them.reduce((s, e) => s + (e ? e.item.value * e.qty : 0), 0);
  const diff = themVal - youVal;

  document.getElementById('youTotalVal').textContent  = youVal.toLocaleString();
  document.getElementById('themTotalVal').textContent = themVal.toLocaleString();

  const verdictText = document.getElementById('verdictText');
  const verdictDiff = document.getElementById('verdictDiff');
  const result      = document.getElementById('calcResult');
  result.classList.remove('result--win', 'result--lose', 'result--even');

  if (youVal === 0 && themVal === 0) {
    verdictText.textContent = '—';
    verdictDiff.textContent = 'Add items to both sides';
  } else if (diff === 0) {
    verdictText.textContent = 'Even Trade';
    verdictDiff.textContent = 'Perfectly balanced';
    result.classList.add('result--even');
  } else if (diff > 0) {
    verdictText.textContent = '✓ Good for you';
    verdictDiff.textContent = `+${Math.abs(diff).toLocaleString()} in your favor`;
    result.classList.add('result--win');
  } else {
    verdictText.textContent = '✗ Bad for you';
    verdictDiff.textContent = `−${Math.abs(diff).toLocaleString()} against you`;
    result.classList.add('result--lose');
  }
}
