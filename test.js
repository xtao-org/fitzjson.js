import test from 'node:test'
import assert from 'node:assert/strict';
import { stringify } from './stringify.js';
import { makeFitzJSON } from './fitzjson.js';

test('stringify', () => {
  assert.equal(stringify("\uD800"), '"\\ud800"') // '"\\ud800"'
  assert.equal(stringify("\uD800\uDC12"), '"𐀒"') // '"𐀒"'
  assert.equal(stringify("\uDC12"), '"\\udc12"') // '"\udc12"'
  assert.equal(stringify(Object(Symbol())), '{}') // {}
  assert.equal(stringify(Symbol()), undefined) // undefined
  assert.equal(stringify([Symbol()]), '[null]') // [null]
  assert.equal(stringify({a: Symbol()}), '{}') // {}
  // todo: perhaps escape these the way firefox does
  assert.equal(stringify("\u2028\u2029"), '"\u2028\u2029"')
})

test('parse', async () => {
  const fitz = await makeFitzJSON()

  assert.deepEqual(fitz.parse("{a: 1}"), {a: 1})
})

test('roundtrip', async () => {
  const fitzJSON = await makeFitzJSON()

  const input = `{"a":@bigint 2219302139021039219030213902193}`

  const parsed = fitzJSON.parse(input)

  const stringified = fitzJSON.stringify(parsed)

  assert.equal(input, stringified)
})