export const stringify = (value, replacer, space) => {
  // todo: replacer
  if (['symbol', 'undefined', 'function'].includes(typeof value)) throw Error('oops')

  if (value === null) return 'null'
  if (value === true) return 'true'
  if (value === false) return 'false'
  if (Number.isNaN(value)) return 'NaN'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'bigint') return `@bigint ${value.toString()}`
  if (typeof value === 'string') return stringifystring(value)
  if (Array.isArray(value)) return stringifyarray(value)
  if (value instanceof Map) return stringifymap(value)

  if (typeof value === 'object') return stringifyobject(value)

  throw Error('bug in stringify')
}

const stringifystring = (value) => {
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

const stringifyarray = (value) => {
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
  for (const it of value) {
    items.push(stringify(it))
  }

  return `[${items.join(',')}]`
}

/**
 * 
 * @param {Map} value 
 * @returns 
 */
const stringifymap = (value) => {
  const entries = [...value.entries()]
  // for now we'll support only string keys
  for (const [k, v] of entries) {
    if (typeof k !== 'string') throw Error('oops')
  }
  return stringifyentries(entries)
}
const stringifyobject = (value) => {
  const entries = Object.entries(value)
  return stringifyentries(entries)
}

const stringifyentries = (entries) => {
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
  for (const [k, v] of entries) {
    its.push(stringifystring(k) + ':' + stringify(v))
  }

  return `{${its.join(',')}}`
}