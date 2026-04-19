import { NextResponse } from 'next/server'
import { getMovesAction } from '@/features/catalog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const moves = await getMovesAction()
  return NextResponse.json(moves)
}
