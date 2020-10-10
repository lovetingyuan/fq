if (process.platform !== 'win32') {
  console.warn('Sorry, this program could only run at windows os.')
  process.exit(0)
}

const fs = require('fs')
const path = require('path')
const got = require('got')
const getRequest = (url, headers) => {
  if (!headers) {
    headers = {}
  }
  headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36'
  return got(url, { headers }).then(res => res.body)
}
const parseHtml = require('./parsehtml')
const parseQRcode = require('./parseqrcode')
const accountsProviders = require('../../lib/providers')(getRequest, parseHtml, parseQRcode)
const pkg = require('./package.json')
const notify = require('./notify')
const startss = require('./startss')

function checkUpdate() {
  got('https://api.github.com/repos/lovetingyuan/free-ss/contents/windows/node/package.json', {
    headers: {
      'content-type': 'application/json',
      accept: 'application/vnd.github.VERSION.raw',
      'user-agent': 'nodejs-chrome-' + Date.now()
    }
  }).then(res => {
    res = JSON.parse(res.body)
    if (res.version !== pkg.version) {
      notify('💡 有新的版本', false)
    }
  }).catch(() => { })
}

function main() {
  let filepath
  if (process.argv[2] === '-o') {
    filepath = path.join(global['process']['cwd'](), './ssaccounts.json')
  }
  console.log('Please wait...(' + accountsProviders.length + ')')
  const start = Date.now()
  const tasks = accountsProviders.map((provider, i) => {
    return provider().then(res => {
      console.log(`${i + 1}/${tasks.length} done, spend ${Math.round((Date.now() - start)/ 1000)}s.`)
      return res
    }).catch(err => {
      console.log((i + 1) + ' failed;' + (err && err.message))
      return []
    })
  })
  Promise.all(tasks).then((accountsList) => {
    const successSites = accountsList.filter(v => v.length > 0).length
    const accounts = accountsList.reduce((a, b) => a.concat(b), []).filter(Boolean)
    if (filepath) {
      if (!accounts.length) {
        console.log('Sorry, there are no available accounts for now.')
      } else {
        accounts.unshift('严禁用于非法用途，否则一切后果自负！')
        fs.writeFileSync(filepath, JSON.stringify(accounts, null, 2))
        console.log('Done, ' + (accounts.length - 1) + ' accounts saved to ' + filepath)
      }
    } else {
      if (!accounts.length) {
        notify('😔 暂无可用账号')
      } else {
        startss(accounts)
        console.info('SS accounts updated!')
        notify(`😊 更新成功${successSites}/${tasks.length}: ` + accounts.length)
      }
    }
  }).catch(err => {
    console.error(err)
    notify('😔 失败')
  }).finally(() => {
    return checkUpdate()
  })
}

main()
