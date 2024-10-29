import type { SearchEvent, ICollector, TelemetryConfig } from './types.js'
import pkg from '../package.json'
import sendBeacon from './sendBeacon.js'
import type { Profile } from './profile.js'

type Data = any[]

export class Collector {
  private data: Data
  private params?: ICollector
  private readonly config: CollectorConstructor
  private readonly profile: Profile

  private constructor(config: CollectorConstructor, profile: Profile) {
    this.data = []
    this.config = config
    this.profile = profile
  }

  public setParams(params: ICollector): void {
    this.params = params
  }

  public static create(config: CollectorConstructor, profile: Profile): Collector {
    const collector = new Collector(config, profile)
    collector.start()
    return collector
  }

  public add(data: SearchEvent): void {
    this.data.push({
      rawSearchString: data.rawSearchString,
      query: data.query,
      resultsCount: data.resultsCount,
      roundTripTime: data.roundTripTime,
      searchedAt: data.searchedAt,
      userId: this.profile.getUserId(),
      identity: this.profile.getIdentity(),
      alias: this.profile.getAlias(),
      // The referer is different for every event:
      // the user can search in different pages of the website
      // and the referer will be different for each page
      referer: typeof location !== 'undefined' ? location.toString() : undefined
    })

    if (this.params != null && this.data.length >= this.config.flushSize) {
      this.flush()
    }
  }

  public flush(): void {
    if (this.params == null || this.data.length === 0) {
      return
    }

    // Swap out the data array *sync*
    // so that we can continue to collect events
    const data = this.data
    this.data = []

    const body = {
      source: 'fe',
      deploymentID: this.params.deploymentID,
      index: this.params.index,
      oramaId: this.config.id,
      oramaVersion: pkg.version,
      // The user agent is the same for every event
      // Because we use "application/x-www-form-urlencoded",
      // the browser doens't send the user agent automatically
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      events: data
    }

    sendBeacon(this.params.endpoint + `?api-key=${this.config.api_key}`, JSON.stringify(body))?.catch((err) => console.log(err))
  }

  private start(): void {
    const interval = setInterval(this.flush.bind(this), this.config.flushInterval)
    if (interval.unref != null) {
      interval.unref()
    }
  }
}

export interface CollectorConstructor extends TelemetryConfig {
  id: string
  api_key: string
}
