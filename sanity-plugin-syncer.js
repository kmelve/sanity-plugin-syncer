const axios = require("axios");
const sanityClient = require('@sanity/client')
const client = token => sanityClient({
  projectId: '3do82whm',
  dataset: 'production',
  token
})
const NPM_API_SEARCH = "https://api.npms.io/v2/search/suggestions"
const NPM_API_PGKINFO = "https://api.npms.io/v2/package/"

module.exports = async function(context, cb) {
  const results = await axios(NPM_API_SEARCH + '?q=sanity-plugin').then(({data}) => data)
  console.log(results)
  const readMes = await Promise.all(results.map(({package: { name }}) => console.log(name)))
  console.log(readMes)
  return cb(200)
  /*
  const preparedResults = results
    .filter(({package: {name}}) => name.match(/^sanity-plugin/))
    .map(({ package }) => ({
      ...package,
      _id: package.name,
      _type: 'plugin',
      links: {
        _type: 'links',
        ...package.links
      },
      author: package.author.name,
      publisher: {
        _type: "publisher",
        ...package.publisher
      },
      maintainers: package.maintainers.map(maintainer => ({
        _type: "maintainer",
        ...maintainer
      }))
    }))
  

  
  const res = await preparedResults.reduce((trans, doc) => trans.createOrReplace(doc), client(context.secrets.API_TOKEN).transaction()).commit().catch(() => cb(500))
  console.log(res)
  cb(200)
  */
}
