const axios = require("axios");
const sanityClient = require('@sanity/client')
const client = token => sanityClient({
  projectId: '3do82whm',
  dataset: 'production',
  token
})
const NPM_API_SEARCH = "https://api.npms.io/v2/search/suggestions"
const NPM_API_PGKINFO = "https://api.npms.io/v2/package/"
function checkIfPlugin({package: {name}}) {
  console.log(name)
  return name.match(/^sanity-plugin/)
}
function getReadmes(pkgs) {
  return pkgs
    .filter(checkIfPlugin)
    .map(({ package }) => {
      return axios(NPM_API_PGKINFO + package.name)
        .then(({data: { collected: { metadata }}}) => ({ name: metadata.name, readme: metadata.readme}))
    })
}
module.exports = async function(context, cb) {
  const pkgs = await axios(NPM_API_SEARCH + '?q=sanity-plugin').then(({data}) => data)
  const readMeResults = await Promise.all(getReadmes(pkgs))
  const readMesMap = readMeResults.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.readme }), {})

  const preparedResults = pkgs
    .filter(checkIfPlugin)
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
      })),
      readme: readMesMap[package.name]
    }))
  

  return cb(200, {preparedResults})
  const res = await preparedResults.reduce((trans, doc) => trans.createOrReplace(doc), client(context.secrets.API_TOKEN).transaction()).commit().catch(() => cb(500))
  console.log(res)
  cb(200)
}
