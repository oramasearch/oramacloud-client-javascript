import type { Nullable } from '@orama/orama'
import type { CloudManager } from './index.js'
import type { Endpoint, EndpointDeploy, EndpointHasData, EndpointNotify, EndpointSnapshot, EndpointUpdateSchema } from './types.js'
import * as CONST from './constants.js'

type IndexManagerParams = {
  manager: CloudManager
  indexID: string
}

type SnapshotData = any[] | object | unknown

type CallWebhookPayload<E extends Endpoint> = E extends EndpointSnapshot
  ? SnapshotData
  : E extends EndpointNotify
    ? any[]
    : E extends EndpointDeploy
      ? undefined
      : E extends EndpointUpdateSchema
        ? { schema: { [key: string]: any }; embeddings?: any }
        : never

export class IndexManager {
  private manager: CloudManager
  private indexId: Nullable<string> = null

  constructor(params: IndexManagerParams) {
    this.manager = params.manager
    this.indexId = params.indexID

    this.manager.setIndexID(params.indexID)
  }

  public async empty(): Promise<boolean> {
    const resp = await this.callIndexWebhook<EndpointSnapshot>(CONST.ENDPOINT_SNAPSHOT, [])
    return (resp as any).success
  }

  public async snapshot(data: CallWebhookPayload<EndpointSnapshot>): Promise<boolean> {
    const resp = await this.callIndexWebhook<EndpointSnapshot>(CONST.ENDPOINT_SNAPSHOT, data)
    return (resp as any).success
  }

  public async insert(data: CallWebhookPayload<EndpointNotify>): Promise<boolean> {
    const resp = await this.callIndexWebhook<EndpointNotify>(CONST.ENDPOINT_NOTIFY, { upsert: data } as any)
    return (resp as any).success
  }

  public async update(data: CallWebhookPayload<EndpointNotify>): Promise<boolean> {
    const resp = await this.callIndexWebhook<EndpointNotify>(CONST.ENDPOINT_NOTIFY, { upsert: data } as any)
    return (resp as any).success
  }

  public async delete(data: CallWebhookPayload<EndpointNotify>): Promise<boolean> {
    try {
      await this.callIndexWebhook<EndpointNotify>(CONST.ENDPOINT_NOTIFY, { remove: data } as any)
    } catch (e) {
      console.error(e)
      return false
    }

    return true
  }

  public async updateSchema(schema: CallWebhookPayload<EndpointUpdateSchema>): Promise<boolean> {
    try {
      await this.callIndexWebhook<EndpointUpdateSchema>(CONST.ENDPOINT_UPDATE_SCHEMA, schema)
    } catch (e) {
      console.error(e)
      return false
    }
    return true
  }

  public async deploy(): Promise<boolean> {
    try {
      const resp = await this.callIndexWebhook<EndpointDeploy>(CONST.ENDPOINT_DEPLOY)
    } catch (e) {
      console.error(e)
      return false
    }

    return true
  }

  public async hasPendingOperations(): Promise<boolean> {
    const resp = await this.callIndexWebhook<EndpointHasData>(CONST.ENDPOINT_HAS_DATA)
    return (resp as any).hasData
  }

  private checkIndexID() {
    if (!this.indexId) {
      throw new Error('Index ID is not set')
    }
  }

  private callIndexWebhook<E extends Endpoint>(endpoint: E, payload?: CallWebhookPayload<E>) {
    this.checkIndexID()
    return this.manager.callIndexWebhook(endpoint, payload)
  }
}
