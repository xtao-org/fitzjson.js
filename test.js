import {readFileSync} from 'node:fs'

import {makeFitzJSON} from './fitzjson.js'
import { stringify } from './stringify.js';

const assert = (cond, msg = '') => {
  if (cond === false) throw Error(`Assertion failed: ${msg}`)
}

(async () => {
  const fitzJSON = await makeFitzJSON()
  const txt = readFileSync('./examples/example1.fitz', {encoding: 'utf-8'})
  const parsed = fitzJSON.parse(txt, {mods: {
    i32: ({node, value}) => {
      assert(node.type === 'number')
      const num = value | 0
      assert(value === num, `Not an int32: ${value}`)
      return {value: num}
    },
    join: ({value}) => {
      assert(Array.isArray(value))

      return {value: value.join('')}
    },
    env: ({node}) => {
      let key
      if (node.type === 'id') key = node.text
      else if (node.type === 'string') key = evalstring(node)
      else throw Error(`@env`)

      return {value: process.env[key]}
    }
  }});

  console.log(parsed)

  console.log(stringify(parsed, null, 2))
  console.log(stringify(parsed))
  console.log(stringify("\uD800")) // '"\\ud800"'
  console.log(stringify("\uD800\uDC12")) // '"𐀒"'
  console.log(stringify("\uDC12")) // '"\udc12"'
  console.log(stringify(Object(Symbol()))) // {}
  console.log(stringify(Symbol())) // undefined
  console.log(stringify([Symbol()])) // [null]
  console.log(stringify({a: Symbol()})) // {}
  console.log(stringify("\u2028\u2029"))
  console.log(JSON.stringify("\u2028\u2029") === stringify("\u2028\u2029"))


  // const circularReference = {};
  // circularReference.myself = circularReference;

  // // Serializing circular references throws "TypeError: cyclic object value"
  // stringify(circularReference);
  {
    const fitzJSON = await makeFitzJSON()

    const input = `{"a":@bigint 2219302139021039219030213902193}`

    const parsed = fitzJSON.parse(input)

    const stringified = fitzJSON.stringify(parsed)

  console.assert(input === stringified, input, parsed, stringified)
  }

})();
