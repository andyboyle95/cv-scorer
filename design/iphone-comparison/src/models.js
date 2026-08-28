/* ============================================================================
   Shared iPhone model data.

   SPEC TEXT  — quoted verbatim in meaning from the live o2.co.uk/iphone-comparison
                table (Aug 2026). Nothing invented.
   DIMENSIONS — NOT on O2's current page. Added here because the size comparison
                tool needs them. Apple's published figures; flagged in the design
                notes as "verify against Apple's spec sheet before publishing".
   NO PRICING — deliberately. This page cannot link to live deals, so it carries
                no monthly cost, upfront cost or tariff information anywhere.
   ============================================================================ */

const MODELS = [
  /* ---------------- current range: iPhone 17 family ---------------- */
  {
    id:'17pm', name:'iPhone 17 Pro Max', gen:'17', tier:'pro', shot:'17pm', order:1,
    who:'For people who want every single thing, and the biggest screen going.',
    size:6.9, dims:[163.4,78.0,8.75], weight:233,
    screen:'6.9-inch Super Retina XDR', screenD:'OLED, ProMotion and Always-On, Dynamic Island',
    promotion:true, alwaysOn:true, island:true,
    lenses:3, cameraD:'48MP Pro Fusion camera system — 48MP Fusion Main, 48MP Fusion Ultra Wide, 48MP Fusion Telephoto',
    ultrawide:true, telephoto:true, optical:null, opticalNote:'Telephoto — zoom figure not stated on O2’s page',
    design:'Aluminium unibody', designD:'Ceramic Shield 2 front, 3× better scratch resistance, Ceramic Shield back',
    material:'Aluminium',
    chip:'A19 Pro', chipD:'5-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:19.5, ai:true,
    batt:37, battD:'Up to 37 hours of video playback', sec:'Face ID'
  },
  {
    id:'17p', name:'iPhone 17 Pro', gen:'17', tier:'pro', shot:'17p', order:2,
    who:'For people who want the full Pro camera without the biggest body.',
    size:6.3, dims:[150.0,71.9,8.75], weight:204,
    screen:'6.3-inch Super Retina XDR', screenD:'OLED, ProMotion and Always-On, Dynamic Island',
    promotion:true, alwaysOn:true, island:true,
    lenses:3, cameraD:'48MP Pro Fusion camera system — 48MP Fusion Main, 48MP Fusion Ultra Wide, 48MP Fusion Telephoto',
    ultrawide:true, telephoto:true, optical:null, opticalNote:'Telephoto — zoom figure not stated on O2’s page',
    design:'Aluminium unibody', designD:'Ceramic Shield 2 front, 3× better scratch resistance, Ceramic Shield back',
    material:'Aluminium',
    chip:'A19 Pro', chipD:'5-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:19.5, ai:true,
    batt:31, battD:'Up to 31 hours of video playback', sec:'Face ID'
  },
  {
    id:'air', name:'iPhone Air', gen:'17', tier:'air', shot:'air', order:3,
    who:'For people who care how a phone feels in the hand more than how many lenses it has.',
    size:6.5, dims:[156.2,74.7,5.64], weight:165,
    screen:'6.5-inch Super Retina XDR', screenD:'OLED, ProMotion and Always-On, Dynamic Island',
    promotion:true, alwaysOn:true, island:true,
    lenses:1, cameraD:'48MP Fusion camera system — 48MP Fusion Main',
    ultrawide:false, telephoto:false, optical:2, crop:true,
    design:'Titanium frame', designD:'Ceramic Shield 2 front, 3× better scratch resistance, Ceramic Shield back',
    material:'Titanium',
    chip:'A19 Pro', chipD:'5-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:19.5, ai:true,
    batt:27, battD:'Up to 27 hours of video playback', sec:'Face ID'
  },
  {
    id:'17', name:'iPhone 17', gen:'17', tier:'std', shot:'17', order:4,
    who:'The one that suits most people. Very little is missing.',
    size:6.3, dims:[149.6,71.5,7.95], weight:177,
    screen:'6.3-inch Super Retina XDR', screenD:'OLED, ProMotion and Always-On, Dynamic Island',
    promotion:true, alwaysOn:true, island:true,
    lenses:2, cameraD:'48MP Dual Fusion camera system — 48MP Fusion Main, 48MP Fusion Ultra Wide',
    ultrawide:true, telephoto:false, optical:2, crop:true,
    design:'Aluminium unibody', designD:'Ceramic Shield 2 front, 3× better scratch resistance',
    material:'Aluminium',
    chip:'A19', chipD:'5-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:19, ai:true,
    batt:30, battD:'Up to 30 hours of video playback', sec:'Face ID'
  },
  {
    id:'17e', name:'iPhone 17e', gen:'17', tier:'e', shot:'17e', order:5,
    who:'The newest chip in the cheapest body. A lot of iPhone 17 for less.',
    size:6.1, dims:[146.7,71.5,7.80], weight:167, dimsApprox:true,
    screen:'6.1-inch Super Retina XDR', screenD:'OLED',
    promotion:false, alwaysOn:false, island:false,
    lenses:1, cameraD:'48MP Fusion camera system with a 2× Telephoto lens and 4K Dolby Vision video',
    ultrawide:false, telephoto:true, optical:2,
    design:'Aluminium frame', designD:'Ceramic Shield 2 front, 3× better scratch resistance',
    material:'Aluminium',
    chip:'A19', chipD:'4-core GPU with Neural Accelerators, 16-core Neural Engine, C1X', chipGen:18.9, ai:true,
    batt:26, battD:'Up to 26 hours of video playback', sec:'Face ID'
  },

  /* ---------------- previous generation: iPhone 16 family ---------------- */
  {
    id:'16pm', name:'iPhone 16 Pro Max', gen:'16', tier:'pro', shot:null, order:6,
    who:'Last year’s biggest Pro. Still a 5× zoom and a huge battery.',
    size:6.9, dims:[163.0,77.6,8.25], weight:227,
    screen:'6.9-inch Super Retina XDR', screenD:'OLED and ProMotion',
    promotion:true, alwaysOn:false, island:true,
    lenses:3, cameraD:'48MP Main Fusion, 48MP Ultra-Wide, 48MP Macro, Telephoto with 5X Optical Zoom',
    ultrawide:true, telephoto:true, optical:5,
    design:'Aerospace-grade titanium', designD:'Ceramic Shield front',
    material:'Titanium',
    chip:'A18 Pro', chipD:'6-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:18.5, ai:true,
    batt:33, battD:'Up to 33 hours of video playback', sec:'Face ID'
  },
  {
    id:'16p', name:'iPhone 16 Pro', gen:'16', tier:'pro', shot:null, order:7,
    who:'Titanium and a 5× zoom in the smaller Pro size.',
    size:6.3, dims:[149.6,71.5,8.25], weight:199,
    screen:'6.3-inch Super Retina XDR', screenD:'OLED, ProMotion and Always-On',
    promotion:true, alwaysOn:true, island:true,
    lenses:3, cameraD:'48MP Main Fusion, 48MP Ultra-Wide, Telephoto with 5X Optical Zoom',
    ultrawide:true, telephoto:true, optical:5,
    design:'Aerospace-grade titanium', designD:'Ceramic Shield front',
    material:'Titanium',
    chip:'A18 Pro', chipD:'6-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:18.5, ai:true,
    batt:27, battD:'Up to 27 hours of video playback', sec:'Face ID'
  },
  {
    id:'16plus', name:'iPhone 16 Plus', gen:'16', tier:'std', shot:null, order:8,
    who:'A big screen without going Pro.',
    size:6.7, dims:[160.9,77.8,7.80], weight:199, sizeFix:true,
    screen:'6.7-inch Super Retina XDR', screenD:'OLED',
    promotion:false, alwaysOn:false, island:true,
    lenses:2, cameraD:'48MP Main Fusion, 12MP Ultra-Wide, 2X Optical Zoom',
    ultrawide:true, telephoto:false, optical:2, crop:true,
    design:'Aluminium with colour-infused glass back', designD:'Ceramic Shield front',
    material:'Aluminium',
    chip:'A18', chipD:'5-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:18, ai:true,
    batt:27, battD:'Up to 27 hours of video playback', sec:'Face ID'
  },
  {
    id:'16', name:'iPhone 16', gen:'16', tier:'std', shot:null, order:9,
    who:'Apple Intelligence, five colours, Camera Control.',
    size:6.1, dims:[147.6,71.6,7.80], weight:170,
    screen:'6.1-inch Super Retina XDR', screenD:'OLED',
    promotion:false, alwaysOn:false, island:true,
    lenses:2, cameraD:'48MP Main Fusion, 12MP Ultra-Wide, 2X Optical Zoom',
    ultrawide:true, telephoto:false, optical:2, crop:true,
    design:'Aluminium with colour-infused glass back', designD:'Ceramic Shield front',
    material:'Aluminium',
    chip:'A18', chipD:'5-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:18, ai:true,
    batt:22, battD:'Up to 22 hours of video playback', sec:'Face ID'
  },
  {
    id:'16e', name:'iPhone 16e', gen:'16', tier:'e', shot:null, order:10,
    who:'The simplest way in. One camera, long battery, Apple Intelligence.',
    size:6.1, dims:[146.7,71.5,7.80], weight:167,
    screen:'6.1-inch Super Retina XDR', screenD:'OLED',
    promotion:false, alwaysOn:false, island:false,
    lenses:1, cameraD:'2-in-1 camera system, 48MP Fusion',
    ultrawide:false, telephoto:false, optical:2, crop:true,
    design:'Aluminium with glass back', designD:'Ceramic Shield front',
    material:'Aluminium',
    chip:'A18', chipD:'4-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:17.9, ai:true,
    batt:26, battD:'Up to 26 hours of video playback', sec:'Face ID'
  },

  /* ---------------- still available: iPhone 15 family ---------------- */
  {
    id:'15pm', name:'iPhone 15 Pro Max', gen:'15', tier:'pro', shot:null, order:11,
    who:'The cheapest route to a 5× optical zoom.',
    size:6.7, dims:[159.9,76.7,8.25], weight:221,
    screen:'6.7-inch Super Retina XDR', screenD:'OLED and ProMotion',
    promotion:true, alwaysOn:true, island:true,
    lenses:3, cameraD:'48MP Main, 12MP Ultra-Wide, 12MP Telephoto with 5X Optical Zoom',
    ultrawide:true, telephoto:true, optical:5,
    design:'Aerospace-grade titanium', designD:'Ceramic Shield front',
    material:'Titanium',
    chip:'A17 Pro', chipD:'6-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:17.5, ai:true,
    batt:29, battD:'Up to 29 hours of video playback', sec:'Face ID'
  },
  {
    id:'15p', name:'iPhone 15 Pro', gen:'15', tier:'pro', shot:null, order:12,
    who:'Small, light, titanium — and it runs Apple Intelligence.',
    size:6.1, dims:[146.6,70.6,8.25], weight:187,
    screen:'6.1-inch Super Retina XDR', screenD:'OLED and ProMotion',
    promotion:true, alwaysOn:true, island:true,
    lenses:3, cameraD:'48MP Main, 12MP Ultra-Wide, 12MP Telephoto with 3X Optical Zoom',
    ultrawide:true, telephoto:true, optical:3,
    design:'Aerospace-grade titanium', designD:'Ceramic Shield front',
    material:'Titanium',
    chip:'A17 Pro', chipD:'6-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:17.5, ai:true, chipFix:true,
    batt:23, battD:'Up to 23 hours of video playback', sec:'Face ID'
  },
  {
    id:'15plus', name:'iPhone 15 Plus', gen:'15', tier:'std', shot:null, order:13,
    who:'A large screen at the lowest point in the range.',
    size:6.7, dims:[160.9,77.8,7.80], weight:201,
    screen:'6.7-inch Super Retina XDR', screenD:'OLED, Dynamic Island',
    promotion:false, alwaysOn:false, island:true,
    lenses:2, cameraD:'48MP Main, 12MP Ultra-Wide, 2X Optical Zoom',
    ultrawide:true, telephoto:false, optical:2, crop:true, cameraFix:true,
    design:'Aerospace-grade aluminium', designD:'Ceramic Shield front, colour-infused glass, USB-C',
    material:'Aluminium',
    chip:'A16 Bionic', chipD:'5-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:16, ai:false,
    batt:26, battD:'Up to 26 hours of video playback', sec:'Face ID'
  },
  {
    id:'15', name:'iPhone 15', gen:'15', tier:'std', shot:null, order:14,
    who:'Dynamic Island, USB-C and a 48MP main camera, for the least.',
    size:6.1, dims:[147.6,71.6,7.80], weight:171,
    screen:'6.1-inch Super Retina XDR', screenD:'OLED, Dynamic Island',
    promotion:false, alwaysOn:false, island:true,
    lenses:2, cameraD:'48MP Main, 12MP Ultra-Wide, 2X Optical Zoom',
    ultrawide:true, telephoto:false, optical:2, crop:true, cameraFix:true,
    design:'Aerospace-grade aluminium', designD:'Ceramic Shield front, colour-infused glass, USB-C',
    material:'Aluminium',
    chip:'A16 Bionic', chipD:'5-core GPU, 6-core CPU, 16-core Neural Engine', chipGen:16, ai:false,
    batt:20, battD:'Up to 20 hours of video playback', sec:'Face ID'
  }
];

const BY_ID = Object.fromEntries(MODELS.map(m => [m.id, m]));

const GENS = {
  '17': { label:'iPhone 17', tag:'Latest range',   blurb:'The current line-up. A19 chips, Ceramic Shield 2 and the best cameras and battery Apple has made.' },
  '16': { label:'iPhone 16', tag:'Previous range', blurb:'Still on sale, still runs Apple Intelligence. The Pro models keep the 5× zoom.' },
  '15': { label:'iPhone 15', tag:'Still available',blurb:'Dynamic Island and USB-C throughout. The Pro models run Apple Intelligence; the standard ones do not.' }
};

/* what each model can reach optically, for the zoom demo.
   Values are O2's own stated optical-zoom figures where the page gives them. */
function opticalReach(m){
  if(m.optical) return m.optical;
  if(m.telephoto) return 4;            // 17 Pro / Pro Max: telephoto present, figure not stated by O2
  return 1;
}
function zoomLabel(m){
  if(!m.telephoto && m.crop) return '2× (sensor crop)';
  if(m.optical) return m.optical + '× optical';
  return 'Telephoto lens';
}
