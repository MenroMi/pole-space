export default async function MoveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <div>Move: {id}</div>
}
