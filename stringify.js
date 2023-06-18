/// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
// todo: Well-formed JSON.stringify()
export const stringify = (value, replacer, space) => {
  // todo: perhaps accepts options object as second parameter
  // then providing the third parameter should be invalid
  // options would be sth like {replacer, space, mods?, ...}

  let indent = ''
  if (typeof space === 'number' || space instanceof Number) {
    for (let i = 0; i < 10 && i < space; ++i) {
      indent += ' '
    }
  } else if (typeof space === 'string' || space instanceof String) {
    indent = space.slice(0, 10)
  }
  let cindent = ''

  let selectProps = null
  let replaceFn
  if (Array.isArray(replacer)) {
    selectProps = new Set()
    for (const it of replacer) {
      if (typeof it === 'string') selectProps.add(it)
      else if (
        typeof it === 'number' || 
        it instanceof String ||
        it instanceof Number
      ) selectProps.add(it.toString())
    }
  } else if (typeof replacer === 'function') {
    replaceFn = replacer
  }

  const opts = {
    indent, 
    cindent, 
    selectProps, 
    replaceFn, 
    key: '', 
    parent: null,
    seen: new Set()
  }

  return stringifyvalue(value, opts)
}

const stringifyvalue = (value, opts) => {
  const {replaceFn, key} = opts

  if (replaceFn !== undefined) {
    const {parent} = opts
    value = replaceFn.call(parent, key, value)
  }

  if (value === null) return 'null'
  
  if (typeof value.toFitzJSON === 'function') {
    value = value.toFitzJSON(key)
  } else if (typeof value.toJSON === 'function') {
    value = value.toJSON(key)
  }

  if (
    value instanceof Boolean || 
    value instanceof Number ||
    value instanceof String ||
    value instanceof BigInt ||
    value instanceof Symbol
  ) {
    value = value.valueOf()
  }

  //
  // simple types
  //
  if (value === true) return 'true'
  if (value === false) return 'false'
  if (Number.isNaN(value)) return 'NaN'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'bigint') return `@bigint ${value.toString()}`
  if (typeof value === 'string') return stringifystring(value, opts)

  //
  // complex types
  //
  if (opts.seen.has(value)) throw TypeError(`Converting circular structure to fitzJSON`)
  opts.seen.add(value)

  if (Array.isArray(value)) return stringifyarray(value, opts)
  // todo: perhaps serialize Map as @Map or object as @object
  if (value instanceof Map) return stringifymap(value, opts)
  // todo?: perhopas serialize Set as @Set [...]

  if (typeof value === 'object') return stringifyobject(value, opts)

  //
  // disappearing types
  //
  // todo: perhaps stringify symbol and undefined to something more useful
  if (typeof value === 'function') return undefined
  if (typeof value === 'symbol') return undefined
  if (typeof value === 'undefined') return undefined

  throw Error('bug in stringify')
}

const stringifystring = (value, opts) => {
  // jsonstring: $ => choice(
  //   '""',
  //   seq('"', $.string_content, token.immediate('"'))
  // ),

  if (value === "") return '""'

  let string_content = ''

  for (const c of value) {
    if (c === '"') string_content += '\\"'
    else if (c === '\\') string_content += '\\\\'
    else if (c === '\b') string_content += '\\b'
    else if (c === '\f') string_content += '\\f'
    else if (c === '\n') string_content += '\\n'
    else if (c === '\r') string_content += '\\r'
    else if (c === '\t') string_content += '\\t'
    else if (c <= '\u001F' && c >= '\u0010') string_content += '\\u00' + c.toString(16)
    else if (c < '\u0010') string_content += '\\u000' + c.toString(16)
    // todo: perhaps option to \u escape characters > 255 or so
    else string_content += c
  }

  return `"${string_content}"`


  // string_content: $ => repeat1(choice(
  //   // a character is: [\u0020-\u10FFFF] - '"' - '\'
  //   // in other words: any code point except control characters and '"' and '\'
  //   // we will express that with a negated character class
  //   // note: U+0001–U+001F are the control characters
  //   token.immediate(prec(1, /[^\\"\u0001-\u001F]+/)),
  //   $.escape_sequence,
  // )),

  // escape_sequence: $ => token.immediate(seq(
  //   '\\',
  //   /(\"|\\|\/|b|f|n|r|t|u[0-9a-fA-F]{4})/
  // )),
  // return JSON.stringify(value)
}

const stringifyarray = (value, opts) => {
  // item: $ => //falias($, 'value', 
  //     seq(
  //       falias($, 'decorators', repeat($.decorator)),
  //       field('disabled', optional($.disabled)), 
  //       $._plainval, 
  //       falias($, 'pipes', repeat($.pipe)),
  //     ),
  // list: $ => seq('[', 
  // items($),
  // ']'),
  // const items = $ => sep(
  //   $.item,
  //   $._valsep,
  // )
  // const sep = (item, valsep) => seq(
  //   repeat(seq(item, valsep)),
  //   optional(item),
  // )
  if (value.length === 0) return '[]'

  const {indent} = opts
  const opts2 = {...opts, parent: value}
  if (indent === '') {
    const items = stringifyarrayitems(value, opts2)
    return `[${items.join(',')}]`
  }
  const {cindent} = opts2
  const ncindent = cindent + indent

  const nopts = {
    ...opts2,
    cindent: ncindent
  }
  const items = stringifyarrayitems(value, nopts)
  return `[\n${ncindent}${items.join(`,\n${ncindent}`)}\n${cindent}]`
}
const stringifyarrayitems = (value, opts) => {
  const items = []
  for (let i = 0; i < value.length; ++i) {
    const it = value[i]
    const str = stringifyvalue(it, {...opts, key: i.toString()})
    items.push(str === undefined? 'null': str)
  }
  return items
}

/**
 * 
 * @param {Map} value 
 * @returns 
 */
const stringifymap = (value, opts) => {
  const entries = [...value.entries()]
  // for now we'll support only string keys
  for (const [k, v] of entries) {
    if (typeof k !== 'string') throw Error('oops')
  }
  return stringifyentries(entries, {...opts, parent: value})
}
const stringifyobject = (value, opts) => {
  const entries = Object.entries(value)
  return stringifyentries(entries, {...opts, parent: value})
}

const stringifyentries = (entries, opts) => {
  // entry: $ => prec(2, seq(
  //   falias($, 'decorators', repeat($.decorator)),
  //   field('disabled', optional($.disabled)), 
  //   field('key', $.key), 
  //   falias($, 'pipes', repeat($.pipe)),
  //   // note: /(\s)/ has to have the parens; otherwise tree-sitter somehow conflates this with /\s/ in extras and very weird things start happening, such as not respecting token.immediate and accepting jsonstrings with spaces 
  //   choice(':', /(\s)/),
  //   field('value', $.value),
  // )),
  if (entries.length === 0) return '{}'

  const {selectProps} = opts

  const selectedEntries = selectProps === null? 
    entries:
    entries.filter(([k, v]) => selectProps.has(k))

  const {indent} = opts
  if (indent === '') {
    const its = stringifyentriesitems(selectedEntries, opts, ':')
    return `{${its.join(',')}}`
  }

  const {cindent} = opts
  const ncindent = cindent + indent

  const nopts = {
    ...opts,
    cindent: ncindent
  }

  const its = stringifyentriesitems(selectedEntries, nopts, ': ')
  return `{\n${ncindent}${its.join(`,\n${ncindent}`)}\n${cindent}}`
}
const stringifyentriesitems = (selectedEntries, opts, sep) => {
  const its = []
  for (const [k, v] of selectedEntries) {
    const nopts = {...opts, key: k}
    const value = stringifyvalue(v, nopts)
    if (value === undefined) continue
    its.push(stringifystring(k, nopts) + sep + value)
  }
  return its
}