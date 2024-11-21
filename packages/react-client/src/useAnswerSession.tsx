import type { AnyDocument, AnyOrama, Nullable, Results, SearchParams } from '@orama/orama'
import type { AnswerSessionParams, Message, Interaction } from '@oramacloud/client'

import { AnswerSession, OramaClient } from '@oramacloud/client'
import { useCallback, useEffect, useRef, useState } from 'react'

type AnswerSessionHookClientParams = { oramaClient: OramaClient } | { apiKey: string; endpoint: string }

type AnswerSessionHookParams = AnswerSessionParams & AnswerSessionHookClientParams

export function useAnswerSession<Document = AnyDocument>(params: AnswerSessionHookParams) {
  const [messages, setMessages] = useState<Message[]>(params.initialMessages || [])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Nullable<Error>>(null)
  const [aborted, setAborted] = useState<boolean>(false)
  const [sources, setSources] = useState<Nullable<Results<Document>>>(null)
  const [interaction, setInteraction] = useState<Nullable<Interaction>>(null)
  const [relatedQueries, setRelatedQueries] = useState<Nullable<string[]>>(null)
  //no support for multi index answer session yet
  const sessionRef = useRef<Nullable<AnswerSession<true>>>(null)

  useEffect(() => {
    const oramaClient =
      'oramaClient' in params
        ? params.oramaClient
        : new OramaClient({
            api_key: params.apiKey,
            endpoint: params.endpoint
          })

    sessionRef.current = new AnswerSession({
      ...params,
      initialMessages: params.initialMessages || [],
      inferenceType: params.inferenceType || 'documentation',
      oramaClient: oramaClient,
      events: {
        onMessageChange: (messages) => {
          setMessages(messages)
        },
        onMessageLoading: (receivingMessage) => {
          setLoading(receivingMessage)
        },
        onAnswerAborted: (aborted: true) => {
          setAborted(aborted)
        },
        onSourceChange: (sources) => {
          setSources(sources as unknown as Results<Document>)
        },
        onRelatedQueries: (relatedQueries) => {
          setRelatedQueries(relatedQueries)
        },
        onInteractionDone: (interaction) => {
          setInteraction(interaction)
        }
      }
    })

    return () => {
      sessionRef.current?.abortAnswer()
    }
  }, [params])

  const ask = useCallback(async (searchParams: SearchParams<AnyOrama>): Promise<void> => {
    if (sessionRef.current) return

    try {
      setAborted(false)
      await sessionRef.current!.ask(searchParams)
    } catch (err) {
      setError(err as unknown as Error)
    }
  }, [])

  const abortAnswer = useCallback(() => {
    sessionRef?.current?.abortAnswer()
  }, [])

  const clearSession = useCallback(() => {
    sessionRef?.current?.clearSession()
  }, [])

  return {
    messages,
    loading,
    aborted,
    abortAnswer,
    error,
    sources,
    relatedQueries,
    interaction,
    ask,
    clearSession
  }
}
