import type { EmbedManyResult } from '@xsai/embed'

import { EmbeddingProvider } from '@tg-search/common'
import { useConfig } from '@tg-search/common/node'
import { Ok } from '@tg-search/common/utils/monad'
import { createOllama } from '@xsai-ext/providers-local'
import { embedMany } from '@xsai/embed'
import { createEmbedProvider } from 'xsai-transformers'

import { fileURLToPath } from 'url'
import path from 'path'

import Worker from 'web-worker'

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workerPath = path.resolve(__dirname, '../../../node_modules/.pnpm/xsai-transformers+embed@0.0.7/node_modules/xsai-transformers/dist/embed/worker.js')
console.log('Worker path:', workerPath)
const worker = new Worker(workerPath)

export async function embedContents(contents: string[]) {
  const embeddingConfig = useConfig().api.embedding
  console.log('Embedding configuration:', embeddingConfig)
  console.log('worker path:', workerPath)

  let embeddings: EmbedManyResult
  switch (embeddingConfig.provider) {
    case EmbeddingProvider.OPENAI:
      embeddings = await embedMany({
        apiKey: embeddingConfig.apiKey,
        baseURL: embeddingConfig.apiBase || '',
        input: contents,
        model: embeddingConfig.model,
      })
      break
    case EmbeddingProvider.OLLAMA:
      embeddings = await embedMany({
        ...createOllama(embeddingConfig.apiBase).chat(embeddingConfig.model),
        input: contents,
      })
      break
    case EmbeddingProvider.TRANSFORMERS: {
      console.log("here")
      const transformers = createEmbedProvider({ 
        // baseURL: `xsai-transformers:///?worker-url=${workerPath}`
        worker: worker,
      })
      console.log("transformers", transformers)
      embeddings = await embedMany({
        ...transformers.embed(embeddingConfig.model || 'Xenova/all-MiniLM-L6-v2'),
        input: contents
      })
      console.log("embeddings", embeddings)
    }
      break
    default:
      throw new Error(`Unsupported embedding model: ${embeddingConfig.provider}`)
  }

  return Ok({
    ...embeddings,
    dimension: embeddingConfig.dimension,
  })
}
