import { redirect } from 'next/navigation';

export default async function RentHistoryRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/houses/${id}/rent-review`);
}
