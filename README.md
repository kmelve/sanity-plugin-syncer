require('dotenv').config()
const axios = require("axios");
const sanityClient = require('@sanity/client')
const client = sanityClient({
  projectId: '3do82whm',
  dataset: 'production',
  token: process.env.API_TOKEN
})
const NPM_API = "https://api.npms.io/v2/search/suggestions"

module.exports = async function run() {
  const results = await axios(NPM_API + '?q=sanity-plugin').then(({
    data
  }) => data)
  const preparedResults = results
    .filter(({
      package: {
        name
      }
    }) => name.match(/^sanity-plugin/))
    .map(({
      package
    }) => ({
      ...package,
      _id: package.name,
      _type: 'sanity-plugin',
      links: {
        _type: 'links',
        ...package.links
      },
      author: {
        _type: "author",
        ...package.author
      },
      publisher: {
        _type: "publisher",
        ...package.publisher
      },
      maintainers: package.maintainers.map(maintainer => ({
        _type: "maintainer",
        ...maintainer
      }))
    }))

  const res = await preparedResults.reduce((trans, doc) => trans.createOrReplace(doc), client.transaction()).commit()
  console.log(res)
}
run()