import { apiRequest } from '@/services/apiClient'
import type { DnsRecordCreatePayload, DnsRecordUpdatePayload, DnsRecordsValues } from '@/types/domain.type'

export async function fetchDnsRecords(): Promise<DnsRecordsValues> {
  return apiRequest<DnsRecordsValues>('/api/domain/dns-records')
}

export async function updateDnsRecord(payload: DnsRecordUpdatePayload): Promise<string> {
  return apiRequest<string>('/api/domain/dns-records', {
    method: 'PUT',
    body: JSON.stringify({
      id: payload.id,
      name: payload.name,
      type: payload.type,
      content: payload.content,
      ttl: payload.ttl,
      proxied: payload.proxied,
    }),
  })
}

export async function createDnsRecord(payload: DnsRecordCreatePayload): Promise<string> {
  return apiRequest<string>('/api/domain/dns-records', {
    method: 'POST',
    body: JSON.stringify({
      records: [
        {
          name: payload.name,
          type: payload.type,
          content: payload.content,
          ttl: payload.ttl,
          proxied: payload.proxied,
        },
      ],
    }),
  })
}

