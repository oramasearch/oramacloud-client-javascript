import type * as CONST from './constants.js'

export type EndpointSnapshot = typeof CONST.ENDPOINT_SNAPSHOT
export type EndpointNotify = typeof CONST.ENDPOINT_NOTIFY
export type EndpointDeploy = typeof CONST.ENDPOINT_DEPLOY
export type EndpointHasData = typeof CONST.ENDPOINT_HAS_DATA
export type EndpointUpdateSchema = typeof CONST.ENDPOINT_UPDATE_SCHEMA

export type Endpoint = EndpointSnapshot | EndpointNotify | EndpointDeploy | EndpointHasData | EndpointUpdateSchema

export type Method = typeof CONST.METHOD_POST | typeof CONST.METHOD_GET | typeof CONST.METHOD_PUT | typeof CONST.METHOD_DELETE
