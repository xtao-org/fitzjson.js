import {readFileSync} from 'node:fs'

import {makeFitzJSON} from './fitzjson.js'

const assert = (cond, msg = '') => {
  if (cond === false) throw Error(`Assertion failed: ${msg}`)
}

(async () => {
  const fitzJSON = await makeFitzJSON()
  const txt = readFileSync('./examples/example1.fitz', {encoding: 'utf-8'})
  const parsed = fitzJSON.parse(txt, {mods: {
    bigint: ({node}) => {
      // console.log(node.type)
      assert(node.type === 'number')
      return {value: BigInt(node.text)}
    },
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
})();