import { Repository } from './domain/repository'
import { DomainContext } from '@/domain/context'
import { ExportCSVResponse, ExportCSVResponse_Metadata } from '@/gen/stdutils/csv_pb'
import csvFormat from '@fast-csv/format'

export interface CSVExportConfig<Entity extends { id: string }, ListInput = object, Context = void> {
  repository: Pick<Repository<never, Entity, never, ListInput>, 'cursorPagingList'>
  input?: ListInput & { orderBy?: { desc?: boolean } }
  headers: string[]
  prepareBatch?: (ctx: DomainContext, items: Entity[]) => Promise<Context>
  mapToRow: (item: Entity, context: Context) => unknown[]
  batchSize?: number
  batchDelayMs?: number
}

export async function* exportCSV<Entity extends { id: string }, ListInput = object, Context = void>(
  ctx: DomainContext,
  config: CSVExportConfig<Entity, ListInput, Context>,
): AsyncGenerator<ExportCSVResponse, void, unknown> {
  const batchSize = config.batchSize ?? 1000
  const batchDelayMs = config.batchDelayMs ?? 100
  const input = {
    orderBy: { desc: true },
    ...(config.input ?? {}),
  } as ListInput & { orderBy: { desc?: boolean } }

  const {
    paging: { totalCount },
  } = await config.repository.cursorPagingList(
    ctx,
    {
      ...input,
      paging: {
        limit: 0,
      },
    },
    { weakConsistency: true },
  )

  yield new ExportCSVResponse({
    payload: {
      case: 'metadata',
      value: new ExportCSVResponse_Metadata({
        estimatedChunkCount: Math.ceil(Number(totalCount) / batchSize) + 1,
      }),
    },
  })

  const headerChunk = await csvFormat.writeToBuffer([config.headers], {
    includeEndRowDelimiter: true,
    writeBOM: true,
  })

  yield new ExportCSVResponse({
    payload: {
      case: 'chunk',
      value: headerChunk,
    },
  })

  let exclusiveStartId: string | undefined = undefined

  while (true) {
    const res = await config.repository.cursorPagingList(
      ctx,
      {
        ...input,
        paging: {
          limit: batchSize,
          exclusiveStartId,
        },
      },
      { weakConsistency: true },
    )

    if (res.items.length === 0) {
      break
    }

    const context = config.prepareBatch == null ? (undefined as Context) : await config.prepareBatch(ctx, res.items)

    const rows = res.items.map((item) => {
      const row = config.mapToRow(item, context)
      return row.map((value) => (value == null ? '' : String(value)))
    })

    const csvChunk = await csvFormat.writeToBuffer(rows, {
      includeEndRowDelimiter: true,
    })

    yield new ExportCSVResponse({
      payload: {
        case: 'chunk',
        value: csvChunk,
      },
    })

    exclusiveStartId = res.paging.lastEvaluatedId

    await new Promise((resolve) => setTimeout(resolve, batchDelayMs))
  }
}
