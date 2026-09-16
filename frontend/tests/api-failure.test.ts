import { beforeEach, it, expect, vi } from 'vitest'
import { createAssessment, fetchAssessments, createFollowUp } from '../src/services/api'

beforeEach(()=>{ localStorage.clear(); vi.restoreAllMocks() })
it('backend 500 does not silently create a demo assessment', async ()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:'QA server failure'}),{status:500})))
  await expect(createAssessment({} as any)).rejects.toThrow('QA server failure')
  expect(localStorage.getItem('nbk_records_demo_v1')).toBeNull()
})
it('network failures do not return unrelated demo records',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('offline')}))
  await expect(fetchAssessments()).rejects.toThrow('offline')
  expect(localStorage.getItem('nbk_records_demo_v1')).toBeNull()
})
it('missing backend follow-up endpoint is visible as a failure',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('Not found',{status:404})))
  await expect(createFollowUp({} as any)).rejects.toThrow()
  expect(localStorage.getItem('nbk_followups_demo_v1')).toBeNull()
})
