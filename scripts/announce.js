import {toot} from './toot.js'

const ret = await toot(`
New release of fitzjson.js published!

https://github.com/xtao-org/fitzjson.js/releases

#fitzjson #javascript #release #json
`, {
  body: {
    visibility: "public"
  }
})
