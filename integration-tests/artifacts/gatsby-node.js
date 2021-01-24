const path = require(`path`)
const fs = require(`fs-extra`)

const runNumber = parseInt(process.env.ARTIFACTS_RUN_SETUP, 10) || 1

const isFirstRun = runNumber === 1

exports.onPreInit = ({ reporter }) => {
  reporter.info(`Using test setup #${runNumber}`)
}

exports.sourceNodes = ({ actions, createContentDigest }) => {
  // used to create pages and queried by them
  function createNodeHelper(type, nodePartial) {
    actions.createNode({
      ...nodePartial,
      internal: {
        type,
        contentDigest: createContentDigest(nodePartial),
      },
    })
  }

  createNodeHelper(`DepPageQuery`, {
    id: `page-query-stable`,
    label: `Stable (always created)`,
  })

  createNodeHelper(`DepPageQuery`, {
    id: `page-query-changing-but-not-invalidating-html`,
    label: `Stable (always created)`,
    buildRun: runNumber, // important for test setup - this will invalidate page queries, but shouldn't invalidate html (if it's not queried)
  })

  createNodeHelper(`DepPageQuery`, {
    id: `page-query-changing-data-but-not-id`,
    label: `This is${isFirstRun ? `` : ` not`} a first run`, // this will be queried - we want to invalidate html here
  })

  createNodeHelper(`DepPageQuery`, {
    id: `page-query-dynamic-${runNumber}`, // this should cause different page path
    label: `This is run number {$runNumber}`,
  })
}

exports.createPages = ({ actions }) => {
  // testing if expected html/page-data files exist OR don't exist (if stale artifacts are removed)
  function createPageHelper(dummyId) {
    actions.createPage({
      path: `/stale-pages/${dummyId}`,
      component: require.resolve(`./src/templates/dummy`),
      context: {
        dummyId,
      },
    })
  }

  // stable page that always gets created
  createPageHelper(`stable`)

  if (isFirstRun) {
    // page exists only in first run
    createPageHelper(`only-in-first`)
  } else {
    // page exists in any run other than first
    createPageHelper(`only-not-in-first`)
  }
}

exports.onPostBuild = async ({ graphql }) => {
  const { data } = await graphql(`
    {
      allSitePage(filter: { path: { ne: "/dev-404-page/" } }) {
        nodes {
          path
        }
      }
    }
  `)

  fs.writeJSONSync(
    path.join(process.cwd(), `.cache`, `test-pages.json`),
    data.allSitePage.nodes.map(node => node.path)
  )
}
