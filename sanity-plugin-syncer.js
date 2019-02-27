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
    .map(({ npmPackage }) => {
      return axios(NPM_API_PGKINFO + npmPackage.name)
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
    .map(({ npmPackage }) => ({
      _id: npmPackage.name,
      _type: 'plugin',
      installWith: npmPackage.name.split('sanity-plugin-')[1],
      name: npmPackage.name,
      npm: {
        ...npmPackage,
        _type: 'npm',
        links: {
          _type: 'pkgLinks',
          ...npmPackage.links
        },
        readme: readMesMap[npmPackage.name],
        publisher: {
          _type: "publisher",
          ...(npmPackage.publisher && {pluginAuthor: {
            _type: 'reference',
            _ref: `pluginAuthor-${(npmPackage.publisher || {}).username}`,
            _weak: true
          },
          ...npmPackage.publisher
        }),
        maintainers: npmPackage.maintainers.map((maintainer, i) => ({
          _type: "pkgMaintainer",
          _key: 'pkgMaintainer' + i + maintainer.username,
          ...maintainer
        }))  
      }
    }
    ))

  const res = await preparedResults
    .reduce((trans, doc) => 
      trans
        .createIfNotExists(doc)
        .patch(doc._id, patch => 
          patch.setIfMissing({npm: {}}).set({npm: doc.npm})
        ),
      client(context.secrets.API_TOKEN).transaction()
    ).commit().catch(() => cb(null, 500))
  cb(null, 200)
}
