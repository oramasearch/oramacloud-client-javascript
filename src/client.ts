import type { Endpoint, IOramaClient, Method, OramaInitResponse, HeartBeatConfig, OramaError, Override } from './types.js'
import type { SearchParams, Results, AnyDocument, AnyOrama, Nullable, InternalTypedDocument } from '@orama/orama'
import type { Message, InferenceType, Interaction } from './answerSession.js'
import { formatElapsedTime } from '@orama/orama/components'
import { createId } from '@orama/cuid2'

import { AnswerSession } from './answerSession.js'
import { Cache } from './cache.js'
import * as CONST from './constants.js'
import { Collector } from './collector.js'
import { HeartBeat } from './heartbeat.js'
import { version } from '../package.json'
import { Profile } from './profile.js'

export interface SearchConfig {
  abortController?: AbortController
  fresh?: boolean
  debounce?: number
}

export type SearchMode = 'fulltext' | 'vector' | 'hybrid'

type AdditionalSearchParams = {
  mode?: SearchMode
  returning?: string[]
}

export type AnswerParams = {
  type: 'documentation'
  query: string
  messages: Array<{ role: 'user' | 'system'; content: string }>
  context: Results<any>['hits']
}

export type SortByClauseUnion = SortByClause | SortByClause[]

type Order = 'ASC' | 'DESC' | 'asc' | 'desc'

type SortByClause = {
  property: string
  order?: Order
}

export type ClientSearchParams = Override<SearchParams<AnyOrama>, { sortBy?: SortByClauseUnion }> & AdditionalSearchParams

export type AnswerSessionParams = {
  inferenceType?: InferenceType
  initialMessages?: Message[]
  userContext?: unknown
  events?: {
    onMessageChange?: (messages: Message[]) => void
    onMessageLoading?: (receivingMessage: boolean) => void
    onAnswerAborted?: (aborted: true) => void
    onSourceChange?: <T = AnyDocument>(sources: Results<T>) => void
    onQueryTranslated?: (query: SearchParams<AnyOrama>) => void
    onRelatedQueries?: (relatedQueries: string[]) => void
    onNewInteractionStarted?: (interactionId: string) => void
    onStateChange?: (state: Interaction[]) => void
  }
  systemPrompts?: string[]
}

export { AnswerSession, Message }

export class OramaClient {
  private readonly id = createId()
  private readonly api_key: string
  private readonly endpoint: string
  private readonly answersApiBaseURL: string | undefined
  private readonly collector?: Collector
  private readonly cache?: Cache<Results<AnyDocument>>
  private readonly profile: Profile
  private searchDebounceTimer?: any // NodeJS.Timer
  private searchRequestCounter = 0
  private blockSearchTillAuth = false

  private heartbeat?: HeartBeat
  private initPromise?: Promise<OramaInitResponse | null>

  constructor(params: IOramaClient) {
    this.api_key = params.api_key
    this.endpoint = params.endpoint
    this.answersApiBaseURL = params.answersApiBaseURL

    // Enable profile tracking
    this.profile = new Profile({ endpoint: this.endpoint, apiKey: this.api_key })

    // Telemetry is enabled by default
    if (params.telemetry !== false) {
      const telementryConfig = {
        id: this.id,
        api_key: this.api_key,
        flushInterval: params.telemetry?.flushInterval ?? CONST.DEFAULT_TELEMETRY_FLUSH_INTERVAL,
        flushSize: params.telemetry?.flushSize ?? CONST.DEFAULT_TELEMETRY_FLUSH_SIZE
      }
      this.collector = Collector.create(telementryConfig, this.profile)
    }

    // Cache is enabled by default
    if (params.cache !== false) {
      const cacheParams = {}
      this.cache = new Cache<Results<AnyDocument>>(cacheParams)
    }

    this.init()
  }

  private customerUserToken: string | undefined = undefined
  private searchToken: string | undefined = undefined
  public setAuthToken(customerAuthToken: string | null) {
    if (customerAuthToken === null) {
      // unlogged user
      this.customerUserToken = undefined
      this.searchToken = undefined
    } else {
      this.customerUserToken = customerAuthToken
      // forgot the previous search token
      this.searchToken = undefined
    }
    // Re-do the init
    this.init()
  }

  private onAuthTokenExpired?: (token: string) => void
  public setOnAuthTokenExpired(onAuthTokenExpired: (token: string) => void) {
    this.onAuthTokenExpired = onAuthTokenExpired
  }

  public async search(query: ClientSearchParams, config?: SearchConfig): Promise<Nullable<Results<AnyDocument>>>
  public async search<SchemaType extends object, DocumentType extends InternalTypedDocument<SchemaType> = InternalTypedDocument<SchemaType>>(
    query: ClientSearchParams,
    config?: SearchConfig
  ): Promise<Nullable<Results<DocumentType>>> {
    await this.initPromise

    // Avoid perform search if the user is not authenticated yet
    if (this.blockSearchTillAuth) {
      console.warn('Search request blocked until user is authenticated')
      return null
    }

    const currentRequestNumber = ++this.searchRequestCounter
    const cacheKey = `search-${JSON.stringify(query)}`

    let searchResults: Nullable<Results<AnyDocument>> = null
    let roundTripTime: number
    let cached = false
    const shouldUseCache = config?.fresh !== true && this.cache?.has(cacheKey)

    const performSearch = async () => {
      try {
        const timeStart = Date.now()
        searchResults = await this.fetch<Results<AnyDocument>>('search', 'POST', { q: query, sst: this.searchToken }, config?.abortController)
        const timeEnd = Date.now()
        searchResults.elapsed = await formatElapsedTime(BigInt(timeEnd * CONST.MICROSECONDS_BASE - timeStart * CONST.MICROSECONDS_BASE))
        roundTripTime = timeEnd - timeStart
        this.cache?.set(cacheKey, searchResults)
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Search request failed', error)
          throw error
        }
      }

      if (this.collector) {
        this.collector.add({
          rawSearchString: query.term,
          resultsCount: searchResults?.hits?.length ?? 0,
          roundTripTime,
          query,
          cached,
          searchedAt: new Date(),
          userId: this.profile.getUserId()
        })
      }

      return searchResults
    }

    if (shouldUseCache && this.cache) {
      roundTripTime = 0
      searchResults = this.cache.get(cacheKey) as Results<AnyDocument>
      cached = true

      if (this.collector) {
        this.collector.add({
          rawSearchString: query.term,
          resultsCount: searchResults?.hits?.length ?? 0,
          roundTripTime,
          query,
          cached,
          searchedAt: new Date(),
          userId: this.profile.getUserId()
        })
      }
    } else {
      if (config?.debounce) {
        return new Promise((resolve, reject) => {
          clearTimeout(this.searchDebounceTimer)
          this.searchDebounceTimer = setTimeout(
            async () => {
              try {
                await performSearch()
                resolve(searchResults)
              } catch (error) {
                if ((error as any).name !== 'AbortError') {
                  console.error('Search request failed', error)
                  reject(error)
                }
              }
            },
            config?.debounce || 300
          )
          if ('unref' in this.searchDebounceTimer) {
            this.searchDebounceTimer.unref()
          }
        })
      }

      return performSearch()
    }

    if (currentRequestNumber === this.searchRequestCounter) {
      return searchResults
    }

    return null
  }

  public async vectorSearch(query: ClientSearchParams, config?: SearchConfig): Promise<Pick<Results<AnyDocument>, 'hits' | 'elapsed'>> {
    await this.initPromise

    const cacheKey = `vectorSearch-${JSON.stringify(query)}`

    let roundTripTime: number
    let searchResults: Results<AnyDocument>
    let cached = false

    const shouldUseCache = config?.fresh !== true && this.cache?.has(cacheKey)
    if (shouldUseCache === true && this.cache != null) {
      roundTripTime = 0
      searchResults = this.cache.get(cacheKey) as Results<AnyDocument>
      cached = true
    } else {
      const timeStart = Date.now()
      searchResults = await this.fetch<Results<AnyDocument>>('vector-search2', 'POST', { q: query }, config?.abortController)
      const timeEnd = Date.now()

      searchResults.elapsed = await formatElapsedTime(BigInt(timeEnd * CONST.MICROSECONDS_BASE - timeStart * CONST.MICROSECONDS_BASE))
      roundTripTime = timeEnd - timeStart

      this.cache?.set(cacheKey, searchResults)
    }

    if (this.collector != null) {
      this.collector.add({
        rawSearchString: query.term,
        resultsCount: searchResults.hits?.length ?? 0,
        roundTripTime,
        query,
        cached,
        searchedAt: new Date(),
        userId: this.profile.getUserId()
      })
    }

    return searchResults
  }

  public createAnswerSession(params?: AnswerSessionParams) {
    return new AnswerSession({
      inferenceType: params?.inferenceType || 'documentation',
      initialMessages: params?.initialMessages || [],
      oramaClient: this,
      events: params?.events,
      userContext: params?.userContext,
      systemPrompts: params?.systemPrompts ?? []
    })
  }

  public startHeartBeat(config: HeartBeatConfig): void {
    this.heartbeat?.stop()
    this.heartbeat = new HeartBeat({
      ...config,
      endpoint: `${this.endpoint}/health?api-key=${this.api_key}`
    })
    this.heartbeat.start()
  }

  public stopHeartBeat(): void {
    this.heartbeat?.stop()
  }

  public async getPop(): Promise<string> {
    const g = await this.initPromise
    return g?.pop ?? ''
  }

  private expirationTimer: ReturnType<typeof setTimeout> | undefined
  private init(): void {
    this.initPromise = this.fetch<OramaInitResponse>('init', 'GET', undefined, undefined, { token: this.customerUserToken })
      .then((b) => {
        this.collector?.setParams({
          endpoint: b.collectUrl,
          deploymentID: b.deploymentID,
          index: b.index
        })

        this.profile?.setParams({
          identifyUrl: b.collectUrl,
          index: b.index
        })

        if (b.searchSession) {
          if ('required' in b.searchSession && b.searchSession.required === true) {
            this.blockSearchTillAuth = true
          } else if ('token' in b.searchSession) {
            const searchToken = b.searchSession.token
            this.searchToken = searchToken
            const maxAge = b.searchSession.maxAge
            this.blockSearchTillAuth = false

            if (this.expirationTimer) {
              clearTimeout(this.expirationTimer)
            }
            this.expirationTimer = setTimeout(() => {
              if (this.searchToken === searchToken) {
                this.searchToken = undefined
                this.blockSearchTillAuth = true
                this.onAuthTokenExpired?.(searchToken)
              }
            }, maxAge * 1000)
            if ('unref' in this.expirationTimer) {
              this.expirationTimer.unref()
            }
          }
        }

        return b
      })
      .catch((err) => {
        console.log(err)
        return null
      })
  }

  private async fetch<T = unknown>(
    path: Endpoint,
    method: Method,
    body?: object,
    abortController?: AbortController,
    queryParams?: Record<string, string | undefined>
  ): Promise<T> {
    if (abortController?.signal.aborted === true) {
      throw new Error('Request aborted')
    }

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
        // Unfortunatelly we can't send this headers otherwise we should pay CORS preflight request
        // 'x-orama-instance-id': this.id,
        // 'x-orama-version': version
      },
      signal: abortController?.signal
    }

    if (method === 'POST' && body !== undefined) {
      const b = body as any
      b.version = version
      b.id = this.id
      b.visitorId = this.profile.getUserId()

      requestOptions.body = Object.entries(b)
        .filter(([_, value]) => !!value)
        .map(([key, value]) => `${key}=${encodeURIComponent(JSON.stringify(value))}`)
        .join('&')
    }

    const url = new URL(`${this.endpoint}/${path}`)
    url.searchParams.append('api-key', this.api_key)
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value) {
          url.searchParams.append(key, value)
        }
      }
    }
    const res: Response = await fetch(url, requestOptions)

    if (!res.ok) {
      const error = new Error() as OramaError
      error.httpResponse = res
      throw error
    }

    return await res.json()
  }

  /**
   * Methods associated with profile tracking
   */
  public getIdentity(): string | undefined {
    return this.profile.getIdentity()
  }

  public getUserId(): string {
    return this.profile.getUserId()
  }

  public getAlias(): string | undefined {
    return this.profile.getAlias()
  }

  public async identify(identity: string): Promise<void> {
    if (this.initPromise === undefined) {
      throw new Error('OramaClient not initialized')
    }

    await this.profile.identify(this.initPromise, identity)
  }

  public async alias(alias: string): Promise<void> {
    if (this.initPromise === undefined) {
      throw new Error('OramaClient not initialized')
    }

    await this.profile.alias(this.initPromise, alias)
  }

  public reset(): void {
    this.profile.reset()
  }
}
