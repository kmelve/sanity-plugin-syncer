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
  const pkgs = await axios(NPM_API_SEARCH + '?q=sanity&size=100').then(({data}) => data)
  console.log(`Fetched ${pkgs.length} plugins`)
  const readMeResults = await Promise.all(getReadmes(pkgs))
  const readMesMap = readMeResults.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.readme }), {})

  const preparedResults = pkgs
    .filter(checkIfPlugin)
    .map(({ package }) => ({
      ...package,
      _id: package.name,
      _type: 'plugin',
      npm: {
        _type: 'npm',
        links: {
          _type: 'pkgLinks',
          ...package.links
        },
        readme: readMesMap[package.name],
        pkgAuthor: package.author ? package.author.name : 'Missing',
        publisher: {
          _type: "publisher",
          ...package.publisher
        },
        maintainers: package.maintainers.map((maintainer, i) => ({
          _type: "pkgMaintainer",
          _key: 'pkgMaintainer' + i + maintainer.username,
          ...maintainer
        }))  
      }
    }))

  const res = await preparedResults.reduce(async (trans, doc) => {
    await client.createIfNotExists(doc._id)
    return await 
      trans
      .patch(doc._id)
      .setIfMissing({npm: {}})
      .set({npm: doc.npm}),
    client(context.secrets.API_TOKEN)
      .transaction()
  }).commit().catch(() => cb(null, 500))
  cb(null, 200)
}
