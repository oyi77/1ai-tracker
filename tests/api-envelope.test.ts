import { describe, expect, it } from 'vitest'
import { apiSuccess, apiError, apiPaginated } from '@/lib/api/response'

describe('ApiResponse envelope', () => {
  it('apiSuccess returns correct shape', async () => {
    const res = apiSuccess({ foo: 'bar' })
    const body = await res.json()
    expect(body.data).toEqual({ foo: 'bar' })
    expect(body.error).toBeNull()
  })

  it('apiSuccess with meta returns correct shape', async () => {
    const res = apiSuccess([1, 2, 3], { page: 1, pageSize: 10, total: 3, hasMore: false })
    const body = await res.json()
    expect(body.data).toEqual([1, 2, 3])
    expect(body.meta?.page).toBe(1)
    expect(body.meta?.total).toBe(3)
    expect(body.error).toBeNull()
  })

  it('apiError returns correct shape', async () => {
    const res = apiError('Something broke', 502)
    const body = await res.json()
    expect(body.data).toBeNull()
    expect(body.error).toBe('Something broke')
  })

  it('apiPaginated returns correct shape', async () => {
    const res = apiPaginated([10, 20], 50, 1, 2)
    const body = await res.json()
    expect(body.data).toEqual([10, 20])
    expect(body.meta?.page).toBe(1)
    expect(body.meta?.pageSize).toBe(2)
    expect(body.meta?.total).toBe(50)
    expect(body.meta?.hasMore).toBe(true)
    expect(body.error).toBeNull()
  })

  it('apiPaginated last page has hasMore=false', async () => {
    const res = apiPaginated([10], 10, 2, 10)
    const body = await res.json()
    expect(body.meta?.hasMore).toBe(false)
  })
})
