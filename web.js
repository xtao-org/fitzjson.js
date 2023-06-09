import Parser from 'web-tree-sitter';

import {readFileSync} from 'node:fs'

(async () => {
  await Parser.init();
  const parser = new Parser();
  const Lang = await Parser.Language.load('node_modules/@xtao-org/tree-sitter-fitzjson/tree-sitter-fitzjson.wasm');
  parser.setLanguage(Lang);
  const txt = readFileSync('./ex2.2.fitz', {encoding: 'utf-8'})
  const tree = parser.parse(txt);

  console.log(tree.rootNode.type === 'top')
  console.log(tree.rootNode.child(0).type === 'entries')
  // cons

  console.log(evalfitz(tree, {mods: {
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
  }}))

  // tree.rootNode.children
})();

const assert = (cond, msg = '') => {
  if (cond === false) throw Error(`Assertion failed: ${msg}`)
}

/**
 * @param {Parser.SyntaxNode} node
 */
const getErrors = (node, errors = []) => {
  for (const c of node.children) {
    if (c.type === 'ERROR') errors.push(c)
    else getErrors(c, errors)
  }
  return errors
}

/**
 * @param {Parser.Tree} tree
 */
const evalfitz = (tree, {mods = {}} = {}) => {
  if (tree.rootNode.hasError()) {
    let n = tree.rootNode
    const errors = getErrors(n)
    console.error(errors.map(e => [e.toString(), e.startPosition, e.endPosition]))
    throw Error('evalfitz')
  }

  assert(tree.rootNode.type === 'top')
  const topnode = tree.rootNode.child(0)


  const ctx = {
    topenv: {
      $: undefined,
      env: process.env,
    },
    mods,
  }

  if (topnode.type === 'entries') {
    // topenv.$ = topenv.self = new Map()
    return evalentries(topnode, ctx)
  } 
  else if (topnode.type === 'items') {
    // topenv.$ = topenv.self = []
    return evalitems(topnode, ctx)
  }
  else {
    return evalvalue(topnode, ctx)
  }
  console.error(topnode.id, topnode)
  throw Error('evalfitz')
}

/**
 * @param {Parser.SyntaxNode} node 
 */
const evalentries = (node, ctx) => {
  const ret = new Map()
  const {topenv} = ctx
  if (topenv.$ === undefined) topenv.$ = ret
  topenv.self = ret
  loop: for (const c of node.children) {
    if (c.type !== 'entry') continue
    const decos = []
    for (const d of c.children) {
      if (d.type === 'disabled') continue loop
      if (d.type === 'decorator') decos.push(d)
    }
    // console.log(decos)
    const keynode = c.childForFieldName('key')
    const valuenode = c.childForFieldName('value')

    // const t = c.childForFieldName('decorators')
    // console.log('*******', t?.toString?.())

    // if (valuenode === null) console.error(c.toString(), c.childForFieldName('value'))

    const key = evalkey(keynode, ctx)
    const value = evalvalue(valuenode, ctx)

    // for (const deco of decos) {
    //   for (const dd of deco.children) {
    //     if (dd.type === 'id') throw Error(deco.text)
    //   }
    // }

    if (ret.has(key)) throw Error(`Duplicate key: |${key}|!`)

    ret.set(key, value)
  }
  return ret
}

/**
 * @param {Parser.SyntaxNode} node 
 */
const evalitems = (node, ctx) => {
  const ret = []
  const {topenv} = ctx
  if (topenv.$ === undefined) topenv.$ = ret
  // topenv.self = ret
  for (const c of node.children) {
    if (['[', ']', '\n'].includes(c.type)) continue

    // console.log('xxx', c.toString())

    // todo: if disabled continue
    // todo: eliminate comments

    ret.push(evalvalue(c, ctx))
  }
  return ret
}

/**
 * @param {Parser.SyntaxNode} node 
 */
const evalkey = (node, ctx) => {
  if (node.type === 'id') return node.text
  if (node.type === 'number') return node.text
  if (node.type === 'string') return evalstring(node.child(0))
  console.error(node, node.type)
  throw Error('evalkey')
}

/**
 * @param {Parser.SyntaxNode} node 
 */
const evalstring = (node, ctx) => {
  if (node.type === 'jsonstring') return JSON.parse(node.text)
  if (node.type === 'multistring') return node.descendantsOfType('ms_content')[0].text
  throw Error('evalstring')
}

/**
 * @param {Parser.SyntaxNode} node1
 */
const evalvalue = (node1, ctx) => {
  // const node = node1.childForFieldName('plainval')
  const node = node1.childForFieldName('plainval')



  const plainval = evalplainval(node, ctx)

  const {mods} = ctx
  // /** @type {Parser.SyntaxNode[]} */
  const decorators = node1.childForFieldName('decorators')

  const modfns = []
  if (decorators !== null) {
    for (const d of decorators.children) {
      if (d.type !== 'decorator') continue
      const v = d.childForFieldName('plainval')
      if (v.type === 'id') {
        const id = v.text
        const mod = mods[id]
        if (mod !== undefined) modfns.unshift(mod)
        else {
          // todo: error
        }
      }
      else {
        // todo
      }
    }
  }

  let result = plainval
  for (const fn of modfns) {
    const {value} = fn({value: result, node: node})
    result = value
  }

  return result
}

/**
 * @param {Parser.SyntaxNode} node
 */
const evalplainval = (node, ctx) => {
  // node.
  if (node.type === 'string') return evalstring(node.child(0), ctx)
  if (node.type === 'true') return true
  if (node.type === 'false') return false
  if (node.type === 'null') return null
  if (node.type === 'number') return Number(node.text)
  if (node.type === 'list') return evalitems(node, ctx)
  if (node.type === 'map') return evalentries(node, ctx)
  if (node.type === 'path') {
    let val = ctx.topenv
    for (const c of node.children) {
      if (c.type === 'id') {
        // start of path
        const key = c.text
        if (val instanceof Map) val = val.get(key)
        else val = val[key]
      }
      else if (c.type === 'dotted') {
        const c2 = c.childForFieldName('id')
        assert(c2.type === 'id')
        const key = c2.text
        if (val instanceof Map) val = val.get(key)
        else val = val[key]
      }
      else if (c.type === 'parened') {
        const c2 = c.childForFieldName('value')
        if (['string', 'number'].includes(c2.type)) {
          const key = evalplainval(c2, ctx)
          if (val instanceof Map) val = val.get(key)
          else val = val[key]
        }
        else {
          // todo: parened id
          // maybe todo: parened path
        }
      }
      else {
        // note: could be '.', '(', ')', comment -- should be ignored
        // console.log(c.toString())
        // throw Error('evalpath')
      }
    }
    // console.log('val', node.toString(), val)
    return val
  }
  if (node.type === 'id') {
    let val = ctx.topenv
    if (val instanceof Map) val = val.get(node.text)
    else val = val[node.text]
    return val
  }
  console.error(node, `|${node.type}|`)
  throw Error('evalplainval')
}