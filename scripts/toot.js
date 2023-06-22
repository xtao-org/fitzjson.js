// todo: extract to lib?
/**
 * Note: default visibility is private
 * @param {string} status 
 * @param {{
 *  url?: string
 *  body?: {
 *    visibility?: 'private' | 'public', 
 *    status?: string, 
 *  }
 *  token?: string
 * }} opts 
 */
export const toot = async (status, opts = {}) => {
  const {url = 'https://toot.io', body = {}, token = process.env.TOOT_TOKEN} = opts
  const ret = await fetch(`${url}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status,
      visibility: "private",
      ...body,
    }),
  });
  
  if (ret.ok) {
    const json = await ret.json()
    
    console.log(`Created toot with id`, json.id)
  } else {
    console.error(`Error: toot failed!`)
    console.error(`Response: ${ret.status} ${ret.statusText}`)
    const text = await ret.text()
    console.error(text)
    throw Error(`Toot failed!`)
  }
}
