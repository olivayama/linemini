import { appConfig } from './config'
import { build } from './server'
import { connectDBPool, disconnectDBPool } from './stdutils/db-pool'
import assert from 'node:assert'
import { describe, it, after, before } from 'node:test'

describe('Server', async () => {
  let dbPool: ReturnType<typeof connectDBPool<DB>>
  before(async () => {
    dbPool = connectDBPool<DB>({
      writer: appConfig.mysql,
      reader: appConfig.mysqlReadOnly,
    })
  })

  after(async () => {
    if (dbPool != null) {
      await disconnectDBPool(dbPool)
    }
  })

  it('GET / returns ok', async () => {
    const app = await build(dbPool)
    const res = await app.inject({
      method: 'GET',
      url: '/',
    })
    assert.equal(res.statusCode, 200)
  })

  it('GET /health returns ok', async () => {
    const app = await build(dbPool)
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    })
    assert.equal(res.statusCode, 200)
  })
})
