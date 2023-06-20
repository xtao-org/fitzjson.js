[EXPERIMENTAL]
[WORK IN PROGRESS]

<p align=center>
<img src="https://raw.githubusercontent.com/xtao-org/fitzjson/master/logo2.png" alt="fitzJSON logo" width="160"/>
<h1 align=center>fitzjson.js</h1>
</p>

Reference implementation of the [fitzJSON](https://github.com/xtao-org/fitzjson) semantics interpreter in JavaScript.

Depends on the reference [tree-sitter-fitzjson](https://github.com/xtao-org/tree-sitter-fitzjson) syntax.

Provides `fitzJSON.parse` and `fitzJSON.stringify` that work analogous to `JSON.parse` and `JSON.stringify`.

To use, a parser object must be asynchronously produced first by `makeFitzJSON`.

```js
import {makeFitzJSON} from 'fitzjson.js'

const fitzJSON = await makeFitzJSON()

const input = `{"a":@bigint 2219302139021039219030213902193}`

const parsed = fitzJSON.parse(input)

const stringified = fitzJSON.stringify(parsed)

console.assert(input === stringified)
```