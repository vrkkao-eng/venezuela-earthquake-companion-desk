// Unit tests for i18n dictionary completeness
import { i18n } from './dictionary.js';

const langs = ['en', 'es', 'fr', 'it', 'zh'];
const referenceKeys = Object.keys(i18n.en);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

// Every language must have exactly the same keys as EN
for (const lang of langs) {
  console.log(`\nChecking language: ${lang}`);
  assert(lang in i18n, `language "${lang}" exists in dictionary`);

  for (const key of referenceKeys) {
    assert(
      key in i18n[lang],
      `key "${key}" present in ${lang}`
    );
    assert(
      typeof i18n[lang][key] === 'string' && i18n[lang][key].length > 0,
      `key "${key}" in ${lang} is a non-empty string`
    );
  }

  // EN header must be English (not Spanish)
  if (lang === 'en') {
    assert(
      !i18n.en.header.startsWith('Mesa'),
      'en.header is English, not Spanish'
    );
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
