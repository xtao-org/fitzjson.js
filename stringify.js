/// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
export const stringify = (value, replacer, space) => {
  // todo: replacer
  if (['symbol', 'undefined', 'function'].includes(typeof value)) throw Error('oops')

  let indent = ''
  if (typeof space === 'number') {
    for (let i = 0; i < 10 && i < space; ++i) {
      indent += ' '
    }
  } else if (typeof space === 'string') {
    indent = space.slice(0, 10)
  }
  let cindent = ''

  // todo: filter by onlyProps
  if (Array.isArray(replacer)) {
    const onlyProps = []
    for (const it of replacer) {
      if (['string', 'number'].includes(typeof it)) onlyProps.push(it)
    }
  }

  const opts = {indent, cindent, onlyProps}

  return stringifyvalue(value, opts)
}

const stringifyvalue = (value, opts) => {
  if (value === null) return 'null'
  if (value === true) return 'true'
  if (value === false) return 'false'
  if (Number.isNaN(value)) return 'NaN'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'bigint') return `@bigint ${value.toString()}`
  if (typeof value === 'string') return stringifystring(value, opts)
  if (Array.isArray(value)) return stringifyarray(value, opts)
  if (value instanceof Map) return stringifymap(value, opts)

  if (typeof value === 'object') return stringifyobject(value, opts)

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

  const items = []

  const {indent} = opts
  if (indent === '') {
    for (const it of value) {
      items.push(stringifyvalue(it, opts))
    }

    return `[${items.join(',')}]`
  }
  const {cindent} = opts
  const ncindent = cindent + indent

  const nopts = {
    ...opts,
    cindent: ncindent
  }

  for (const it of value) {
    items.push(stringifyvalue(it, nopts))
  }

  return `[\n${ncindent}${items.join(`,\n${ncindent}`)}\n${cindent}]`
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
  return stringifyentries(entries, opts)
}
const stringifyobject = (value, opts) => {
  const entries = Object.entries(value)
  return stringifyentries(entries, opts)
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

  const its = []
  const {indent} = opts
  if (indent === '') {
    for (const [k, v] of entries) {
      its.push(stringifystring(k) + ':' + stringifyvalue(v, opts))
    }
    return `{${its.join(',')}}`
  }

  const {cindent} = opts
  const ncindent = cindent + indent

  const nopts = {
    ...opts,
    cindent: ncindent
  }

  for (const [k, v] of entries) {
    its.push(stringifystring(k) + ': ' + stringifyvalue(v, nopts))
  }

  return `{\n${ncindent}${its.join(`,\n${ncindent}`)}\n${cindent}}`
}