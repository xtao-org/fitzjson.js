> [!WARNING]
> [EXPERIMENTAL]
> [WORK IN PROGRESS]

<p align=center>
<img src="https://raw.githubusercontent.com/xtao-org/fitzjson/master/logo2.png" alt="fitzJSON logo" width="160"/>
<h1 align=center>fitzjson.js</h1>
</p>

Reference implementation of the [fitzJSON](https://github.com/xtao-org/fitzjson) semantics interpreter in JavaScript.

Depends on the reference [tree-sitter-fitzjson](https://github.com/xtao-org/tree-sitter-fitzjson) syntax.

Provides `fitzJSON.parse` and `fitzJSON.stringify` that work analogous to `JSON.parse` and `JSON.stringify` (see below for details).

## Install

```
npm i @xtao-org/fitzjson.js
```

## Use

To use, a parser object must be asynchronously produced first by `makeFitzJSON`.

```js
import {makeFitzJSON} from '@xtao-org/fitzjson.js'

const fitzJSON = await makeFitzJSON()

const input = `{"a":@bigint 2219302139021039219030213902193}`

const parsed = fitzJSON.parse(input)

const stringified = fitzJSON.stringify(parsed)

console.assert(input === stringified)
```

## fitzJSON.parse and .stringify vs JSON.parse and .stringify

This library provides `fitzJSON.parse` and `fitzJSON.stringify` that work analogous to `JSON.parse` and `JSON.stringify`.

Aims to support the exact same interface and a superset of the behavior of these functions. For documentation of these, see MDN:

* [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
* [JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)

The implementations here were written according to these specifications, extending functionality in accordance with the features of fitzJSON.

In particular, in fitzJSON.parse:

* The second argument can be either a reviver function (like in JSON.strigify) OR an options object (unlike JSON.stringify). The options object may contain the reviver function in its `reviver` property.
<!-- todo: possibly rename opts.mods to opts.decorators -->
<!-- todo: describe the interface of a decorator -->
<!-- Next to that it can contain the mods field which... -->

Also, in fitzJSON.stringify:

* if a value has a `.toFitzJSON` method, it will be preferred over `.toJSON`. The method has the same interface.
<!-- todo: should .toFitzJSON have the same interface or know more? -->
* BigInts will be represented as `@bigint <numerical value>`
* Dates will be represented as `@date <ISO string produced by .toISOString()>`
* +-Infinity and NaN will be represented literally
* `Map`s with string keys will be represented the same as objects
<!-- todo: maybe decorate with @map -->
* `Map`s with nonstring keys will cause an error
<!-- todo: maybe ignore nonstring entries instead of erroring or represent the whole map as {} -->
* a special `Decorated` class is provided which can be used to put custom decorators in the output. An instance of `Decorated` will be represented as `@<instance decorator> @<instance value>`. Such an instance should be constructed with `new Decorated(decoratorName, value)` where `decoratorName` should be a valid fitzJSON identifier (pretty much the same as a JavaScript identifier), otherwise the constructor will throw an error. `value` can be any stringifiable value.
<!-- todo: should identifiers be like JavaScript identifiers or simplified to a-zA-Z0-9$_? -->

Note: the [well-formed JSON.stringify() specification](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#well-formed_json.stringify) is implemented, so lone UTF-16 surrogates will be properly escaped in the output.

## Development

### Run tests

```
node --test
```