import type { CacheConfig, Optional } from './types.js'
import { hasLocalStorage } from './utils.js'

type CacheMap<T = unknown> = Map<string, T>

export class Cache<V = unknown> {
  private cache: CacheMap<V>
  private readonly config: CacheConstructorParams

  constructor (config: CacheConstructorParams) {
    this.cache = new Map()
    this.config = config
  }

  public set (key: string, value: V): void {
    this.cache.set(key, value)
  }

  public get (key: string): Optional<V> {
    return this.cache.get(key)
  }

  public has (key: string): boolean {
    return this.cache.has(key)
  }

  public delete (key: string): boolean {
    return this.cache.delete(key)
  }

  public clear (): void {
    this.cache.clear()
  }

  public size (): number {
    return this.cache.size
  }
}

export interface CacheConstructorParams extends CacheConfig {
}