export type DnsRecord = {
  id: string
  zoneId: string
  name: string
  nameUnicode: string
  type: string
  content: string
  ttl: number
  priority: number
  createdAt: string
  updatedAt: string
  proxied: boolean
  proxyStatus: string
  comment: string
}

export type DnsRecordsValues = {
  data: DnsRecord[]
  total: number
  limit: number
  offset: number
}

export type DnsRecordUpdatePayload = {
  id: string
  name: string
  type: string
  content: string
  ttl: number
  proxied: boolean
}

export type DnsRecordCreatePayload = {
  name: string
  type: string
  content: string
  ttl: number
  proxied: boolean
}

