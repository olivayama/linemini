import { appConfig } from '@/config'
import { format } from 'date-fns'
import { CamelCasePlugin, Kysely, LogEvent, MysqlDialect } from 'kysely'
import { PoolOptions, createPool } from 'mysql2'
import { format as formatSql } from 'sql-formatter'
import { highlight } from 'sql-highlight'

export type Pool<DB> = { writer: Kysely<DB>; reader: Kysely<DB> }

const log = (name: string) => (event: LogEvent) => {
  if (appConfig.appEnv !== 'localhost' || event.level !== 'query') {
    return
  }

  const params = event.query.parameters.map((param) => {
    if (typeof param === 'number') {
      return `${param}`
    } else if (param instanceof Date) {
      return `'${format(param, 'yyyy-MM-dd HH:mm:ss.SSS')}'`
    } else {
      return `'${param}'`
    }
  })

  const sql = highlight(
    formatSql(event.query.sql, {
      params,
      language: 'mysql',
      logicalOperatorNewline: 'after',
      newlineBeforeSemicolon: true,
    }),
  )

  console.log(`\n-------------------- [${name}] --------------------\n${sql}\n;\n`)
}

// NOTE: JSON カラムに外部 API のレスポンス等を意図したキー命名のまま保存できるよう、
//       nested キーまで camelCase 化されないよう抑止する。
const camelCasePlugin = new CamelCasePlugin({ maintainNestedObjectKeys: true })

export const connectDBPool = <DB>(poolOptions: { writer: PoolOptions; reader: PoolOptions }) => {
  const writer = new Kysely<DB>({
    dialect: new MysqlDialect({
      pool: createPool(poolOptions.writer),
    }),
    log: log('writer'),
    plugins: [camelCasePlugin],
  })
  const reader = new Kysely<DB>({
    dialect: new MysqlDialect({
      pool: createPool(poolOptions.reader),
    }),
    log: log('reader'),
    plugins: [camelCasePlugin],
  })
  return { writer, reader }
}

export const disconnectDBPool = async <DB>(pool: Pool<DB>): Promise<void> => {
  await pool.writer.destroy()
  await pool.reader.destroy()
}
