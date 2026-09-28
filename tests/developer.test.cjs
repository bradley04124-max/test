const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'wowls0914.html'), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];
function segment(from, to) {
  const start = js.indexOf(from), end = js.indexOf(to, start);
  assert.ok(start >= 0 && end > start, `Missing code segment: ${from}`);
  return js.slice(start, end);
}

function game() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        value: '', style: {}, innerHTML: '', textContent: '', disabled: false,
        classList: {
          add: name => classes.add(name),
          remove: name => classes.delete(name),
          contains: name => classes.has(name),
        },
        focus() {},
      });
    }
    return elements.get(id);
  };
  const storage = new Map();
  const context = {
    document: {getElementById: element, querySelectorAll: () => []},
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    alert() {}, confirm: () => true, sfx() {}, rHP() {}, updSh() {},
    dJ1() {}, dJ2() {}, setupInp() {},
  };
  vm.createContext(context);
  vm.runInContext(
    segment('function $(id)', '// 🔑 개발자 비밀번호 입력 창 열기') +
    segment('function gunSVG', 'function goScr') +
    segment('function initG', 'function cdA'), context,
  );
  const run = code => vm.runInContext(code, context);
  return {context, element, storage, run};
}

test('developer-only equipment is hidden, guarded and removed on reload', () => {
  const {context, element, storage, run} = game();
  storage.set('jolla_legend_v4', JSON.stringify({
    owned: {body: ['default', 'devcyan'], aura: ['none', 'devmatrix'],
      gun: ['default', 'devblaster'], hat: ['none', 'devcrown']},
    equipped: {body: 'devcyan', aura: 'devmatrix', gun: 'devblaster', hat: 'devcrown'},
  }));
  context.loadUser();
  for (const cat of ['body', 'aura', 'gun', 'hat']) {
    assert.equal(run(`USER.owned.${cat}.some(id=>SHOP.${cat}.find(it=>it.id===id)?.devOnly)`), false);
    assert.equal(run(`SHOP.${cat}.find(it=>it.id===USER.equipped.${cat})?.devOnly||false`), false);
  }
  for (const cat of ['body', 'aura', 'gun', 'hat']) {
    context.shopTab(cat);
    assert.doesNotMatch(element('shopContent').innerHTML, /개발자 전용/);
  }
  context.buyEq('gun', 'devblaster');
  assert.equal(context.getGunId(), 'default');
  assert.equal(context.getAuraId(), 'none');
});

test('developer session unlocks every exclusive visual item, exiting blocks them', () => {
  const {context, element, run} = game();
  context.loadUser();
  run('DEV_BACKUP=JSON.parse(JSON.stringify(USER)); for(const cat of ["body","aura","gun","hat"]) SHOP[cat].filter(it=>it.devOnly).forEach(it=>USER.owned[cat].push(it.id));');
  assert.equal(run('Object.values(SHOP).flat().filter(it=>it.devOnly).length'), 8);
  for (const cat of ['body', 'aura', 'gun', 'hat']) {
    context.shopTab(cat);
    assert.match(element('shopContent').innerHTML, /개발자 전용/);
  }
  context.buyEq('body', 'devrose');
  context.buyEq('aura', 'devnova');
  context.buyEq('gun', 'devblaster');
  context.buyEq('hat', 'devhalo');
  assert.equal(context.getCol(), '#ff53be');
  assert.equal(context.getAuraId(), 'devnova');
  assert.equal(context.getGunId(), 'devblaster');
  assert.equal(context.getHat(), '💫');
  assert.match(context.gunSVG('devblaster'), /#0ff/);
  run('DEV_BACKUP=null');
  assert.equal(context.getGunId(), 'default');
  assert.equal(context.getAuraId(), 'none');
  context.buyEq('aura', 'devnova');
  assert.equal(context.getAuraId(), 'none');
});

test('each developer skill works once per AI match and is unavailable otherwise', () => {
  const {context, element, run} = game();
  context.loadUser();
  run('DEV_BACKUP={}; G.mode="ai"; G.on=true; G.tLeft=10; G.tLim=15; G.p1.hp=2; G.p1.sh=2;');
  element('scrGame').classList.add('on');
  context.updateDevSkillUI();
  assert.equal(element('devSkills').style.display, 'grid');
  context.useDevSkill('time');
  context.useDevSkill('time');
  assert.equal(run('G.tLeft'), 15);
  context.useDevSkill('heal');
  context.useDevSkill('heal');
  assert.equal(run('G.p1.hp'), 3);
  context.useDevSkill('shield');
  context.useDevSkill('shield');
  assert.equal(run('G.p1.sh'), 3);
  assert.equal(element('devSkillHeal').disabled, true);
  run('G.on=false; G.aimPhase=true; G.aimSh="p1"; G.aimTime=3;');
  element('aimOv').classList.add('on');
  context.updateDevSkillUI();
  assert.equal(element('devSkillFocus').style.display, 'block');
  context.useDevSkill('focus');
  context.useDevSkill('focus');
  assert.equal(run('G.aimTime'), 5);
  run('G.devSkillsUsed=newDevSkillState(); G.aimSh="p2";');
  context.useDevSkill('focus');
  assert.equal(run('G.aimTime'), 5);
  run('G.on=true; G.aimPhase=false; G.mode="pvp";');
  context.useDevSkill('time');
  assert.equal(run('G.tLeft'), 15);
  run('G.mode="ai"; DEV_BACKUP=null;');
  context.updateDevSkillUI();
  assert.equal(element('devSkills').style.display, 'none');
  context.useDevSkill('time');
  assert.equal(run('G.tLeft'), 15);
  context.initG();
  assert.equal(run('Object.values(G.devSkillsUsed).every(used=>!used)'), true);
});
