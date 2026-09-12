import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BUILT_IN_FORGE_API_URL = 'https://forge.test';
process.env.BUILT_IN_FORGE_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

const {
  detectFramework,
  detectPlatform,
  detectWorkflowMode,
  resolveModelTier,
  resolveRoute,
} = await import('../api/chat.js');

const msg = (content) => [{ role: 'user', content }];
const textVariants = (value) => [value, value.toUpperCase(), `  ${value}  `];

const modelAliases = {
  spark: ['spark', 'fabie', 'haiku', 'claude-haiku-4-5', 'claude-haiku-4-5-20251001'],
  star: ['star', 'smart', 'sonnet', 'claude-sonnet-5', 'claude-sonnet-4-6'],
  comet: ['comet', 'opus', 'claude-opus-5', 'claude-opus-4-6'],
  nova: ['nova', 'ultra', 'fable', 'claude-fable-5', 'claude-opus-4-8'],
};
const plans = ['free', 'starter', 'plus', 'pro', 'owner', 'lite'];
for (const [tier, aliases] of Object.entries(modelAliases)) {
  for (const alias of aliases) {
    for (const variant of textVariants(alias)) {
      for (const plan of plans) {
        test(`model matrix: ${JSON.stringify(variant)} on ${plan} resolves safely`, () => {
          const expected = tier === 'nova' && !['pro', 'owner'].includes(plan) ? 'star' : tier;
          assert.equal(resolveModelTier(variant, plan), expected);
          if (!['pro', 'owner'].includes(plan)) assert.notEqual(resolveModelTier(variant, plan), 'nova');
        });
      }
    }
  }
}

const roleModels = {
  planner: 'gpt-5-mini',
  implementer: 'claude-sonnet-4-6',
  researcher: 'gemini-3-flash-preview',
  reviewer: 'gpt-5',
  security: 'gpt-5',
  tester: 'claude-opus-4-7',
};
const rolePlans = ['free', 'starter', 'plus', 'pro', 'owner'];
const requestedModels = ['smart', 'ultra'];
for (const [role, expectedModel] of Object.entries(roleModels)) {
  for (const plan of rolePlans) {
    for (const requestedModel of requestedModels) {
      test(`role matrix: ${role} on ${plan} with ${requestedModel}`, () => {
        const route = resolveRoute(requestedModel, role, plan);
        assert.equal(route.role, role);
        const premiumRole = ['reviewer', 'security', 'tester'].includes(role);
        const privileged = ['pro', 'owner'].includes(plan);
        if (premiumRole && !privileged) {
          assert.equal(route.provider, 'anthropic');
          assert.equal(route.tier, 'star');
          assert.notEqual(route.tier, 'nova');
        } else {
          assert.equal(route.provider, 'forge');
          assert.equal(route.model, expectedModel);
        }
      });
    }
  }
}

const robloxSignals = ['roblox', 'luau', 'datastore', 'remoteevent', 'remotefunction', 'replicatedstorage', 'roblox studio'];
const fivemSignals = ['fivem', 'qbcore', 'esx', 'fxmanifest', 'ox_lib', 'gta v'];
for (const signal of robloxSignals) {
  for (const variant of textVariants(signal)) {
    test(`platform matrix: Roblox signal ${JSON.stringify(variant)}`, () => {
      assert.equal(detectPlatform(msg(`Please help with ${variant}`)), 'roblox');
    });
  }
}
for (const signal of fivemSignals) {
  for (const variant of textVariants(signal)) {
    test(`platform matrix: FiveM signal ${JSON.stringify(variant)}`, () => {
      assert.equal(detectPlatform(msg(`Please help with ${variant}`)), 'fivem');
    });
  }
}
for (const roblox of robloxSignals) {
  for (const fivem of fivemSignals) {
    test(`platform matrix: mixed ${roblox} + ${fivem}`, () => {
      assert.equal(detectPlatform(msg(`${roblox} integration with ${fivem}`)), 'mixed');
    });
  }
}
const generalPlatformInputs = [
  'help me write code','make a web page','fix this javascript','explain this error','build an api',
  'make a calculator','write a python function','help with css','design a database','create a form',
  'make a discord bot','explain recursion','review my typescript','write unit tests','build a dashboard',
  'make a rest endpoint','parse this json','improve performance','fix this sql query','create documentation',
  'make a command line tool','help with git','build a landing page','write a regex','explain this stack trace',
];
for (const input of generalPlatformInputs) {
  test(`platform matrix: general input ${JSON.stringify(input)}`, () => {
    assert.equal(detectPlatform(msg(input)), 'general');
  });
}

const frameworkCases = {
  qbcore: ['qbcore', 'qb-core', 'getcoreobject'],
  esx: ['esx', 'sharedobject', 'esx:getsharedobject'],
  ox_lib: ['ox_lib', 'oxlib'],
  standalone: ['standalone', 'no framework', 'without framework'],
};
for (const [expected, signals] of Object.entries(frameworkCases)) {
  for (const signal of signals) {
    for (const variant of textVariants(signal)) {
      test(`framework matrix: ${expected} from ${JSON.stringify(variant)}`, () => {
        assert.equal(detectFramework(msg(`FiveM setup using ${variant}`), 'fivem'), expected);
      });
    }
  }
}
for (const qb of frameworkCases.qbcore) {
  for (const esx of frameworkCases.esx) {
    test(`framework matrix: conflicting ${qb} + ${esx} stays unknown`, () => {
      assert.equal(detectFramework(msg(`FiveM ${qb} migration from ${esx}`), 'fivem'), 'unknown');
    });
  }
}
for (const signal of [...frameworkCases.qbcore, ...frameworkCases.esx]) {
  test(`framework matrix: Roblox platform ignores ${signal}`, () => {
    assert.equal(detectFramework(msg(`Roblox project mentioning ${signal}`), 'roblox'), 'unknown');
  });
}
const auditSignals = ['audit', 'review this code', 'review the code', 'find bugs', 'find vulnerabilities', 'security review', 'debug this'];
for (const signal of auditSignals) {
  for (const variant of textVariants(signal)) {
    test(`workflow matrix: audit from ${JSON.stringify(variant)}`, () => {
      assert.equal(detectWorkflowMode(msg(variant), 'general'), 'audit');
    });
  }
}

const robloxBuildSignals = [
  'build pack','complete game','full game','entire game','larger system','make a game','build inventory system',
];
for (const signal of robloxBuildSignals) {
  for (const variant of [signal, signal.toUpperCase()]) {
    test(`workflow matrix: Roblox build pack from ${JSON.stringify(variant)}`, () => {
      assert.equal(detectWorkflowMode(msg(variant), 'roblox'), 'roblox_build_pack');
    });
  }
}

const fivemResourceSignals = [
  'resource','fxmanifest','script pack','complete script','full script','build a system','make a system',
];
for (const signal of fivemResourceSignals) {
  for (const variant of [signal, signal.toUpperCase()]) {
    test(`workflow matrix: FiveM resource from ${JSON.stringify(variant)}`, () => {
      assert.equal(detectWorkflowMode(msg(variant), 'fivem'), 'fivem_resource');
    });
  }
}

const generalWorkflowInputs = [
  'explain this function','write a helper','make a small change','rename this variable','add comments',
  'show me an example','what does this do','help me understand this','make this faster','format this code',
  'add a button','change the text','update the color','create a config value','add a command',
  'write a short snippet','show a simple pattern','explain the api','add logging','document this function',
];
for (const input of generalWorkflowInputs) {
  test(`workflow matrix: general input ${JSON.stringify(input)}`, () => {
    assert.equal(detectWorkflowMode(msg(input), 'general'), 'general');
  });
}
